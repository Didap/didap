import {
  attachmentName,
  attachmentsText,
  fetchFromSource,
  fetchSourcePage,
  htmlToText,
  isPdfLink,
  mainHtml,
  pageLinks,
  pagePdfLinks,
  resolveOrigin,
  safeDecode,
  SOURCE_TIMEOUT_MS,
  withAttachments,
} from './radar-fetch'
import type { LinkPicker } from './radar-reader'
import type { Listing, RadarSource } from './radar-sources'

// Siti senza un elenco strutturato dei bandi (comuni, Puglia Sviluppo): si
// parte da una o più pagine e il modello sceglie quali link aprire, pagina
// per pagina, fino a una profondità fissa. Le pagine scelte come "bando"
// diventano le voci della fonte.

// Un link diretto a un PDF è il bando stesso: si accetta più grande
const MAX_CALL_PDF_BYTES = 40 * 1024 * 1024
// Elenchi aperti per pagina: il modello ne indica al massimo 3, se ne seguono 2
const LISTS_PER_PAGE = 2

export type CrawlOptions = {
  slug: string
  startUrls: string[]
  // Livelli di elenchi da attraversare dopo le pagine di partenza
  maxDepth: number
  // Bandi al massimo per giro
  maxCalls: number
}

// Testo di una pagina e dei PDF che collega; un link diretto a un PDF è il bando stesso
export async function pageWithAttachments(url: string, origin: string): Promise<string> {
  if (isPdfLink(url)) {
    const data = await fetchFromSource(url, { origin, maxBytes: MAX_CALL_PDF_BYTES, timeoutMs: SOURCE_TIMEOUT_MS })
    const text = await attachmentsText([{ name: attachmentName(url), data }])
    if (!text) throw new Error(`PDF senza testo leggibile: ${url}`)
    return text
  }
  const main = mainHtml(await fetchSourcePage(url, origin))
  const content = htmlToText(main)
  if (!content) throw new Error(`Pagina vuota: ${url}`)
  return withAttachments(content, pagePdfLinks(main, url, origin), origin)
}

export function crawlSource(options: CrawlOptions, picker: LinkPicker): RadarSource {
  let origin: string | null = null
  return {
    slug: options.slug,
    // Pagine e PDF costano: un bando già letto si ricontrolla ogni settimana
    refreshDays: 7,
    // Si vede solo quello che il modello sceglie: chi non c'è non è per forza chiuso
    complete: false,
    async fetchListing() {
      origin = await resolveOrigin(options.startUrls[0]!)
      const start = options.startUrls.map(u => new URL(new URL(u).pathname + new URL(u).search, origin!).toString())
      const single = start.length === 1
      const visited = new Set<string>()
      const calls = new Map<string, Listing>()
      let startErrors = 0
      let lastError: unknown
      let level = start
      for (let depth = 0; depth <= options.maxDepth && level.length; depth++) {
        const next: string[] = []
        for (const url of level) {
          if (visited.has(url) || calls.size >= options.maxCalls) continue
          visited.add(url)
          let page = url
          let html
          try {
            html = await fetchSourcePage(url, origin)
          }
          catch (err) {
            // Un elenco interno rotto si salta, e così una delle tante pagine
            // di partenza (Puglia Sviluppo). La home unica di un comune che non
            // risponde (IndicePA ha a volte un percorso vecchio, es. /it che
            // dà 404) si riprova dalla radice del sito.
            if (depth > 0) continue
            const home = `${origin}/`
            if (!single || url === home) {
              startErrors++
              lastError = err
              continue
            }
            visited.add(home)
            page = home
            html = await fetchSourcePage(home, origin)
          }
          const links = pageLinks(html, page, origin)
          if (!links.length) {
            // Una home sola senza link: meglio dirlo che restituire zero bandi in silenzio
            if (depth === 0 && single) {
              throw new Error(`${page}: nessun link leggibile, il sito si carica probabilmente in JavaScript`)
            }
            continue
          }
          const picks = await picker({ url: page, links })
          let lists = 0
          for (const p of picks) {
            if (p.kind === 'call' && !calls.has(p.href) && calls.size < options.maxCalls) {
              const u = new URL(p.href)
              calls.set(p.href, { externalId: safeDecode(u.pathname + u.search), url: p.href })
            }
            else if (p.kind === 'list' && lists < LISTS_PER_PAGE && !visited.has(p.href)) {
              lists++
              next.push(p.href)
            }
          }
        }
        level = next
      }
      // Nessuna pagina di partenza raggiungibile: è la fonte a essere giù
      if (startErrors === start.length) throw lastError
      return [...calls.values()]
    },
    async fetchContent(listing) {
      return pageWithAttachments(listing.url, origin ?? new URL(listing.url).origin)
    },
  }
}
