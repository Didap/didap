import { createError } from 'h3'
import { MAX_FILE_BYTES } from '#shared/grant-files'

// Limiti dei caricamenti nella cartella del bando. Il corpo multipart finisce
// tutto in memoria, quindi la dimensione si guarda prima di leggerlo.

export const MAX_UPLOAD_FILES = 10
// 10 file pieni più il margine per le intestazioni multipart
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_FILES * MAX_FILE_BYTES + 64 * 1024

// Prima di leggere il corpo: Content-Length obbligatoria e sotto il tetto
export function checkUploadLength(header: string | undefined): void {
  if (!header || !/^\d+$/.test(header)) {
    throw createError({ statusCode: 411, statusMessage: 'Lunghezza del caricamento mancante' })
  }
  if (Number(header) > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Caricamento troppo grande' })
  }
}

// Dopo: quanti file e quanto pesa ognuno, prima di caricarne uno
export function checkUploadParts(sizes: number[]): void {
  if (!sizes.length) throw createError({ statusCode: 400, statusMessage: 'Nessun file' })
  if (sizes.length > MAX_UPLOAD_FILES) {
    throw createError({ statusCode: 413, statusMessage: 'Al massimo 10 file per volta' })
  }
  for (const size of sizes) {
    if (!size) throw createError({ statusCode: 413, statusMessage: 'File vuoto' })
    if (size > MAX_FILE_BYTES) throw createError({ statusCode: 413, statusMessage: 'File oltre 10 MB' })
  }
}

// I browser scrivono " e gli a capo del nome come %22, %0D, %0A
export const browserName = (filename = '') => filename.replace(/%22/g, '"').replace(/%0[AD]/gi, ' ')

// Tipo del file caricato: quello del browser, ma un .pdf senza tipo o con un
// tipo generico diventa application/pdf (così si apre nel visore)
const VAGUE_PDF_TYPES = new Set(['', 'application/octet-stream', 'application/x-pdf'])
export function uploadMime(type: string | undefined, name: string): string {
  const t = (type ?? '').trim().toLowerCase()
  if (VAGUE_PDF_TYPES.has(t) && name.toLowerCase().endsWith('.pdf')) return 'application/pdf'
  return type || 'application/octet-stream'
}
