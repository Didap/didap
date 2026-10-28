import { createError } from 'h3'
import type postgres from 'postgres'
import { z } from 'zod'
import { romeDate } from '#shared/dates'
import {
  ELIGIBILITY_LABELS,
  evaluateRadarGrant,
  isInScope,
  sourceLabel,
  type Eligibility,
} from '#shared/radar'
import type { FileStore } from './file-store'
import { readFileEntry } from './grant-files'
import { readGrantDocument, listGrants, readRadarSettings } from './radar'
import { grantExport } from './radar-export'
import { pageMarker, pdfPages } from './radar-fetch'

// Le funzioni dei bandi che Claude usa dal connettore: ricerca sul radar,
// testo del bando e file della sua cartella. Niente HTTP qui.

const ESITI = { candidabile: 'eligible', da_verificare: 'to_verify', escluso: 'excluded' } as const satisfies Record<string, Eligibility>
const DEFAULT_ESITI: (keyof typeof ESITI)[] = ['candidabile', 'da_verificare']

const MAX_HITS = 50
const DAY_MS = 86_400_000

export const grantSearchSchema = z.object({
  esito: z.array(z.enum(['candidabile', 'da_verificare', 'escluso'])).optional(),
  soloInteressanti: z.boolean().optional(),
  scadenzaEntroGiorni: z.number().int().min(1).max(365).optional(),
  testo: z.string().max(200).optional(),
  fuoriDallaRicerca: z.boolean().optional(),
})

export type GrantSearch = z.infer<typeof grantSearchSchema>

export type GrantHit = {
  id: string
  titolo: string
  ente: string
  fonte: string
  esito: string
  motivo: string
  sintesi: string
  importoMassimo: number | null
  agevolazione: string
  apertura: string | null
  scadenza: string | null
  interessante: boolean
  cartella: boolean
  chiuso: boolean
  url: string
}

const day = (iso: string | null) => (iso ? romeDate(new Date(iso)) : null)

// I bandi del radar come li vede il pannello: nella ricerca salvata (salvo
// `fuoriDallaRicerca`), valutati col profilo, con i filtri richiesti. Quelli
// con cartella restano anche chiusi. Al massimo 50; `altri` conta il resto.
export async function searchGrants(
  sql: postgres.Sql,
  search: GrantSearch,
  now = new Date(),
): Promise<{ bandi: GrantHit[], altri: number }> {
  const [grants, settings] = await Promise.all([listGrants(sql, now, { withFolders: true }), readRadarSettings(sql)])
  const esiti = new Set<Eligibility>((search.esito?.length ? search.esito : DEFAULT_ESITI).map(e => ESITI[e]))
  const text = search.testo?.trim().toLowerCase()
  const limit = search.scadenzaEntroGiorni === undefined ? null : now.getTime() + search.scadenzaEntroGiorni * DAY_MS

  const found = grants
    .filter(g => search.fuoriDallaRicerca || isInScope(g, settings.search))
    .map(g => ({ g, ...evaluateRadarGrant(g, settings.profile, now) }))
    .filter(({ g, eligibility }) => {
      if (!esiti.has(eligibility)) return false
      if (search.soloInteressanti && !g.liked) return false
      if (text && ![g.title, g.issuer, g.summary].some(v => v.toLowerCase().includes(text))) return false
      // Senza scadenza, o già scaduto, non è "in scadenza entro N giorni"
      if (limit !== null && (!g.deadline || g.closed || new Date(g.deadline).getTime() > limit)) return false
      return true
    })

  const bandi = found.slice(0, MAX_HITS).map(({ g, eligibility }): GrantHit => ({
    id: g.id,
    titolo: g.title,
    ente: g.issuer,
    fonte: sourceLabel(g.source),
    esito: ELIGIBILITY_LABELS[eligibility],
    motivo: g.verdictReason,
    sintesi: g.summary,
    importoMassimo: g.maxAmount,
    agevolazione: g.funding,
    apertura: day(g.opensAt),
    scadenza: day(g.deadline),
    interessante: g.liked,
    cartella: g.hasFolder,
    chiuso: g.closed,
    url: g.url,
  }))
  return { bandi, altri: found.length - bandi.length }
}

// Testo verso Claude a parti di al massimo MAX_TOOL_TEXT caratteri (alcuni
// bandi superano il milione); immagini solo fino a MAX_TOOL_IMAGE_BYTES,
// oltre Claude le rifiuta
export const MAX_TOOL_TEXT = 60_000
export const MAX_TOOL_IMAGE_BYTES = 3_500_000

// I confini delle parti, per unità UTF-16: un'emoji sul confine passa intera
// alla parte dopo, così nessuna parte ha mezza coppia surrogata
function partBounds(text: string): number[] {
  const bounds = [0]
  let start = 0
  while (text.length - start > MAX_TOOL_TEXT) {
    let end = start + MAX_TOOL_TEXT
    const c = text.charCodeAt(end - 1)
    if (c >= 0xD800 && c <= 0xDBFF) end--
    bounds.push(end)
    start = end
  }
  bounds.push(text.length)
  return bounds
}

// La parte `part` (da 1) del testo; un testo vuoto è una parte vuota
export function textPart(text: string, part: number): { text: string, part: number, parts: number } {
  const bounds = partBounds(text)
  const parts = bounds.length - 1
  if (!Number.isInteger(part) || part < 1 || part > parts) {
    throw createError({ statusCode: 400, statusMessage: `Parte ${part} inesistente: il testo ha ${parts} ${parts === 1 ? 'parte' : 'parti'}` })
  }
  return { text: text.slice(bounds[part - 1], bounds[part]), part, parts }
}

// La parte con in testa dove si è e come chiedere la successiva; un testo
// che sta in una parte arriva com'è
function paged(text: string, part: number): string {
  const p = textPart(text, part)
  if (p.parts === 1) return p.text
  const head = p.part === p.parts
    ? `[Parte ${p.part} di ${p.parts}, l'ultima.]`
    : `[Parte ${p.part} di ${p.parts}. Chiedi la parte ${p.part + 1} con parte: ${p.part + 1}.]`
  return `${head}\n\n${p.text}`
}

// Il file del bando per Claude Code: dati in YAML e testo del bando. Dati e
// "Cosa fare" stanno in testa, quindi nella parte 1
export async function readGrantText(sql: postgres.Sql, id: string, part = 1): Promise<string> {
  const { grant, content, profile } = await readGrantDocument(sql, id)
  return paged(grantExport(grant, content, profile), part)
}

export type ToolContent = { type: 'text', text: string } | { type: 'image', data: string, mimeType: string }

const NO_PDF_TEXT = 'PDF senza testo leggibile (forse una scansione): aprilo dal pannello.'

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const TEXT_EXTENSIONS = /\.(md|csv|json)$/i

const asText = (text: string): ToolContent[] => [{ type: 'text', text }]

// Pagine dei PDF già estratte: Claude legge un PDF lungo a parti, e ogni parte
// non riscarica e rianalizza il file. Pochi file per pochi minuti; il file di
// uno store_key non cambia mai
const PDF_CACHE_MAX = 8
const PDF_CACHE_MS = 10 * 60 * 1000
const pdfCache = new Map<string, { pages: string[], at: number }>()

async function cachedPdfPages(
  store: FileStore,
  storeKey: string,
  name: string,
  extract: (data: Buffer) => Promise<string[]>,
): Promise<string[]> {
  const now = Date.now()
  const hit = pdfCache.get(storeKey)
  if (hit && now - hit.at < PDF_CACHE_MS) return hit.pages
  const data = await store.get(storeKey)
  let pages: string[]
  try {
    pages = await extract(data)
  }
  catch (err) {
    console.warn(`[mcp] PDF illeggibile: ${name}`, err)
    return []
  }
  pdfCache.delete(storeKey)
  if (pdfCache.size >= PDF_CACHE_MAX) pdfCache.delete(pdfCache.keys().next().value!)
  pdfCache.set(storeKey, { pages, at: now })
  return pages
}

// Un file della cartella in una forma che Claude legge: testo e PDF a pagine
// (a parti come il bando), immagine; il resto solo descritto. 404 se il file
// non è di quel bando. `part` vale solo per testo e PDF. Il file si scarica
// dallo store solo se Claude lo riceve: la dimensione è nel database
export async function readGrantFile(
  sql: postgres.Sql,
  store: FileStore,
  grantId: string,
  fileId: string,
  extract: (data: Buffer) => Promise<string[]> = pdfPages,
  part = 1,
): Promise<ToolContent[]> {
  const { name, mime, bytes, storeKey } = await readFileEntry(sql, grantId, fileId)
  const type = mime.toLowerCase().split(';')[0]!.trim()
  const kb = Math.max(1, Math.round(bytes / 1024))

  if (IMAGE_MIMES.has(type)) {
    if (bytes > MAX_TOOL_IMAGE_BYTES) {
      return asText(`File "${name}" (${type}, ${kb} KB): immagine troppo grande per Claude, aprila dal pannello.`)
    }
    const data = await store.get(storeKey)
    return [{ type: 'image', data: data.toString('base64'), mimeType: type }]
  }

  if (type === 'application/pdf' || /\.pdf$/i.test(name)) {
    const text = (await cachedPdfPages(store, storeKey, name, extract))
      .map((page, i) => (page.trim() ? `${pageMarker(name, i + 1)}\n${page.trim()}` : ''))
      .filter(Boolean)
      .join('\n\n')
    return asText(paged(text || NO_PDF_TEXT, part))
  }

  if (type.startsWith('text/') || type === 'application/json' || TEXT_EXTENSIONS.test(name)) {
    const data = await store.get(storeKey)
    return asText(paged(data.toString('utf8'), part))
  }

  return asText(`File "${name}" (${type || 'tipo sconosciuto'}, ${kb} KB): Claude non lo legge da qui, aprilo dal pannello.`)
}
