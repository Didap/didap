import { createError } from 'h3'
import type postgres from 'postgres'
import { DRIVE_CLAIM_MINUTES } from '#shared/radar'
import { createDriveFolder, driveFolderId, driveFolderUrl, hasDrive, uploadDriveFile } from './drive'
import { readGrantDocument, readRadarSettings } from './radar'
import { grantExport, grantFileName } from './radar-export'
import { attachmentName, fetchFromSource, fetchSourcePage, isPdfLink, mainHtml, pageLinks, SOURCE_TIMEOUT_MS } from './radar-fetch'

// "Crea cartella su Drive": una cartella per il bando dentro la cartella
// "Bandi" del Drive condiviso, col bando esportato per Claude e i PDF
// linkati dalla pagina del bando. Il resto lo aggiunge chi ci lavora.
//
// Gira in background (siti lenti, PDF grossi) con lo stato nel database:
// drive_claimed_at = in corso, drive_folder_id = cartella creata,
// drive_folder_url = finita, drive_note = com'è andata. Il turno nel
// database vale anche con più istanze del sito; una cartella già creata e
// rimasta a metà si riprende al clic successivo.

const MAX_FILES = 10
const MAX_FILE_BYTES = 40 * 1024 * 1024
const FILE_CONCURRENCY = 4
export type DriveStart = { status: 'ready', url: string } | { status: 'creating' }

// I PDF della pagina del bando (stessa origine); un bando che è un PDF è sé stesso
export async function grantPdfLinks(url: string): Promise<string[]> {
  if (isPdfLink(url)) return [url]
  const origin = new URL(url).origin
  const html = await fetchSourcePage(url, origin)
  return pageLinks(mainHtml(html), url, origin).map(l => l.href).filter(isPdfLink).slice(0, MAX_FILES)
}

export async function startGrantFolder(
  sql: postgres.Sql,
  id: string,
  run: (job: () => Promise<void>) => void = job => void job(),
): Promise<DriveStart> {
  if (!hasDrive()) {
    throw createError({ statusCode: 503, statusMessage: 'Google Drive non configurato (GOOGLE_SERVICE_ACCOUNT_JSON, RADAR_DRIVE_FOLDER_ID)' })
  }
  const [row] = await sql<{ drive_folder_url: string | null }[]>`select drive_folder_url from radar_grants where id = ${id}`
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Bando non trovato' })
  if (row.drive_folder_url) return { status: 'ready', url: row.drive_folder_url }
  const claimed = await sql`
    update radar_grants set drive_claimed_at = now(), drive_note = ''
    where id = ${id} and drive_folder_url is null
      and (drive_claimed_at is null or drive_claimed_at < now() - ${`${DRIVE_CLAIM_MINUTES} minutes`}::interval)
    returning id
  `
  // Già in corso (altro clic, altra istanza): il pannello aspetta lo stesso lavoro
  if (claimed.length) run(() => fillFolder(sql, id))
  return { status: 'creating' }
}

async function fillFolder(sql: postgres.Sql, id: string) {
  try {
    const [{ grant, content }, { profile }] = await Promise.all([readGrantDocument(sql, id), readRadarSettings(sql)])
    const [row] = await sql<{ drive_folder_id: string | null }[]>`select drive_folder_id from radar_grants where id = ${id}`
    let folderId = row?.drive_folder_id ?? null
    if (!folderId) {
      folderId = (await createDriveFolder(grant.title, driveFolderId())).id
      // Salvata subito: un errore dopo non crea una seconda cartella al prossimo clic
      await sql`update radar_grants set drive_folder_id = ${folderId} where id = ${id}`
    }
    await uploadDriveFile(grantFileName(grant), 'text/markdown', Buffer.from(grantExport(grant, content, profile)), folderId)
    const note = await uploadPdfs(grant.url, folderId)
    await sql`
      update radar_grants set drive_folder_url = ${driveFolderUrl(folderId)}, drive_note = ${note},
        drive_claimed_at = null, liked_at = coalesce(liked_at, now())
      where id = ${id}
    `
  }
  catch (err) {
    console.error('[radar] cartella su Drive non creata', err)
    await sql`
      update radar_grants set drive_claimed_at = null, drive_note = ${`Non riuscita: ${(err as Error).message}`.slice(0, 500)}
      where id = ${id}
    `
  }
}

// Carica i PDF del bando, quattro alla volta; la nota dice cosa manca
async function uploadPdfs(url: string, folderId: string): Promise<string> {
  let pdfs: string[]
  try {
    pdfs = await grantPdfLinks(url)
  }
  catch {
    return 'Pagina del bando non raggiungibile: i PDF vanno aggiunti a mano'
  }
  let notDownloaded = 0
  let notUploaded = 0
  let next = 0
  const worker = async () => {
    while (next < pdfs.length) {
      const href = pdfs[next++]!
      let data: Buffer | null
      try {
        data = await fetchFromSource(href, { origin: new URL(href).origin, maxBytes: MAX_FILE_BYTES, timeoutMs: SOURCE_TIMEOUT_MS, optional: true })
      }
      catch {
        data = null
      }
      if (!data) {
        notDownloaded++
        continue
      }
      try {
        await uploadDriveFile(attachmentName(href), 'application/pdf', data, folderId)
      }
      catch {
        notUploaded++
      }
    }
  }
  await Promise.all(Array.from({ length: FILE_CONCURRENCY }, worker))
  const loaded = pdfs.length - notDownloaded - notUploaded
  const parts = [`${loaded} PDF del bando caricati`]
  if (!pdfs.length) parts[0] = 'Nessun PDF trovato sulla pagina del bando'
  if (notDownloaded) parts.push(`${notDownloaded} non scaricati dal sito`)
  if (notUploaded) parts.push(`${notUploaded} non caricati su Drive`)
  return parts.join(', ')
}
