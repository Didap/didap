import { romeDate } from '#shared/dates'
import { comuneSlug, comuniOf, type RadarSearch } from '#shared/radar'
import { crawlSource } from './radar-crawl'
import {
  attachmentName,
  attachmentsText,
  fetchFromSource,
  fetchSourcePage,
  htmlToText,
  innerHtml,
  isPdfLink,
  safeDecode,
  SOURCE_TIMEOUT_MS,
  type Attachment,
} from './radar-fetch'
import type { LinkPicker } from './radar-reader'

// Fonti del radar in tre moduli: governo (catalogo di incentivi.gov.it),
// regione (Regione Puglia, Sistema Puglia, Puglia Sviluppo) e comuni, uno
// per uno. Ogni fonte elenca i bandi e ne restituisce il testo; il resto lo
// fa radar.ts.

// `closed`: la fonte lo elenca ancora ma lo segna come chiuso.
// `content`: il testo, se l'elenco lo dà già (niente fetchContent)
export type Listing = { externalId: string, url: string, closed?: boolean, content?: string }

export type RadarSource = {
  slug: string
  // Giorni prima di riscaricare un bando già visto (0 = ogni volta)
  refreshDays: number
  // L'elenco contiene tutti i bandi aperti: chi sparisce è chiuso
  complete: boolean
  fetchListing(): Promise<Listing[]>
  fetchContent?(listing: Listing): Promise<string>
}

// ---------- incentivi.gov.it ----------

const INCENTIVI = 'https://www.incentivi.gov.it'

const F = {
  id: 'zs_nid',
  title: 'zs_title',
  path: 'zs_url',
  body: 'zs_body',
  grantor: 'zs_field_subject_grant',
  opensAt: 'zs_field_open_date',
  closesAt: 'zs_field_close_date',
  datesNote: 'zs_field_close_date_descriptor',
  budget: 'zs_field_budget_allocation',
  grantMin: 'zs_field_support_grant_type_min',
  grantMax: 'zs_field_support_grant_type_max',
  costMin: 'zs_field_cost_min',
  costMax: 'zs_field_cost_max',
  subjects: 'zm_field_subject_type_value',
  supportForms: 'zm_field_support_form_value',
  grantedCosts: 'zm_field_granted_costs_value',
  scopes: 'zm_field_scopes_value',
  sectors: 'zm_field_activity_sector_value',
  regions: 'zm_field_regions_value',
  comuni: 'zs_field_comuni',
  territories: 'zm_field_special_territory_value',
  link: 'zs_field_link',
} as const

type Field = (typeof F)[keyof typeof F]
type Incentive = Partial<Record<Field, string | string[]>>

const ALL_REGIONS = 20

const field = (inc: Incentive, f: Field) => {
  const v = inc[f]
  const joined = Array.isArray(v) ? v.join(', ') : v
  return joined?.toString().trim() || undefined
}

const amountRange = (inc: Incentive, min: Field, max: Field) => {
  // Il catalogo scrive 0 per un limite non indicato
  const from = Number(field(inc, min)) || undefined
  const to = Number(field(inc, max)) || undefined
  if (from && to) return `da ${from} a ${to} euro`
  if (to) return `fino a ${to} euro`
  if (from) return `da ${from} euro`
  return undefined
}

// "Impresa", "Impresa - SU/PMI innovativa", "Impresa da costituire - Giovanile",
// "Professionista", "Rete d'impresa"
const isBusiness = (subject: string) => /^impresa|^professionista$|^rete d'impresa$/i.test(subject)

// Aperto alle imprese, valido in Puglia e non ancora chiuso
export function isOpenToPugliaBusinesses(inc: Incentive, now: Date): boolean {
  const subjects = inc[F.subjects]
  if (!Array.isArray(subjects) || !subjects.some(isBusiness)) return false
  const regions = inc[F.regions]
  if (Array.isArray(regions) && regions.length && !regions.includes('Puglia')) return false
  const closesAt = field(inc, F.closesAt)
  // Date senza fuso: un giorno ancora "oggi" in Italia resta aperto
  return !closesAt || closesAt.slice(0, 10) >= romeDate(now)
}

export function incentiveText(inc: Incentive): string {
  const regions = inc[F.regions]
  const line = (label: string, value: string | undefined) => value && `${label}: ${value}`
  return [
    line('Titolo', field(inc, F.title)),
    line('Soggetto concedente', field(inc, F.grantor)),
    line('Data di apertura', field(inc, F.opensAt)),
    line('Data di chiusura', field(inc, F.closesAt)),
    line('Note su apertura e chiusura', field(inc, F.datesNote)),
    line('Dotazione finanziaria (euro)', field(inc, F.budget)),
    line('Agevolazione concedibile', amountRange(inc, F.grantMin, F.grantMax)),
    line('Spesa ammessa', amountRange(inc, F.costMin, F.costMax)),
    line('Soggetti ammessi', field(inc, F.subjects)),
    line('Forma di agevolazione', field(inc, F.supportForms)),
    line('Costi ammessi', field(inc, F.grantedCosts)),
    line('Finalità', field(inc, F.scopes)),
    line('Settore', field(inc, F.sectors)),
    line('Regioni', Array.isArray(regions) && regions.length >= ALL_REGIONS ? 'tutte le regioni italiane' : field(inc, F.regions)),
    line('Comuni', field(inc, F.comuni)),
    line('Ambito territoriale', field(inc, F.territories)),
    line('Link al bando', field(inc, F.link)),
    field(inc, F.body) && `\n${htmlToText(field(inc, F.body)!)}`,
  ]
    .filter(Boolean)
    .join('\n')
}

// L'indice non filtra su questi campi: si scarica tutto il catalogo coi soli
// campi utili e si filtra qui. Il testo esce già dall'elenco.
function incentiviGov(): RadarSource {
  return {
    slug: 'incentivi-gov',
    refreshDays: 0,
    complete: true,
    async fetchListing() {
      const params = new URLSearchParams({
        q: 'index_id:incentivi',
        wt: 'json',
        rows: '20000',
        fl: Object.values(F).join(','),
      })
      const res = await fetch(`${INCENTIVI}/solr/coredrupal/select?${params}`, { signal: AbortSignal.timeout(60_000) })
      if (!res.ok) throw new Error(`incentivi.gov.it ha risposto ${res.status}`)
      const docs = ((await res.json()) as { response?: { docs?: Incentive[] } }).response?.docs
      if (!docs) throw new Error('incentivi.gov.it non ha restituito bandi')

      const now = new Date()
      const listings = new Map<string, Listing>()
      for (const inc of docs) {
        const id = field(inc, F.id)
        const path = field(inc, F.path)
        if (id && path && !listings.has(id) && isOpenToPugliaBusinesses(inc, now)) {
          listings.set(id, { externalId: id, url: `${INCENTIVI}${path}`, content: incentiveText(inc) })
        }
      }
      return [...listings.values()]
    },
  }
}

// ---------- Regione Puglia ----------

const PUGLIA = 'https://www.regione.puglia.it'
// La lista che la pagina "Bandi e avvisi" carica dentro di sé: un frammento
// HTML, dal più recente, PAGE_SIZE voci per pagina
const PORTLET = 'RicercaNews_INSTANCE_4CYftWJNTppj'
const PAGE_SIZE = 60
// 180 voci: la lista risale ad anni fa e un bando aperto raramente è più vecchio
const MAX_PAGES = 3
const listPage = (page: number) =>
  `${PUGLIA}/bandi-e-avvisi?p_p_id=${PORTLET}&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view`
  + '&p_p_resource_id=%2Fricerca%2Fnews%2Fnews-list&p_p_cacheability=cacheLevelPage'
  + `&_${PORTLET}_cur=${page}&_${PORTLET}_delta=${PAGE_SIZE}`
// Concorsi per il personale, pubblicati nella stessa lista
const SKIPPED_SECTIONS = ['concorsi']

const decode = (v: string) => v.replace(/&amp;/g, '&')
const DOCUMENT_LINK = new RegExp(`href="((?:${PUGLIA.replace(/\./g, '\\.')})?/documents/[^"]+)"`, 'g')

// Voci di una pagina della lista; quelle chiuse restano, segnate
export function parsePugliaListing(fragment: string): { listings: Listing[], items: number } {
  const items = fragment.split('news-list-item').slice(1)
  const listings: Listing[] = []
  for (const item of items) {
    const href = /href="([^"]+)"/.exec(item)?.[1]
    if (!href || !URL.canParse(decode(href), PUGLIA)) continue
    const url = new URL(decode(href), PUGLIA)
    if (url.origin !== PUGLIA) continue
    const section = /^\/web\/([^/]+)\//.exec(url.pathname)?.[1]
    if (section && SKIPPED_SECTIONS.includes(section)) continue
    const badge = /class="badge[^"]*">([\s\S]*?)<\/span>/.exec(item)?.[1]
    const closed = badge?.replace(/\s+/g, ' ').trim().toLowerCase() === 'bando chiuso'
    listings.push({ externalId: safeDecode(url.pathname), url: url.toString(), ...(closed && { closed }) })
  }
  return { listings, items: items.length }
}

// Testo dell'area principale della pagina e PDF che collega
function parsePugliaDetail(html: string): { content: string, attachmentUrls: string[] } {
  const main = innerHtml(html, 'id="main-content"') ?? html
  const urls = new Set<string>()
  for (const [, href] of main.matchAll(DOCUMENT_LINK)) {
    const url = new URL(decode(href!), PUGLIA)
    if (isPdfLink(url.toString())) urls.add(url.toString())
  }
  return { content: htmlToText(main), attachmentUrls: [...urls] }
}

function regionePuglia(): RadarSource {
  return {
    slug: 'regione-puglia',
    // Pagina e PDF costano: un bando già letto si ricontrolla ogni settimana
    refreshDays: 7,
    // Si leggono solo le voci più recenti: chi esce dalla finestra non è
    // per forza chiuso, conta solo il segno "Bando chiuso"
    complete: false,
    async fetchListing() {
      const listings = new Map<string, Listing>()
      for (let page = 1; page <= MAX_PAGES; page++) {
        const parsed = parsePugliaListing(await fetchSourcePage(listPage(page), PUGLIA))
        for (const l of parsed.listings) if (!listings.has(l.externalId)) listings.set(l.externalId, l)
        if (parsed.items < PAGE_SIZE) break
      }
      return [...listings.values()]
    },
    async fetchContent(listing) {
      const { content, attachmentUrls } = parsePugliaDetail(await fetchSourcePage(listing.url, PUGLIA))
      if (!content) throw new Error(`Pagina vuota: ${listing.url}`)
      return withAttachments(content, attachmentUrls, PUGLIA)
    },
  }
}

// ---------- Sistema Puglia ----------

const SISTEMA = 'https://www.sistema.puglia.it'
// "Bandi aperti" del motore di ricerca del portale (fase 2): tutti in una pagina
const SISTEMA_LIST = `${SISTEMA}/portal/pls/portal/SISPUGLIA.RPT_MOTORE_RICERCA_BANDI.show?p_arg_names=p_testo&p_arg_values=&p_arg_names=p_fase&p_arg_values=2`

// Il portale linka sé stesso un po' in http e un po' in https
const sistemaUrl = (href: string) => {
  const url = new URL(decode(href), SISTEMA)
  if (url.hostname === 'www.sistema.puglia.it' || url.hostname === 'sistema.puglia.it') {
    url.protocol = 'https:'
    url.hostname = 'www.sistema.puglia.it'
  }
  return url
}

export function parseSistemaListing(html: string): Listing[] {
  const listings = new Map<string, Listing>()
  for (const [, href] of html.matchAll(/<a\s+title="vai alla pagina di[^"]*"\s+href="([^"]+)"/gi)) {
    const url = sistemaUrl(href!)
    if (url.origin !== SISTEMA) continue
    const id = safeDecode(url.pathname.split('/').filter(Boolean).at(-1) ?? url.pathname).toLowerCase()
    if (!listings.has(id)) listings.set(id, { externalId: id, url: url.toString() })
  }
  return [...listings.values()]
}

// La pagina di un avviso è una cornice: la scheda di sintesi sta
// nell'iframe DYN_DETTAGLIO_DOC (gli altri sono immagini di servizio)
export function sistemaFrame(page: string): string | undefined {
  const frames = [...page.matchAll(/<iframe[^>]+src="([^"]+)"/gi)].map(m => m[1]!)
  return frames.find(f => /dettaglio_doc/i.test(f)) ?? frames.find(f => !/\.(gif|png|jpe?g|svg)(\?|$)/i.test(f))
}

function sistemaPuglia(): RadarSource {
  return {
    slug: 'sistema-puglia',
    refreshDays: 7,
    complete: true,
    async fetchListing() {
      return parseSistemaListing(await fetchSourcePage(SISTEMA_LIST, SISTEMA))
    },
    async fetchContent(listing) {
      const page = await fetchSourcePage(listing.url, SISTEMA)
      const src = sistemaFrame(page)
      const frame = src && sistemaUrl(src)
      const html = frame && frame.origin === SISTEMA ? await fetchSourcePage(frame.toString(), SISTEMA) : page
      const content = htmlToText(html)
      if (!content) throw new Error(`Pagina vuota: ${listing.url}`)
      return content
    },
  }
}

// ---------- Puglia Sviluppo ----------

// Le pagine per tipo di finanziamento; dentro, elenchi per dimensione
// d'impresa e poi le misure
const PUGLIA_SVILUPPO_PAGES = [
  'finanziamenti-per-la-creazione-di-impresa',
  'finanziamenti-per-lo-sviluppo-aziendale',
  'finanziamenti-per-lo-sviluppo-aziendale-nel-settore-turistico',
  'finanziamenti-straordinari',
  'internazionalizzazione-e-attrazione-investimenti',
  'step',
  'Just-Transition-Fund-Avvisi-per-la-provincia-di-Taranto',
].map(p => `https://pugliasviluppo.eu/it/${p}`)

const pugliaSviluppo = (picker: LinkPicker) => crawlSource(
  { slug: 'puglia-sviluppo', startUrls: PUGLIA_SVILUPPO_PAGES, maxDepth: 2, maxCalls: 40 },
  picker,
)

// ---------- comuni ----------

// Dalla home del sito istituzionale: il modello trova gli elenchi di avvisi
// e notizie, e da lì i bandi per le imprese
const comune = (istat: string, site: string, picker: LinkPicker) => crawlSource(
  { slug: comuneSlug(istat), startUrls: [site], maxDepth: 2, maxCalls: 15 },
  picker,
)

// ---------- moduli ----------

// Le fonti della ricerca scelta: i moduli spuntati, per i comuni tutti
// quelli delle province scelte
export function radarSources(search: Pick<RadarSearch, 'groups' | 'provinces'>, picker: LinkPicker): RadarSource[] {
  const sources: RadarSource[] = []
  if (search.groups.includes('governo')) sources.push(incentiviGov())
  if (search.groups.includes('regione')) sources.push(regionePuglia(), sistemaPuglia(), pugliaSviluppo(picker))
  if (search.groups.includes('comuni')) {
    for (const c of comuniOf(search.provinces)) sources.push(comune(c.istat, c.site, picker))
  }
  return sources
}
