import { createError } from 'h3'
import type postgres from 'postgres'
import { createDriveFolder, driveFolderId, hasDrive, uploadDriveFile } from './drive'
import { readGrantDocument, readRadarSettings } from './radar'
import { grantExport, grantFileName } from './radar-export'
import { fetchFromSource, fetchSourcePage, mainHtml, pageLinks, SOURCE_TIMEOUT_MS } from './radar-fetch'
import { attachmentName } from './radar-sources'

// "Crea cartella su Drive": una cartella per il bando dentro la cartella
// "Bandi" del Drive condiviso, col bando esportato per Claude e i PDF
// linkati dalla pagina del bando. Il resto lo aggiunge chi ci lavora.

const MAX_FILES = 10
const MAX_FILE_BYTES = 40 * 1024 * 1024

// I PDF della pagina del bando (stessa origine); un bando che è un PDF è sé stesso
const isPdf = (url: string) => /\.pdf(\/|$)/i.test(new URL(url).pathname)

export async function grantPdfLinks(url: string): Promise<string[]> {
  if (isPdf(url)) return [url]
  const origin = new URL(url).origin
  const html = await fetchSourcePage(url, origin)
  return pageLinks(mainHtml(html), url, origin).map(l => l.href).filter(isPdf).slice(0, MAX_FILES)
}

// Una cartella alla volta per bando, anche con due clic di fila
const creating = new Map<string, Promise<DriveResult>>()

export type DriveResult = { url: string, files: number, missing: number }

export function createGrantFolder(sql: postgres.Sql, id: string): Promise<DriveResult> {
  if (!creating.has(id)) {
    creating.set(id, makeFolder(sql, id).finally(() => creating.delete(id)))
  }
  return creating.get(id)!
}

async function makeFolder(sql: postgres.Sql, id: string): Promise<DriveResult> {
  if (!hasDrive()) {
    throw createError({ statusCode: 503, statusMessage: 'Google Drive non configurato (GOOGLE_SERVICE_ACCOUNT_JSON, RADAR_DRIVE_FOLDER_ID)' })
  }
  const [{ grant, content }, { profile }] = await Promise.all([readGrantDocument(sql, id), readRadarSettings(sql)])
  if (grant.driveUrl) return { url: grant.driveUrl, files: 0, missing: 0 }

  const folder = await createDriveFolder(grant.title, driveFolderId())
  // Salvata subito: se un file dopo non va, la cartella resta quella
  await sql`
    update radar_grants set drive_folder_id = ${folder.id}, drive_folder_url = ${folder.webViewLink},
      liked_at = coalesce(liked_at, now())
    where id = ${id}
  `
  await uploadDriveFile(grantFileName(grant), 'text/markdown', Buffer.from(grantExport(grant, content, profile)), folder.id)

  let files = 1
  let missing = 0
  let pdfs: string[] = []
  try {
    pdfs = await grantPdfLinks(grant.url)
  }
  catch {
    // Pagina del bando non raggiungibile ora: la cartella c'è, i PDF si aggiungono a mano
  }
  for (const href of pdfs) {
    try {
      const data = await fetchFromSource(href, { origin: new URL(href).origin, maxBytes: MAX_FILE_BYTES, timeoutMs: SOURCE_TIMEOUT_MS, optional: true })
      if (!data) {
        missing++
        continue
      }
      await uploadDriveFile(attachmentName(href), 'application/pdf', data, folder.id)
      files++
    }
    catch {
      missing++
    }
  }
  return { url: folder.webViewLink, files, missing }
}
