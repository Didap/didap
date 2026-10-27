import { z } from 'zod'
import { comuneByIstat, COMUNI_PUGLIA } from './comuni-puglia'
import { romeYear } from './dates'
import { formatDecimal, formatWholeEuro } from './money'
import { mergeSection } from './settings'

// Radar bandi: dove cercare (governo, regione, comuni), parametri
// dell'azienda (Didap o un'altra) con cui si valutano i bandi, e
// impostazioni della mail di riepilogo.

export const PROVINCES = [
  { value: 'BA', label: 'Bari' },
  { value: 'BT', label: 'Barletta-Andria-Trani' },
  { value: 'BR', label: 'Brindisi' },
  { value: 'FG', label: 'Foggia' },
  { value: 'LE', label: 'Lecce' },
  { value: 'TA', label: 'Taranto' },
] as const

export const LEGAL_FORMS = [
  { value: 'ditta_individuale', label: 'Ditta individuale' },
  { value: 'libero_professionista', label: 'Libero professionista' },
  { value: 'societa_persone', label: 'Società di persone (snc, sas)' },
  { value: 'societa_capitali', label: 'Società di capitali (srl, spa)' },
  { value: 'cooperativa', label: 'Cooperativa' },
  { value: 'da_costituire', label: 'Impresa da costituire' },
] as const

export const WEEKDAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sab' },
  { value: 7, label: 'Dom' },
] as const

type Values<T extends readonly { value: unknown }[]> = T[number]['value']
export type LegalForm = Values<typeof LEGAL_FORMS>
export type Province = Values<typeof PROVINCES>

// Comuni per provincia, per i conteggi del pannello e le fonti
export const comuniOf = (provinces: readonly string[]) => COMUNI_PUGLIA.filter(c => provinces.includes(c.province))

const valuesOf = <T extends readonly { value: string }[]>(list: T) =>
  list.map(i => i.value) as unknown as [Values<T>, ...Values<T>[]]

const euro = z.number().int().min(0).max(10_000_000_000).nullable()

// Un campo lasciato vuoto (null) rende "da verificare" i requisiti che lo usano
export const radarProfileSchema = z
  .object({
    // Cosa fa l'azienda, in poche parole: il modello giudica i bandi su questo
    description: z.string().trim().max(500),
    revenue: euro,
    employees: z.number().int().min(0).max(1_000_000).nullable(),
    foundedYear: z.number().int().min(1800).max(2100).nullable(),
    legalForm: z.enum(valuesOf(LEGAL_FORMS)),
    province: z.enum(valuesOf(PROVINCES)),
    ateco: z.string().trim().regex(/^(\d{2}(\.\d{1,2}){0,2})?$/, 'Codice ATECO non valido'),
    founderAge: z.number().int().min(16).max(120).nullable(),
    femaleLed: z.boolean(),
    projectMonths: z.number().int().min(1).max(240).nullable(),
    investment: euro,
  })
  .strict()

// I tre moduli di fonti, importabili insieme o uno alla volta
export const SOURCE_GROUPS = [
  { value: 'governo', label: 'Governo', hint: 'Incentivi.gov.it' },
  { value: 'regione', label: 'Regione', hint: 'Regione Puglia, Sistema Puglia, Puglia Sviluppo' },
  { value: 'comuni', label: 'Comuni', hint: 'Tutti i comuni delle province scelte' },
] as const

export type SourceGroup = Values<typeof SOURCE_GROUPS>


export const radarSearchSchema = z
  .object({
    groups: z.array(z.enum(valuesOf(SOURCE_GROUPS))).max(SOURCE_GROUPS.length),
    // Del modulo comuni si leggono tutti i comuni di queste province
    provinces: z.array(z.enum(valuesOf(PROVINCES))).max(PROVINCES.length),
    // Solo bandi per sviluppo IT, IA o servizi digitali
    digitalOnly: z.boolean(),
  })
  .strict()

export const radarNotifySchema = z
  .object({
    enabled: z.boolean(),
    emails: z.array(z.string().trim().email('Indirizzo non valido').max(200)).max(5, 'Massimo 5 destinatari'),
    weekdays: z.array(z.number().int().min(1).max(7)).max(7),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict()

export const radarSettingsSchema = z
  .object({ search: radarSearchSchema, profile: radarProfileSchema, notify: radarNotifySchema })
  .strict()
  .superRefine((s, ctx) => {
    if (s.notify.enabled && !s.notify.emails.length) {
      ctx.addIssue({ code: 'custom', path: ['notify', 'emails'], message: 'Aggiungi un destinatario o spegni l\'invio' })
    }
  })

export type RadarSearch = z.infer<typeof radarSearchSchema>
export type RadarProfile = z.infer<typeof radarProfileSchema>
export type RadarNotify = z.infer<typeof radarNotifySchema>
export type RadarSettings = z.infer<typeof radarSettingsSchema>

export const DEFAULT_RADAR_SETTINGS: RadarSettings = {
  search: { groups: ['governo', 'regione'], provinces: [], digitalOnly: true },
  profile: {
    description: 'Software house: siti web, app, software su misura e soluzioni di intelligenza artificiale',
    revenue: null,
    employees: null,
    foundedYear: null,
    legalForm: 'societa_capitali',
    province: 'BA',
    ateco: '',
    founderAge: null,
    femaleLed: false,
    projectMonths: null,
    investment: null,
  },
  notify: { enabled: true, emails: [], weekdays: [1, 2, 3, 4, 5], time: '08:00' },
}

// Ricerche salvate quando i comuni si spuntavano uno a uno: diventano le
// province di quei comuni
function withProvinces(search: unknown): unknown {
  if (!search || typeof search !== 'object') return search
  const s = search as { provinces?: unknown, comuni?: unknown }
  if (s.provinces !== undefined || !Array.isArray(s.comuni)) return search
  const provinces = new Set(s.comuni.map(c => comuneByIstat(String(c))?.province).filter(Boolean))
  return { ...s, provinces: PROVINCES.map(p => p.value).filter(p => provinces.has(p)) }
}

// Come le impostazioni dei preventivi: i campi non validi tornano ai default
export function parseRadarSettings(data: unknown): RadarSettings {
  const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  return {
    search: mergeSection(radarSearchSchema.shape, withProvinces(source.search), DEFAULT_RADAR_SETTINGS.search),
    profile: mergeSection(radarProfileSchema.shape, source.profile, DEFAULT_RADAR_SETTINGS.profile),
    notify: mergeSection(radarNotifySchema.shape, source.notify, DEFAULT_RADAR_SETTINGS.notify),
  }
}

// Requisiti di ammissione letti dal bando. I parametri dipendono dal tipo:
// region { regions, provinces } · revenue, employees, founder_age,
// investment { min, max } · company_age { minYears, maxYears } ·
// legal_form { allowed } · ateco { include, exclude } · project_duration
// { minMonths, maxMonths } · female_led {} · other {}
export const REQUIREMENT_KINDS = [
  'region',
  'revenue',
  'employees',
  'company_age',
  'legal_form',
  'ateco',
  'founder_age',
  'female_led',
  'project_duration',
  'investment',
  'other',
] as const

export type RequirementKind = (typeof REQUIREMENT_KINDS)[number]

export type RequirementParams = {
  regions?: string[]
  provinces?: string[]
  min?: number
  max?: number
  minYears?: number
  maxYears?: number
  minMonths?: number
  maxMonths?: number
  allowed?: LegalForm[]
  include?: string[]
  exclude?: string[]
}

export type Requirement = {
  kind: RequirementKind
  params: RequirementParams
  label: string
  quote: string
  page: number | null
}

export type Outcome = 'met' | 'not_met' | 'to_verify'
export type Evaluation = { outcome: Outcome, reason: string }
export type Eligibility = 'eligible' | 'to_verify' | 'excluded'

export const ELIGIBILITY_LABELS: Record<Eligibility, string> = {
  eligible: 'Candidabile',
  to_verify: 'Da verificare',
  excluded: 'Escluso',
}

// L'icona di un bando: l'esito come se fosse un requisito
export const ELIGIBILITY_OUTCOME: Record<Eligibility, Outcome> = { eligible: 'met', to_verify: 'to_verify', excluded: 'not_met' }

export const ELIGIBILITY_PLURALS: Record<Eligibility, string> = {
  eligible: 'Candidabili',
  to_verify: 'Da verificare',
  excluded: 'Esclusi',
}

const met = (reason: string): Evaluation => ({ outcome: 'met', reason })
const notMet = (reason: string): Evaluation => ({ outcome: 'not_met', reason })
const toVerify = (reason: string): Evaluation => ({ outcome: 'to_verify', reason })

// Valore dell'azienda dentro [min, max] (estremi inclusi)
function range(
  value: number | null,
  min: number | undefined,
  max: number | undefined,
  show: (n: number) => string,
  missing: string,
): Evaluation {
  if (min === undefined && max === undefined) return toVerify('Limiti non chiari, da leggere nel bando')
  if (value === null) return toVerify(missing)
  if (min !== undefined && value < min) return notMet(`${show(value)}, sotto il minimo di ${show(min)}`)
  if (max !== undefined && value > max) return notMet(`${show(value)}, oltre il massimo di ${show(max)}`)
  return met(`${show(value)}, nei limiti`)
}

// Codici ATECO gerarchici per cifre: "62" comprende "62.01", "63.1" comprende "63.11"
const atecoMatches = (code: string, prefix: string) => prefix !== '' && code.startsWith(prefix)

const years = (n: number) => (n === 1 ? '1 anno' : `${n} anni`)
const months = (n: number) => (n === 1 ? '1 mese' : `${n} mesi`)

export function evaluateRequirement(req: Requirement, profile: RadarProfile, now: Date): Evaluation {
  const p = req.params
  switch (req.kind) {
    case 'region': {
      const regions = p.regions ?? []
      const provinces = p.provinces ?? []
      // Il modello può scrivere "Regione Puglia" o "PUGLIA"
      if (regions.length && !regions.some(r => r.toLowerCase().includes('puglia'))) {
        return notMet(`Riservato a: ${regions.join(', ')}`)
      }
      if (provinces.length && !provinces.includes(profile.province)) {
        return notMet(`Riservato alle province: ${provinces.join(', ')}`)
      }
      if (!regions.length && !provinces.length) return toVerify('Territorio non chiaro')
      return met('Territorio ammesso')
    }
    case 'revenue':
      return range(profile.revenue, p.min, p.max, n => `Fatturato ${formatWholeEuro(n)}`, 'Manca il fatturato nei parametri')
    case 'employees':
      return range(profile.employees, p.min, p.max, n => `${formatDecimal(n)} dipendenti`, 'Manca il numero di dipendenti')
    case 'investment':
      // Oltre il massimo si può comunque partecipare: il contributo si ferma al
      // tetto. Con il solo massimo quindi non c'è un limite che escluda.
      return range(
        profile.investment,
        p.min ?? (p.max === undefined ? undefined : 0),
        undefined,
        n => `Investimento ${formatWholeEuro(n)}`,
        'Manca l\'investimento previsto',
      )
    case 'founder_age':
      return range(profile.founderAge, p.min, p.max, n => `Titolare di ${years(n)}`, 'Manca l\'età del titolare')
    case 'project_duration':
      return range(profile.projectMonths, p.minMonths, p.maxMonths, n => `Progetto di ${months(n)}`, 'Manca la durata del progetto')
    case 'company_age': {
      const age = profile.legalForm === 'da_costituire'
        ? 0
        : profile.foundedYear === null ? null : Math.max(0, romeYear(now) - profile.foundedYear)
      const show = (n: number) => (n === 0 ? 'Impresa nuova' : `Impresa di ${years(n)}`)
      return range(age, p.minYears, p.maxYears, show, 'Manca l\'anno di costituzione')
    }
    case 'legal_form': {
      const allowed = p.allowed ?? []
      if (!allowed.length) return toVerify('Forme giuridiche non chiare')
      const label = LEGAL_FORMS.find(f => f.value === profile.legalForm)!.label
      return allowed.includes(profile.legalForm) ? met(`${label}: ammessa`) : notMet(`${label}: non ammessa`)
    }
    case 'ateco': {
      const include = p.include ?? []
      const exclude = p.exclude ?? []
      if (!include.length && !exclude.length) return toVerify('Codici ATECO non chiari')
      if (!profile.ateco) return toVerify('Manca il codice ATECO')
      if (exclude.some(c => atecoMatches(profile.ateco, c))) return notMet(`ATECO ${profile.ateco} escluso`)
      if (include.length && !include.some(c => atecoMatches(profile.ateco, c))) {
        return notMet(`ATECO ${profile.ateco} non tra quelli ammessi`)
      }
      return met(`ATECO ${profile.ateco} ammesso`)
    }
    case 'female_led':
      return profile.femaleLed ? met('Impresa femminile') : notMet('Riservato alle imprese femminili')
    default:
      return toVerify('Da verificare a mano')
  }
}

export function evaluateGrant(requirements: Requirement[], profile: RadarProfile, now: Date) {
  const evaluations = requirements.map(r => evaluateRequirement(r, profile, now))
  const eligibility: Eligibility = evaluations.some(e => e.outcome === 'not_met')
    ? 'excluded'
    : evaluations.some(e => e.outcome === 'to_verify') ? 'to_verify' : 'eligible'
  return { eligibility, evaluations }
}

// Come si presenta la domanda: piattaforma e documenti da caricare
export type Application = {
  platform: string
  documents: { name: string, format: string, notes: string }[]
}

// Giudizio del modello: Didap (col profilo salvato) può candidarsi?
export type Verdict = 'yes' | 'no' | 'maybe'

export const VERDICT_LABELS: Record<Verdict, string> = {
  yes: 'Potete candidarvi',
  no: 'Non potete candidarvi',
  maybe: 'Da capire',
}

// Bando come lo vedono il pannello e la mail
export type RadarGrant = {
  id: string
  source: string
  url: string
  // Sviluppo IT, IA o servizi digitali; null se il modello non l'ha detto
  digital: boolean | null
  verdict: Verdict | null
  verdictReason: string
  title: string
  issuer: string
  summary: string
  opensAt: string | null
  deadline: string | null
  maxAmount: number | null
  funding: string
  requirements: Requirement[]
  application: Application | null
  notifiedAt: string | null
  // Segnato come interessante per noi
  liked: boolean
  // Cartella del bando: creata, riempita coi file del bando (false con
  // hasFolder: riempimento fallito o interrotto, si può riprovare), in
  // riempimento, l'ultimo finito con un errore, e com'è andato (PDF
  // mancanti, errore)
  hasFolder: boolean
  folderFilled: boolean
  folderFilling: boolean
  folderFailed: boolean
  folderNote: string
  // Chiuso o scaduto: si vede solo se ha la cartella
  closed: boolean
  createdAt: string
}

// I requisiti letti li valuta il codice coi parametri; il giudizio del
// modello pesa di più: decide i casi che il codice lascia aperti ("altro",
// dati mancanti), esclude per motivi che il codice non vede e, se ha dubbi,
// lascia da verificare anche un bando senza requisiti espliciti. Senza
// giudizio (non ancora dato) conta solo il codice.
export function evaluateRadarGrant(g: RadarGrant, profile: RadarProfile, now: Date) {
  const { eligibility: byRules, evaluations } = evaluateGrant(g.requirements, profile, now)
  let eligibility: Eligibility = byRules
  if (byRules === 'excluded' || g.verdict === 'no') eligibility = 'excluded'
  else if (g.verdict === 'yes') eligibility = 'eligible'
  else if (g.verdict === 'maybe') eligibility = 'to_verify'
  return { eligibility, evaluations }
}

export type EvaluatedGrant = RadarGrant & ReturnType<typeof evaluateGrant>

// ---------- fonti ----------

export const SOURCE_LABELS: Record<string, string> = {
  'incentivi-gov': 'Incentivi.gov.it',
  'regione-puglia': 'Regione Puglia',
  'sistema-puglia': 'Sistema Puglia',
  'puglia-sviluppo': 'Puglia Sviluppo',
}

const COMUNE_PREFIX = 'comune-'
export const comuneSlug = (istat: string) => `${COMUNE_PREFIX}${istat}`

export function sourceGroup(slug: string): SourceGroup {
  if (slug.startsWith(COMUNE_PREFIX)) return 'comuni'
  return slug === 'incentivi-gov' ? 'governo' : 'regione'
}

export function sourceLabel(slug: string): string {
  if (slug.startsWith(COMUNE_PREFIX)) {
    const comune = comuneByIstat(slug.slice(COMUNE_PREFIX.length))
    return comune ? `Comune di ${comune.name}` : slug
  }
  return SOURCE_LABELS[slug] ?? slug
}

// Dentro la ricerca scelta a sinistra: modulo spuntato (per i comuni, il
// comune spuntato) e, con "Solo digitali", niente bandi su altro (trattori,
// macchinari, film...). Quelli senza risposta del modello si vedono.
export function isInScope(g: Pick<RadarGrant, 'source' | 'digital'>, search: RadarSearch): boolean {
  const group = sourceGroup(g.source)
  if (!search.groups.includes(group)) return false
  if (group === 'comuni') {
    const province = comuneByIstat(g.source.slice(COMUNE_PREFIX.length))?.province
    if (!province || !search.provinces.includes(province as Province)) return false
  }
  return !search.digitalOnly || g.digital !== false
}

// Va nella prossima mail: mai mandato e non escluso dai parametri. Cambiare
// i parametri può rendere candidabile un bando già visto: parte allora.
export const isDigestCandidate = (g: EvaluatedGrant) => !g.notifiedAt && g.eligibility !== 'excluded'

export type RadarStatus = {
  lastIngestAt: string | null
  lastIngestError: string | null
  lastDigestAt: string | null
  running: boolean
  pending: number
  llmConfigured: boolean
  emailConfigured: boolean
  filesConfigured: boolean
}

// Un riempimento della cartella in corso da più di così è morto col
// processo: si può rifare. Il caso peggiore di uno vivo è sui 15 minuti
// (pagina con un nuovo tentativo, poi tre giri di 4 PDF a timeout pieno più
// il caricamento): il doppio, perché un lavoro ancora in corso non si rifaccia
export const FOLDER_CLAIM_MINUTES = 30

// Risposta di "Crea cartella del bando": già riempita, o partita in background
export type FolderStart = { status: 'ready' } | { status: 'filling' }

// Il titolo per i nomi dei file del bando: "Voucher digitale: PMI" ->
// "voucher-digitale-pmi", senza accenti, al massimo 60 caratteri ('' se
// non resta niente: chi lo usa mette l'id)
export const titleSlug = (title: string) => title
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 60)
  .replace(/-$/, '')

// ---------- registro degli import ----------

export type TokenUsage = { calls: number, input: number, output: number, cacheWrite: number, cacheRead: number }

export const emptyUsage = (): TokenUsage => ({ calls: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 })

export type RunStats = {
  // Voci trovate nelle fonti, testi nuovi o cambiati da leggere
  listed: number
  queued: number
  // Testi letti dal modello, di cui bandi per imprese
  read: number
  grants: number
  // Bandi giudicati col profilo
  judged: number
  errors: string[]
}

export const emptyStats = (): RunStats => ({ listed: 0, queued: 0, read: 0, grants: 0, judged: 0, errors: [] })

export type RadarRun = {
  id: string
  // ripresa: coda rimasta dal giro prima; profilo: rigiudizio dopo un cambio
  trigger: 'manuale' | 'automatico' | 'ripresa' | 'profilo'
  groups: SourceGroup[]
  provinces: string[]
  status: 'running' | 'done' | 'failed'
  startedAt: string
  finishedAt: string | null
  model: string
  stats: RunStats
  usage: TokenUsage
  error: string | null
}

// Dollari per milione di token: input, output. La scrittura in cache costa
// 1,25 volte l'input, la lettura un decimo.
const PRICES: Record<string, [number, number]> = {
  'claude-haiku-5-5': [0.10, 0.50],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
}

// Costo stimato in dollari; null per un modello senza prezzo in tabella
export function usageCost(model: string, u: TokenUsage): number | null {
  const price = PRICES[model]
  if (!price) return null
  const [input, output] = price
  return (u.input * input + u.cacheWrite * input * 1.25 + u.cacheRead * input * 0.1 + u.output * output) / 1_000_000
}
