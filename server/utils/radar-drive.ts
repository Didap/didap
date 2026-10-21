import { createError } from 'h3'
import type postgres from 'postgres'
import { DRIVE_CLAIM_MINUTES, type DriveStart } from '#shared/radar'
import { createDriveFolder, driveFolderId, driveFolderUrl, driveName, hasDrive, listDriveNames, uploadDriveFile } from './drive'
import { inPool, readGrantDocument } from './radar'
import { grantExport, grantFileName } from './radar-export'
import { attachmentName, fetchFromSource, fetchSourcePage, isPdfLink, mainHtml, pagePdfLinks, SOURCE_TIMEOUT_MS } from './radar-fetch'

// "Crea cartella su Drive": una cartella per il bando dentro la cartella
// "Bandi" del Drive condiviso, col bando esportato per Claude e i PDF
// linkati dalla pagina del bando. Il resto lo aggiunge chi ci lavora.
//
// Gira in background (siti lenti, PDF grossi) con lo stato nel database:
// drive_claimed_at = in corso, drive_folder_id = cartella creata,
// drive_ready_at = finita, drive_note = com'è andata. Il turno nel
// database vale anche con più istanze del sito; una cartella già creata e
// rimasta a metà si riprende al clic successivo.

const MAX_FILES = 10
const MAX_FILE_BYTES = 40 * 1024 * 1024
const FILE_CONCURRENCY = 4

// I PDF della pagina del bando (stessa origine); un bando che è un PDF è sé stesso
export async function grantPdfLinks(url: string): Promise<string[]> {
  if (isPdfLink(url)) return [url]
  const origin = new URL(url).origin
  return pagePdfLinks(mainHtml(await fetchSourcePage(url, origin)), url, origin, MAX_FILES)
}

export async function startGrantFolder(
  sql: postgres.Sql,
  id: string,
  run: (job: () => Promise<void>) => void = job => void job(),
): Promise<DriveStart> {
  if (!hasDrive()) {
    throw createError({ statusCode: 503, statusMessage: 'Google Drive non configurato (GOOGLE_SERVICE_ACCOUNT_JSON, RADAR_DRIVE_FOLDER_ID)' })
  }
  const [row] = await sql<{ drive_folder_id: string | null, drive_ready_at: Date | null }[]>`
    select drive_folder_id, drive_ready_at from radar_grants where id = ${id}
  `
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Bando non trovato' })
  if (row.drive_ready_at && row.drive_folder_id) return { status: 'ready', url: driveFolderUrl(row.drive_folder_id) }
  // La cartella già creata si legge dal turno appena preso, non da prima:
  // un altro lavoro può averla salvata nel frattempo
  // Ora del turno decisa qui, al millisecondo: fa da gettone per liberarlo
  const claimedAt = new Date()
  const [claim] = await sql<{ drive_folder_id: string | null }[]>`
    update radar_grants set drive_claimed_at = ${claimedAt}, drive_note = ''
    where id = ${id} and drive_ready_at is null
      and (drive_claimed_at is null or drive_claimed_at < now() - ${`${DRIVE_CLAIM_MINUTES} minutes`}::interval)
    returning drive_folder_id
  `
  // Già in corso (altro clic, altra istanza): il pannello aspetta lo stesso lavoro
  if (claim) run(() => fillFolder(sql, id, claim.drive_folder_id, claimedAt))
  return { status: 'creating' }
}

// `claimedAt`: il turno di questo lavoro; un errore libera solo quello
async function fillFolder(sql: postgres.Sql, id: string, existingFolder: string | null, claimedAt: Date) {
  try {
    const { grant, content, profile } = await readGrantDocument(sql, id)
    let folderId = existingFolder
    if (!folderId) {
      folderId = await createDriveFolder(grant.title, driveFolderId())
      // Salvata subito: un errore dopo non crea una seconda cartella al prossimo clic
      await sql`update radar_grants set drive_folder_id = ${folderId} where id = ${id}`
    }
    // Ripresa dopo un errore: i file già caricati non si ricaricano
    const present = existingFolder ? await listDriveNames(folderId) : new Set<string>()
    const upload = (name: string, mime: string, data: Buffer) =>
      present.has(driveName(name)) ? Promise.resolve() : uploadDriveFile(name, mime, data, folderId)
    const [, note] = await Promise.all([
      upload(grantFileName(grant), 'text/markdown', Buffer.from(grantExport(grant, content, profile))),
      uploadPdfs(grant.url, upload),
    ])
    // Anche il cuore, come setGrantLiked: chi crea la cartella ci lavora
    await sql`
      update radar_grants set drive_ready_at = now(), drive_note = ${note}, drive_claimed_at = null,
        liked_at = coalesce(liked_at, now())
      where id = ${id}
    `
  }
  catch (err) {
    console.error('[radar] cartella su Drive non creata', err)
    await sql`
      update radar_grants set drive_claimed_at = null, drive_note = ${`Non riuscita: ${(err as Error).message}`.slice(0, 500)}
      where id = ${id} and drive_claimed_at = ${claimedAt}
    `
  }
}

type PdfOutcome = 'loaded' | 'notDownloaded' | 'notUploaded'
type Upload = (name: string, mime: string, data: Buffer) => Promise<void>

async function uploadPdf(href: string, upload: Upload): Promise<PdfOutcome> {
  const data = await fetchFromSource(href, { origin: new URL(href).origin, maxBytes: MAX_FILE_BYTES, timeoutMs: SOURCE_TIMEOUT_MS, optional: true })
    .catch(() => null)
  if (!data) return 'notDownloaded'
  return upload(attachmentName(href), 'application/pdf', data).then(() => 'loaded' as const, () => 'notUploaded' as const)
}

// Carica i PDF del bando, quattro alla volta; la nota dice cosa manca
async function uploadPdfs(url: string, upload: Upload): Promise<string> {
  let pdfs: string[]
  try {
    pdfs = await grantPdfLinks(url)
  }
  catch {
    return 'Pagina del bando non raggiungibile: i PDF vanno aggiunti a mano'
  }
  if (!pdfs.length) return 'Nessun PDF trovato sulla pagina del bando'
  const outcomes = await inPool(pdfs, FILE_CONCURRENCY, href => uploadPdf(href, upload))
  const count = (o: PdfOutcome) => outcomes.filter(x => x === o).length
  return [
    `${count('loaded')} PDF del bando caricati`,
    count('notDownloaded') && `${count('notDownloaded')} non scaricati dal sito`,
    count('notUploaded') && `${count('notUploaded')} non caricati su Drive`,
  ].filter(Boolean).join(', ')
}
