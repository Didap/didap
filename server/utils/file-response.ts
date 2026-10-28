import { INLINE_MIMES } from '#shared/grant-files'

// Intestazioni per i byte di un file della cartella del bando. Nel browser si
// aprono solo PDF e immagini semplici; il resto (HTML, SVG, ...) è sempre un
// allegato di byte generici, in sandbox se qualcuno lo apre lo stesso.

export const inlineAllowed = (mime: string) => INLINE_MIMES.has(mime)

// Ripiego ASCII per i browser vecchi: niente virgolette, barre inverse,
// accenti o altri caratteri fuori da ASCII stampabile
function asciiName(name: string): string {
  const plain = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/["\\]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .trim()
  return plain || 'file'
}

// RFC 5987: anche ' ( ) * vanno codificati
const encodeName = (name: string) =>
  encodeURIComponent(name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

export function fileHeaders(name: string, mime: string, download: boolean): Record<string, string> {
  const inline = !download && inlineAllowed(mime)
  const headers: Record<string, string> = {
    'Content-Type': inline ? mime : 'application/octet-stream',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${asciiName(name)}"; filename*=UTF-8''${encodeName(name)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  }
  // Solo sugli allegati: la sandbox fermerebbe il visore PDF dell'anteprima
  if (!inline) headers['Content-Security-Policy'] = 'sandbox'
  return headers
}
