import type { SourceGroup } from '#shared/radar'
import { attachmentsText, fetchFromSource, fetchSourcePage, htmlToText, mainHtml, pageLinks, resolveOrigin, SOURCE_TIMEOUT_MS } from './radar-fetch'
import type { LinkPicker } from './radar-reader'
import type { Listing, RadarSource } from './radar-sources'

// Siti senza un elenco strutturato dei bandi (comuni, Puglia Sviluppo): si
// parte da una o più pagine e il modello sceglie quali link aprire, pagina
// per pagina, fino a una profondità fissa. Le pagine scelte come "bando"
// diventano le voci della fonte.

const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024
// Elenchi aperti per pagina: il modello ne indica al massimo 3, se ne seguono 2
const LISTS_PER_PAGE = 2

export type CrawlOptions = {
  slug: string
  group: SourceGroup
  startUrls: string[]
  // Livelli di elenchi da attraversare dopo le pagine di partenza
  maxDepth: number
  // Bandi al massimo per giro
  maxCalls: number
}

const isPdfUrl = (url: string) => /\.pdf$/i.test(new URL(url).pathname)

const fileName = (url: string) => decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? 'allegato.pdf')

// Testo di una pagina e dei PDF che collega; un link diretto a un PDF è il bando stesso
export async function pageWithAttachments(url: string, origin: string): Promise<string> {
  if (isPdfUrl(url)) {
    const data = await fetchFromSource(url, { origin, maxBytes: MAX_ATTACHMENT_BYTES, timeoutMs: SOURCE_TIMEOUT_MS })
    const text = await attachmentsText([{ name: fileName(url), data }])
    if (!text) throw new Error(`PDF senza testo leggibile: ${url}`)
    return text
  }
  const html = await fetchSourcePage(url, origin)
  const main = mainHtml(html)
  const content = htmlToText(main)
  if (!content) throw new Error(`Pagina vuota: ${url}`)
  const pdfs = pageLinks(main, url, origin).map(l => l.href).filter(isPdfUrl).slice(0, MAX_ATTACHMENTS)
  const files = await Promise.all(pdfs.map(async (href) => {
    const data = await fetchFromSource(href, { origin, maxBytes: MAX_ATTACHMENT_BYTES, timeoutMs: SOURCE_TIMEOUT_MS, optional: true })
    return data && { name: fileName(href), data }
  }))
  const pdf = await attachmentsText(files.filter(f => f !== null))
  return pdf ? `${content}\n\n${pdf}` : content
}

export function crawlSource(options: CrawlOptions, picker: LinkPicker): RadarSource {
  let origin: string | null = null
  return {
    slug: options.slug,
    group: options.group,
    // Pagine e PDF costano: un bando già letto si ricontrolla ogni settimana
    refreshDays: 7,
    // Si vede solo quello che il modello sceglie: chi non c'è non è per forza chiuso
    complete: false,
    async fetchListing() {
      origin = await resolveOrigin(options.startUrls[0]!)
      const start = options.startUrls.map(u => new URL(new URL(u).pathname + new URL(u).search, origin!).toString())
      const visited = new Set<string>()
      const calls = new Map<string, Listing>()
      let level = start
      for (let depth = 0; depth <= options.maxDepth && level.length; depth++) {
        const next: string[] = []
        for (const url of level) {
          if (visited.has(url) || calls.size >= options.maxCalls) continue
          visited.add(url)
          let html
          try {
            html = await fetchSourcePage(url, origin)
          }
          catch (err) {
            // Le pagine di partenza devono rispondere; un elenco interno rotto si salta
            if (depth === 0) throw err
            continue
          }
          const links = pageLinks(html, url, origin)
          if (!links.length) continue
          const picks = await picker({ url, links })
          let lists = 0
          for (const p of picks) {
            if (p.kind === 'call' && !calls.has(p.href) && calls.size < options.maxCalls) {
              const u = new URL(p.href)
              calls.set(p.href, { externalId: decodeURIComponent(u.pathname + u.search), url: p.href })
            }
            else if (p.kind === 'list' && lists < LISTS_PER_PAGE && !visited.has(p.href)) {
              lists++
              next.push(p.href)
            }
          }
        }
        level = next
      }
      return [...calls.values()]
    },
    async fetchContent(listing) {
      return pageWithAttachments(listing.url, origin ?? new URL(listing.url).origin)
    },
  }
}
