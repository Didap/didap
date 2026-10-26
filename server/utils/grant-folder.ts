import { createError } from 'h3'
import type postgres from 'postgres'
import { cleanFileName, MAX_FILE_BYTES, MAX_FILE_MB } from '#shared/grant-files'
import { FOLDER_CLAIM_MINUTES, type FolderStart } from '#shared/radar'
import type { FileStore } from './file-store'
import { addFileOnce, grantSourceFolder } from './grant-files'
import { inPool, readGrantDocument } from './radar'
import { grantExport, grantFileName } from './radar-export'
import { attachmentName, fetchFromSource, fetchSourcePage, isPdfLink, mainHtml, pagePdfLinks, SOURCE_TIMEOUT_MS } from './radar-fetch'

// "Crea cartella del bando": la cartella del bando nel pannello, con una
// sottocartella "Dal bando" col bando esportato per Claude e i PDF linkati
// dalla pagina del bando. Il resto lo aggiunge chi ci lavora.
//
// Gira in background (siti lenti, PDF grossi) con lo stato nel database:
// folder_at = cartella creata (protegge il bando), folder_claimed_at = in
// corso, folder_filled_at = finita, folder_failed_at = finita con un errore,
// folder_note = com'è andata, folder_source_id = la "Dal bando". Il turno nel
// database vale anche con più istanze del sito; un riempimento rimasto a
// metà si riprende al clic successivo.

type Sql = postgres.Sql

const SOURCE_FOLDER = 'Dal bando'
const MAX_FILES = 10
// Si scarica fino a qui per dire "oltre 10 MB" invece di "non scaricato"
const MAX_DOWNLOAD_BYTES = 40 * 1024 * 1024
const FILE_CONCURRENCY = 4

// I PDF della pagina del bando (stessa origine); un bando che è un PDF è sé stesso
export async function grantPdfLinks(url: string): Promise<string[]> {
  if (isPdfLink(url)) return [url]
  const origin = new URL(url).origin
  return pagePdfLinks(mainHtml(await fetchSourcePage(url, origin)), url, origin, MAX_FILES)
}

// Nome del PDF nella cartella: dal link, ripulito come i caricamenti
export const pdfFileName = (href: string) => cleanFileName(attachmentName(href), 'documento.pdf')

export async function startGrantFolder(
  sql: Sql,
  store: FileStore,
  id: string,
  run: (job: () => Promise<void>) => void = job => void job(),
): Promise<FolderStart> {
  // La cartella c'è da subito; anche il cuore, come setGrantLiked: chi la
  // crea ci lavora
  const [row] = await sql<{ folder_filled_at: Date | null }[]>`
    update radar_grants set folder_at = coalesce(folder_at, now()), liked_at = coalesce(liked_at, now())
    where id = ${id}
    returning folder_filled_at
  `
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Bando non trovato' })
  if (row.folder_filled_at) return { status: 'ready' }
  // Ora del turno decisa qui, al millisecondo: fa da gettone per liberarlo
  const claimedAt = new Date()
  const [claim] = await sql`
    update radar_grants set folder_claimed_at = ${claimedAt}, folder_note = '', folder_failed_at = null
    where id = ${id} and folder_filled_at is null
      and (folder_claimed_at is null or folder_claimed_at < now() - ${`${FOLDER_CLAIM_MINUTES} minutes`}::interval)
    returning id
  `
  // Già in corso (altro clic, altra istanza): il pannello aspetta lo stesso lavoro
  if (claim) run(() => fillFolder(sql, store, id, claimedAt))
  return { status: 'filling' }
}

// `claimedAt`: il turno di questo lavoro. Lo stato si scrive solo se il turno
// è ancora suo: un lavoro rimasto indietro (turno scaduto e ripreso da un
// altro) non copre quello nuovo.
async function fillFolder(sql: Sql, store: FileStore, id: string, claimedAt: Date) {
  try {
    const { grant, content, profile } = await readGrantDocument(sql, id)
    const source = await grantSourceFolder(sql, id, SOURCE_FOLDER)
    // Ripresa dopo un errore: i file già nella cartella si saltano. I nomi si
    // leggono una volta e la lista segue i file salvati; un altro lavoro
    // sulla stessa cartella lo ferma addFileOnce, che ricontrolla il nome
    // sotto il lucchetto, così niente "(2)"
    const names = new Set([...source.names].map(n => n.toLowerCase()))
    const saver: Saver = {
      has: name => names.has(name.toLowerCase()),
      save: async (name, mime, data) => {
        await addFileOnce(sql, store, { grantId: id, folderId: source.id, name, mime, data, userId: null })
        names.add(name.toLowerCase())
      },
    }
    const mdName = grantFileName(grant)
    // Si aspettano entrambi: un errore sul bando non lascia PDF in volo
    const [md, pdfs] = await Promise.allSettled([
      saver.has(mdName) ? Promise.resolve() : saver.save(mdName, 'text/markdown', Buffer.from(grantExport(grant, content, profile))),
      savePdfs(grant.url, saver),
    ])
    if (md.status === 'rejected') throw md.reason
    if (pdfs.status === 'rejected') throw pdfs.reason
    // PDF scaricati ma non caricati nello store, o pagina del bando non
    // raggiunta: la cartella resta da finire, così il pannello offre di
    // riprovare (la ripresa salta i file presenti)
    const { note, complete } = pdfs.value
    await sql`
      update radar_grants set folder_filled_at = ${complete ? new Date() : null}, folder_note = ${note},
        folder_claimed_at = null, folder_failed_at = null
      where id = ${id} and folder_claimed_at = ${claimedAt}
    `
  }
  catch (err) {
    console.error('[radar] cartella del bando non riempita', err)
    await sql`
      update radar_grants set folder_claimed_at = null, folder_failed_at = now(),
        folder_note = ${`Non riuscita: ${(err as Error).message}`.slice(0, 500)}
      where id = ${id} and folder_claimed_at = ${claimedAt}
    `
  }
}

type PdfOutcome = 'loaded' | 'notDownloaded' | 'tooLarge' | 'notUploaded'
type Saver = { has: (name: string) => boolean, save: (name: string, mime: string, data: Buffer) => Promise<void> }

async function savePdf(href: string, { has, save }: Saver): Promise<PdfOutcome> {
  const name = pdfFileName(href)
  // Già nella cartella: non si riscarica
  if (has(name)) return 'loaded'
  const data = await fetchFromSource(href, { origin: new URL(href).origin, maxBytes: MAX_DOWNLOAD_BYTES, timeoutMs: SOURCE_TIMEOUT_MS, optional: true })
    .catch(() => null)
  if (!data) return 'notDownloaded'
  if (data.length > MAX_FILE_BYTES) return 'tooLarge'
  return save(name, 'application/pdf', data).then(() => 'loaded' as const, () => 'notUploaded' as const)
}

// Salva i PDF del bando, quattro alla volta; la nota dice cosa manca.
// `complete` è falso se la pagina del bando non si raggiunge o se qualche PDF
// scaricato non è entrato nello store: un nuovo tentativo può prenderli.
async function savePdfs(url: string, saver: Saver): Promise<{ note: string, complete: boolean }> {
  let pdfs: string[]
  try {
    pdfs = await grantPdfLinks(url)
  }
  catch {
    return { note: 'Pagina del bando non raggiungibile: riprova più tardi o aggiungi i PDF a mano', complete: false }
  }
  if (!pdfs.length) return { note: 'Nessun PDF trovato sulla pagina del bando', complete: true }
  const outcomes = await inPool(pdfs, FILE_CONCURRENCY, href => savePdf(href, saver))
  const count = (o: PdfOutcome) => outcomes.filter(x => x === o).length
  const note = [
    `${count('loaded')} PDF del bando caricati`,
    count('notDownloaded') && `${count('notDownloaded')} non scaricati dal sito`,
    count('tooLarge') && `${count('tooLarge')} oltre ${MAX_FILE_MB} MB, da scaricare dal sito del bando`,
    count('notUploaded') && `${count('notUploaded')} non caricati`,
  ].filter(Boolean).join(', ')
  return { note, complete: count('notUploaded') === 0 }
}
