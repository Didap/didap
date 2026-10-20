// Download e testo delle pagine dei siti letti dal radar (portati dal Radar
// Bandi di cityfix). Gli URL li decide l'HTML altrui: l'origine resta
// bloccata anche dopo i redirect e il corpo ha un tetto di byte.

const USER_AGENT = 'Mozilla/5.0 (compatible; DidapRadar/1.0; +https://didap.it)'

const MAX_REDIRECTS = 5

type FetchOptions = { origin: string, maxBytes: number, timeoutMs: number }

// Con `optional` un file che non c'è (più) o troppo grande dà null invece di
// un errore: un link rotto si salta, un errore passeggero fa riprovare
export async function fetchFromSource(url: string, options: FetchOptions & { optional: true }): Promise<Buffer | null>
export async function fetchFromSource(url: string, options: FetchOptions): Promise<Buffer>
export async function fetchFromSource(
  url: string,
  options: FetchOptions & { optional?: boolean },
): Promise<Buffer | null> {
  const { origin, maxBytes, timeoutMs, optional } = options
  const signal = AbortSignal.timeout(timeoutMs)
  const skip = (message: string) => {
    if (optional) return null
    throw new Error(message)
  }

  // I redirect si seguono a mano: l'origine si controlla prima di ogni richiesta
  let target = url
  let res: Response
  for (let hops = 0; ; hops++) {
    if (new URL(target).origin !== origin) {
      throw new Error(hops ? `Rifiutato ${url}: redirect fuori da ${origin}` : `Rifiutato ${url}: fuori da ${origin}`)
    }
    res = await fetch(target, { headers: { 'User-Agent': USER_AGENT }, redirect: 'manual', signal })
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
    if (!location) break
    await res.body?.cancel()
    if (hops >= MAX_REDIRECTS) throw new Error(`Troppi redirect per ${url}`)
    target = new URL(location, target).toString()
  }

  const tooLarge = `${url} supera ${maxBytes} byte`
  if (!res.ok || Number(res.headers.get('content-length')) > maxBytes) {
    await res.body?.cancel()
    if (res.status === 404 || res.status === 410) return skip(`${origin} ha risposto ${res.status} per ${url}`)
    if (!res.ok) throw new Error(`${origin} ha risposto ${res.status} per ${url}`)
    return skip(tooLarge)
  }

  const chunks: Uint8Array[] = []
  let size = 0
  if (res.body) {
    const reader = res.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > maxBytes) {
        await reader.cancel()
        return skip(tooLarge)
      }
      chunks.push(value)
    }
  }
  return Buffer.concat(chunks)
}

export async function fetchSourcePage(url: string, origin: string): Promise<string> {
  const body = await fetchFromSource(url, { origin, maxBytes: 5 * 1024 * 1024, timeoutMs: 20_000 })
  return body.toString('utf-8')
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\'',
  nbsp: ' ',
  euro: '€',
  agrave: 'à',
  egrave: 'è',
  eacute: 'é',
  igrave: 'ì',
  ograve: 'ò',
  ugrave: 'ù',
  laquo: '«',
  raquo: '»',
  ndash: '-',
  mdash: '-',
  rsquo: '\'',
  lsquo: '\'',
  ldquo: '"',
  rdquo: '"',
  hellip: '...',
}

const codePoint = (code: number, fallback: string) =>
  Number.isInteger(code) && code > 0 && code <= 0x10FFFF ? String.fromCodePoint(code) : fallback

// Testo di un frammento HTML: i blocchi vanno a capo, i tag spariscono
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/?(p|div|br|h[1-6]|ul|ol|tr|table|section)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (m, hex: string) => codePoint(parseInt(hex, 16), m))
    .replace(/&#(\d+);/g, (m, dec: string) => codePoint(Number(dec), m))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/[^\S\n]+|﻿/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/^-\n+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// L'HTML dentro l'elemento con `marker` (es. `id="main-content"`), fino alla
// fine del <main>; null se il marker non c'è
export function innerHtml(html: string, marker: string): string | null {
  const start = html.indexOf(marker)
  if (start === -1) return null
  const end = html.indexOf('</main>', start)
  return html.slice(html.indexOf('>', start) + 1, end === -1 ? undefined : end)
}

export type Attachment = { name: string, data: Buffer }

// Ogni pagina porta file e numero, così il modello può citarla
const pageMarker = (file: string, page: number) => `[[${file} | pagina ${page}]]`

const isPdf = (data: Buffer) => data.subarray(0, 5).toString('latin1') === '%PDF-'

async function pdfPages(data: Buffer): Promise<string[]> {
  const { extractText } = await import('unpdf')
  const { text } = await extractText(new Uint8Array(data), { mergePages: false })
  return text
}

// Testo dei PDF allegati, pagina per pagina. Un file illeggibile (scansione,
// cifrato, rotto) si salta: il bando si legge con quello che resta.
export async function attachmentsText(attachments: Attachment[], extract = pdfPages): Promise<string> {
  const parts: string[] = []
  for (const a of attachments) {
    if (!isPdf(a.data)) continue
    try {
      const pages = await extract(a.data)
      pages.forEach((page, i) => {
        if (page.trim()) parts.push(`${pageMarker(a.name, i + 1)}\n${page.trim()}`)
      })
    }
    catch (err) {
      console.warn(`[radar] PDF illeggibile: ${a.name}`, err)
    }
  }
  return parts.join('\n\n')
}
