import { errorCode, webRequest } from './radar-http'

// Download e testo delle pagine dei siti letti dal radar (portati dal Radar
// Bandi di cityfix). Gli URL li decide l'HTML altrui: l'origine resta
// bloccata anche dopo i redirect e il corpo ha un tetto di byte.

const MAX_REDIRECTS = 5

type FetchOptions = { origin: string, maxBytes: number, timeoutMs: number }

// Errore che può sparire riprovando: niente risposta in tempo, rete, 5xx, 429
class TransientError extends Error {}

const RETRY_AFTER_MS = 3_000

// Siti di enti col certificato HTTPS rotto: il radar non li legge (non si
// spegne la verifica), ma l'errore dice perché
const CERT_ERRORS: Record<string, string> = {
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'certificato HTTPS incompleto (manca il certificato intermedio)',
  CERT_HAS_EXPIRED: 'certificato HTTPS scaduto',
  ERR_TLS_CERT_ALTNAME_INVALID: 'certificato HTTPS di un altro dominio',
  INVALID_PURPOSE: 'certificato HTTPS non valido',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'certificato HTTPS autofirmato',
  SELF_SIGNED_CERT_IN_CHAIN: 'certificato HTTPS autofirmato',
}

const certificateProblem = (err: unknown) => CERT_ERRORS[errorCode(err)]

// Perché una richiesta non è arrivata: tempo scaduto, certificato (che non
// si aggiusta riprovando) o rete, col codice (ENOTFOUND, ECONNRESET...) che
// dice più di "fetch failed"
function requestError(err: unknown, url: string, timeoutMs: number, signal: AbortSignal) {
  if (signal.aborted) return { message: `Nessuna risposta in ${timeoutMs / 1000} s da ${url}`, transient: true }
  const cert = certificateProblem(err)
  if (cert) return { message: `${url}: ${cert}`, transient: false }
  return { message: `Rete non raggiungibile per ${url}: ${errorCode(err) || (err as Error).message}`, transient: true }
}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Con `optional` un file che non c'è (più) o troppo grande dà null invece di
// un errore: un link rotto si salta. Un errore passeggero si riprova una
// volta; se torna, fa riprovare il bando al giro successivo.
export async function fetchFromSource(url: string, options: FetchOptions & { optional: true }): Promise<Buffer | null>
export async function fetchFromSource(url: string, options: FetchOptions): Promise<Buffer>
export async function fetchFromSource(
  url: string,
  options: FetchOptions & { optional?: boolean },
): Promise<Buffer | null> {
  try {
    return await fetchOnce(url, options)
  }
  catch (err) {
    if (!(err instanceof TransientError)) throw err
    await sleep(RETRY_AFTER_MS)
    return fetchOnce(url, options)
  }
}

async function fetchOnce(url: string, options: FetchOptions & { optional?: boolean }): Promise<Buffer | null> {
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
    try {
      res = await webRequest(target, signal)
    }
    catch (err) {
      const { message, transient } = requestError(err, url, timeoutMs, signal)
      throw transient ? new TransientError(message) : new Error(message)
    }
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
    if (!location) break
    await res.body?.cancel()
    if (hops >= MAX_REDIRECTS) throw new Error(`Troppi redirect per ${url}`)
    target = new URL(location, target).toString()
  }

  const tooLarge = `${url} supera ${maxBytes} byte`
  if (!res.ok || Number(res.headers.get('content-length')) > maxBytes) {
    // Alcuni comuni stanno dietro un CAPTCHA per soli umani (BitNinja): non
    // si aggira, si dice perché il sito non si legge. Basta l'inizio della pagina.
    const head = res.status === 403 ? await readHead(res, 4000) : (await res.body?.cancel(), '')
    if (/captcha|anti-robot/i.test(`${res.headers.get('server')} ${head}`)) {
      throw new Error(`${url}: il sito chiede un CAPTCHA anti-robot, non si legge in automatico`)
    }
    if (res.status === 404 || res.status === 410) return skip(`${origin} ha risposto ${res.status} per ${url}`)
    const message = `${origin} ha risposto ${res.status} per ${url}`
    if (res.status >= 500 || res.status === 429) throw new TransientError(message)
    if (!res.ok) throw new Error(message)
    return skip(tooLarge)
  }

  const chunks: Uint8Array[] = []
  let size = 0
  if (res.body) {
    const reader = res.body.getReader()
    for (;;) {
      let chunk
      try {
        chunk = await reader.read()
      }
      catch {
        // Tempo scaduto o connessione caduta a metà del download (file grandi, sito lento)
        throw new TransientError(`Download interrotto per ${url}`)
      }
      const { done, value } = chunk
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

// I primi `max` byte del corpo come testo; il resto non si scarica
async function readHead(res: Response, max: number): Promise<string> {
  if (!res.body) return ''
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (size < max) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      size += value.length
    }
  }
  catch {
    // Corpo interrotto: basta quello che è arrivato
  }
  await reader.cancel().catch(() => {})
  return Buffer.concat(chunks).toString('utf-8')
}

// Il sito della Regione e quelli di alcuni comuni (Diso, Erchie) possono
// metterci decine di secondi a rispondere
export const SOURCE_TIMEOUT_MS = 90_000

export async function fetchSourcePage(url: string, origin: string): Promise<string> {
  const body = await fetchFromSource(url, { origin, maxBytes: 5 * 1024 * 1024, timeoutMs: SOURCE_TIMEOUT_MS })
  return decodeHtml(body)
}

// Utf-8 salvo che la pagina dichiari un charset latino (Sistema Puglia, siti
// di comuni datati)
export function decodeHtml(body: Buffer): string {
  const head = body.subarray(0, 4096).toString('latin1')
  const charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1]?.toLowerCase()
  const latin = charset && /^(iso-8859-1|iso-8859-15|latin1|windows-1252|cp1252)$/.test(charset)
  return new TextDecoder(latin ? 'windows-1252' : 'utf-8').decode(body)
}

// Dove porta davvero un indirizzo (http -> https, senza o con www): i siti
// dei comuni si leggono poi solo dentro questa origine. Conta l'origine,
// non la risposta: una home che dà 404 si gestisce dopo.
export async function resolveOrigin(url: string): Promise<string> {
  const signal = AbortSignal.timeout(SOURCE_TIMEOUT_MS)
  let target = url
  for (let hops = 0; hops <= MAX_REDIRECTS; hops++) {
    let res: Response
    try {
      res = await webRequest(target, signal)
    }
    catch (err) {
      throw new Error(requestError(err, url, SOURCE_TIMEOUT_MS, signal).message)
    }
    await res.body?.cancel()
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
    if (!location) return new URL(target).origin
    target = new URL(location, target).toString()
  }
  throw new Error(`Troppi redirect per ${url}`)
}

// decodeURIComponent senza eccezioni: un "%" a caso nei link altrui resta com'è
export function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text)
  }
  catch {
    return text
  }
}

// Nome di un file dal suo URL; quelli Liferay finiscono con `/<nome file>/<uuid>`
export function attachmentName(url: string): string {
  const segments = new URL(url).pathname.split('/').filter(Boolean)
  const file = segments.find(s => /\.pdf$/i.test(s)) ?? segments.at(-1) ?? 'allegato.pdf'
  return safeDecode(file.replace(/\+/g, ' '))
}

// Link a un PDF, anche nello stile Liferay della Regione (/documents/.../file.pdf/<uuid>)
export const isPdfLink = (url: string) => /\.pdf(\/|$)/i.test(new URL(url).pathname)

// I PDF linkati nell'area principale di una pagina, stessa origine
// `main`: l'area principale della pagina (mainHtml), calcolata una volta da chi chiama
export const pagePdfLinks = (main: string, url: string, origin: string, max = 10) =>
  pageLinks(main, url, origin).map(l => l.href).filter(isPdfLink).slice(0, max)

const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

// Il testo di una pagina più quello dei PDF che collega (i primi 5, fino a
// 15 MB). Un file troppo grande o un link rotto si salta; gli errori
// passeggeri fanno riprovare tutto il bando.
export async function withAttachments(content: string, urls: string[], origin: string): Promise<string> {
  const files = await Promise.all(urls.slice(0, MAX_ATTACHMENTS).map(async (href) => {
    const data = await fetchFromSource(href, { origin, maxBytes: MAX_ATTACHMENT_BYTES, timeoutMs: SOURCE_TIMEOUT_MS, optional: true })
    return data && { name: attachmentName(href), data }
  }))
  const pdf = await attachmentsText(files.filter(f => f !== null))
  return pdf ? `${content}\n\n${pdf}` : content
}

const SKIPPED_FILES = /\.(jpe?g|png|gif|svg|webp|ico|css|js|zip|rar|7z|mp4|mp3|docx?|xlsx?|odt|ods|p7m|xml|rss)(\?|$)/i

// Link di una pagina dentro la stessa origine, col testo che li accompagna:
// quello che il modello vede per scegliere dove andare
export function pageLinks(html: string, pageUrl: string, origin: string, max = 400): { text: string, href: string }[] {
  const out = new Map<string, string>()
  for (const [, attrs, inner] of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs!)?.[1]
    if (!href || /^(mailto|tel|javascript):|^#/i.test(href)) continue
    let url: URL
    try {
      url = new URL(href.replace(/&amp;/g, '&'), pageUrl)
    }
    catch {
      continue
    }
    url.hash = ''
    if (url.origin !== origin || SKIPPED_FILES.test(url.pathname)) continue
    const label = htmlToText(inner!).replace(/\s+/g, ' ').trim()
      || /(?:title|aria-label)\s*=\s*["']([^"']+)["']/i.exec(attrs!)?.[1]?.trim()
      || ''
    const key = url.toString()
    if (!label || key === pageUrl) continue
    if (!out.has(key) || out.get(key)!.length < label.length) out.set(key, label.slice(0, 160))
    if (out.size >= max) break
  }
  return [...out].map(([href, text]) => ({ text, href }))
}

// L'area principale di una pagina qualunque: <main>, poi <article>, poi il <body>
export function mainHtml(html: string): string {
  for (const re of [/<main\b[^>]*>([\s\S]*?)<\/main>/i, /<article\b[^>]*>([\s\S]*?)<\/article>/i, /<body\b[^>]*>([\s\S]*?)<\/body>/i]) {
    const m = re.exec(html)
    if (m?.[1] && htmlToText(m[1]).length > 200) return m[1]
  }
  return html
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
