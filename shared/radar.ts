import { z } from 'zod'
import { romeYear } from './dates'
import { formatDecimal, formatWholeEuro } from './money'
import { mergeSection } from './settings'

// Radar bandi: parametri dell'azienda (Didap o un'altra) con cui si
// valutano i bandi, e impostazioni della mail di riepilogo.

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

const valuesOf = <T extends readonly { value: string }[]>(list: T) =>
  list.map(i => i.value) as unknown as [Values<T>, ...Values<T>[]]

const euro = z.number().int().min(0).max(10_000_000_000).nullable()

// Un campo lasciato vuoto (null) rende "da verificare" i requisiti che lo usano
export const radarProfileSchema = z
  .object({
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

export const radarNotifySchema = z
  .object({
    enabled: z.boolean(),
    emails: z.array(z.string().trim().email('Indirizzo non valido').max(200)).max(5, 'Massimo 5 destinatari'),
    weekdays: z.array(z.number().int().min(1).max(7)).max(7),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict()

export const radarSettingsSchema = z
  .object({ profile: radarProfileSchema, notify: radarNotifySchema })
  .strict()
  .superRefine((s, ctx) => {
    if (s.notify.enabled && !s.notify.emails.length) {
      ctx.addIssue({ code: 'custom', path: ['notify', 'emails'], message: 'Aggiungi un destinatario o spegni l\'invio' })
    }
  })

export type RadarProfile = z.infer<typeof radarProfileSchema>
export type RadarNotify = z.infer<typeof radarNotifySchema>
export type RadarSettings = z.infer<typeof radarSettingsSchema>

export const DEFAULT_RADAR_SETTINGS: RadarSettings = {
  profile: {
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

// Come le impostazioni dei preventivi: i campi non validi tornano ai default
export function parseRadarSettings(data: unknown): RadarSettings {
  const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  return {
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

// Bando come lo vedono il pannello e la mail
export type RadarGrant = {
  id: string
  source: string
  url: string
  title: string
  issuer: string
  summary: string
  opensAt: string | null
  deadline: string | null
  maxAmount: number | null
  funding: string
  requirements: Requirement[]
  notifiedAt: string | null
  createdAt: string
}

export type EvaluatedGrant = RadarGrant & ReturnType<typeof evaluateGrant>

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
}

export const SOURCE_LABELS: Record<string, string> = {
  'regione-puglia': 'Regione Puglia',
  'incentivi-gov': 'Incentivi.gov.it',
}
