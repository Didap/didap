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

// Il file del bando per Claude Code: dati in YAML e testo del bando
export async function readGrantText(sql: postgres.Sql, id: string): Promise<string> {
  const { grant, content, profile } = await readGrantDocument(sql, id)
  return grantExport(grant, content, profile)
}

export type ToolContent = { type: 'text', text: string } | { type: 'image', data: string, mimeType: string }

export const MAX_TOOL_TEXT = 100_000
const CUT_NOTE = '\n\n[Testo tagliato: il file è più lungo]'
const NO_PDF_TEXT = 'PDF senza testo leggibile (forse una scansione): aprilo dal pannello.'

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const TEXT_EXTENSIONS = /\.(md|csv|json)$/i

const cut = (text: string) => (text.length > MAX_TOOL_TEXT ? `${text.slice(0, MAX_TOOL_TEXT)}${CUT_NOTE}` : text)
const asText = (text: string): ToolContent[] => [{ type: 'text', text }]

// Un file della cartella in una forma che Claude legge: testo, PDF a pagine,
// immagine; il resto solo descritto. 404 se il file non è di quel bando.
export async function readGrantFile(
  sql: postgres.Sql,
  store: FileStore,
  grantId: string,
  fileId: string,
  extract: (data: Buffer) => Promise<string[]> = pdfPages,
): Promise<ToolContent[]> {
  const { name, mime, storeKey } = await readFileEntry(sql, grantId, fileId)
  const type = mime.toLowerCase().split(';')[0]!.trim()
  const data = await store.get(storeKey)

  if (IMAGE_MIMES.has(type)) return [{ type: 'image', data: data.toString('base64'), mimeType: type }]

  if (type === 'application/pdf' || /\.pdf$/i.test(name)) {
    let pages: string[]
    try {
      pages = await extract(data)
    }
    catch (err) {
      console.warn(`[mcp] PDF illeggibile: ${name}`, err)
      pages = []
    }
    const text = pages
      .map((page, i) => (page.trim() ? `${pageMarker(name, i + 1)}\n${page.trim()}` : ''))
      .filter(Boolean)
      .join('\n\n')
    return asText(text ? cut(text) : NO_PDF_TEXT)
  }

  if (type.startsWith('text/') || type === 'application/json' || TEXT_EXTENSIONS.test(name)) {
    return asText(cut(data.toString('utf8')))
  }

  const kb = Math.max(1, Math.round(data.length / 1024))
  return asText(`File "${name}" (${type || 'tipo sconosciuto'}, ${kb} KB): Claude non lo legge da qui, aprilo dal pannello.`)
}
