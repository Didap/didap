import { createHash } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { ISO_DATE, romeLocalToDate, romeYear } from '#shared/dates'
import {
  GRANT_KINDS,
  grantKind,
  LEGAL_FORMS,
  PROVINCES,
  REQUIREMENT_KINDS,
  type Application,
  type GrantKind,
  type RadarProfile,
  type Requirement,
  type RequirementParams,
  type TokenUsage,
  type Verdict,
  valuesOf,
} from '#shared/radar'
import DIDAP from '#didap-profile'

// Lettura dei bandi con Claude (Haiku di default, RADAR_LLM_MODEL per
// cambiarlo). Il prompt nasce da quello del Radar Bandi di cityfix, girato
// sulle imprese e sulle gare per servizi digitali.

// Cosa fa l'azienda (server/radar/didap.md), senza l'introduzione per chi
// modifica il file. Sta nel prompt del giudizio, in cache: la lettura
// estrae i fatti del bando e non dipende da chi lo legge
export const COMPANY_PROFILE = DIDAP.slice(DIDAP.indexOf('\n## ') + 1).trim()

// Impronta di un prompt e della forma della risposta: quando cambia, il
// radar rilegge (READER_KEY) o rigiudica (JUDGE_KEY) da solo
const promptKey = (...parts: unknown[]) => createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16)

// Il filtro sul tema, deciso alla lettura del bando
const DIGITAL_RULE = `"digital" is for a software house that builds websites, apps, software and AI solutions: true only if the call funds IT or digital work as its purpose or as one of its main, explicitly named activities: software, web or app development, artificial intelligence, data, cloud, cybersecurity, e-commerce, digital transformation of business processes, digital services or ICT consulting, research and innovation projects in the digital field, calls for innovative or high-tech startups (startup innovative), which usually fund digital products. It is false when the call funds something else, such as machinery, vehicles, tractors or farm equipment, buildings, energy plants, agriculture, tourism facilities, film or audiovisual production, hiring, training, liquidity, guarantees, trade fairs or exports, even if software or digital costs appear as one eligible expense among many.`

const SYSTEM_PROMPT = `You read Italian calls ("bandi", "avvisi", "incentivi", "gare") for a software house based in Puglia, Italy, and extract structured data. Answer with one JSON object and nothing else.

First decide "kind":
- "grant": private businesses apply as beneficiaries and receive something: a grant, a subsidised loan, a voucher, a tax credit, free services.
- "tender": a public body or a public company buys work and companies take part as suppliers: gare d'appalto, procedure aperte o negoziate, affidamenti, avvisi di manifestazione di interesse o indagini di mercato per operatori economici, short list, albi fornitori.

Then decide "admitsCompanies": true only if a private company can take part. For a grant, the text must say that private businesses can apply as beneficiaries: imprese, PMI, micro/piccole/medie imprese, startup, liberi professionisti, lavoratori autonomi, or people who will start a new business (imprese da costituire, aspiranti imprenditori). For a tender, what is bought must be IT or digital work: software, websites, apps, platforms, artificial intelligence, data, cloud, cybersecurity, digital services, ICT consulting or digital training. It is false for calls reserved to public bodies, comuni, schools, universities, associations, private citizens or farmers only; for job contests (concorsi, selezioni di personale, mobilita); for calls where companies give something (sponsors, donors, suppliers of goods for events); for tenders that buy anything else (works, buildings, hardware only, vehicles, cleaning, catering, insurance, services that are not digital). A text that does not say who can take part is false: never assume it. If false, set "digital" and "ai" to false, leave every other field empty (empty strings, null, empty arrays) and stop.

Then decide ${DIGITAL_RULE} A tender with "admitsCompanies" true is always digital.

Then decide "ai": true only if artificial intelligence is an explicit object or one of the main activities of the call: machine learning, generative AI, language models, chatbots or virtual assistants, computer vision, predictive analytics, intelligent automation.

If "digital" is false, leave "requirements" empty and the "application" fields empty: the company will not apply, the rest is enough.

Then return:
{
  "kind": "grant" | "tender",
  "admitsCompanies": true,
  "digital": boolean,
  "ai": boolean,
  "title": string,
  "issuer": string (the body that publishes the call),
  "summary": string (a short summary in Italian, one or two sentences and at most 300 characters: first what the call funds or buys, then who can take part. The total budget of a measure is its "dotazione", never present it as the amount a single company receives),
  "opensAt": string | null (ISO 8601; date only if the call gives no time),
  "deadline": string | null (ISO 8601; date only if the call gives no time; for a tender, the deadline for bids or expressions of interest; null for calls open until funds run out),
  "maxAmount": number | null (in euro: for a grant the maximum a single company can obtain, for a tender the base amount of the contract without VAT),
  "funding": string (in Italian, short: for a grant the form and intensity of the aid, e.g. "Fondo perduto fino al 50% delle spese"; for a tender the procedure and the award criterion, e.g. "Procedura negoziata, offerta economicamente più vantaggiosa"),
  "application": {
    "platform": string (in Italian, short: where and how the application is submitted, e.g. "Procedura telematica su Sistema Puglia", "PEC al Comune", "Piattaforma Invitalia"; empty if the text does not say),
    "documents": [{
      "name": string (in Italian: a document the applicant must submit, e.g. "Domanda di agevolazione", "Business plan", "Preventivi di spesa", "Dichiarazione de minimis"),
      "format": string (file format, template or signature the call requires, e.g. "PDF firmato digitalmente", "Modello Excel allegato al bando"; empty if not said),
      "notes": string (short, empty if nothing to add)
    }] (the documents listed by the call, in its order; empty if it lists none)
  },
  "requirements": [{
    "kind": one of ${JSON.stringify(REQUIREMENT_KINDS)},
    "params": object with every key listed below, null or an empty array for the keys the kind does not use,
    "label": string (short, in Italian, e.g. "Fatturato fino a 2 milioni di euro"),
    "quote": string (the exact sentence of the call that states the requirement, copied verbatim),
    "page": number | null (page of the PDF the quote comes from)
  }]
}

Requirements are the conditions a company must satisfy to be admitted (for a tender, the participation requirements: turnover, similar services already delivered, certifications, registration on MePA), one per item. Leave out generic conditions every regular company meets (being registered, having a VAT number, DURC, no bankruptcy, de minimis declarations) and never emit a requirement that only says companies may apply (e.g. "Soggetti ammessi: Impresa"). Kinds and params:
- "region": the call is limited to some territories. params: {"regions": [Italian region names], "provinces": [two-letter province codes]}. Puglia provinces are ${PROVINCES.map(p => `${p.value} ${p.label}`).join(', ')}. Never emit it for a call open to all of Italy.
- "revenue": annual turnover limits. params: {"min": euro, "max": euro}, either may be missing. Bounds are inclusive.
- "employees": headcount limits. params: {"min": number, "max": number}. "micro impresa" means max 9, "piccola" max 49, "PMI" max 249.
- "company_age": params: {"minYears": number, "maxYears": number}. A call only for companies not yet established is {"maxYears": 0}; "costituite da non oltre 5 anni" is {"maxYears": 5}.
- "legal_form": params: {"allowed": array of ${JSON.stringify(LEGAL_FORMS.map(f => f.value))}}. Only when the call restricts the legal form.
- "ateco": params: {"include": [ATECO codes like "62" or "62.01"], "exclude": [codes]}. Only numeric codes, never section letters: a section or a range becomes every two-digit division in it (section C or "da 10 a 33" is "10", "11", ..., "33").
- "founder_age": age of the owner or of most partners. params: {"min": number, "max": number}; "under 35" is {"max": 35}.
- "female_led": reserved to female-led companies. params: {}.
- "project_duration": params: {"minMonths": number, "maxMonths": number}, the duration the funded project must have.
- "investment": the eligible project cost. params: {"min": euro, "max": euro}.
- "other": any other admission condition. params: {}.

Rules: never invent a value, use null or an empty array when the call does not say. Amounts are plain numbers without separators. Pages are marked in the text as [[file | pagina N]]: use N for "page" when the quote comes from that page, otherwise null.`

const str = z.string().trim().nullish().transform(v => v ?? '')
const num = z.number().finite().nullish().transform(v => (v === null || v === undefined || v < 0 ? undefined : v))
// Senza risposta, o con una risposta strana, resta da capire
const bool = z.boolean().nullish().catch(null).transform(v => v ?? null)
const strList = z
  .array(z.unknown())
  .nullish()
  .transform(v => (v ?? []).filter((s): s is string => typeof s === 'string' && s.trim() !== '').map(s => s.trim()))

const requirementSchema = z.object({
  kind: z.string().transform(k => ((REQUIREMENT_KINDS as readonly string[]).includes(k) ? k : 'other') as Requirement['kind']),
  params: z
    .object({
      regions: strList,
      provinces: strList,
      min: num,
      max: num,
      minYears: num,
      maxYears: num,
      minMonths: num,
      maxMonths: num,
      allowed: strList,
      include: strList,
      exclude: strList,
    })
    .partial()
    .nullish(),
  label: str,
  quote: str,
  page: z.number().int().positive().nullish().catch(null),
})

const KIND_VALUES = valuesOf(GRANT_KINDS)

const grantSchema = z.object({
  kind: z.enum(KIND_VALUES).catch('grant'),
  // Un bando senza tema si mostra
  digital: bool,
  ai: bool,
  title: z.string().trim().min(1),
  issuer: str,
  summary: str,
  opensAt: z.string().nullish(),
  deadline: z.string().nullish(),
  maxAmount: num,
  funding: str,
  requirements: z.array(z.unknown()).nullish().transform(v => v ?? []),
  application: z.unknown().nullish(),
})

const applicationSchema = z.object({
  platform: str,
  documents: z
    .array(z.object({ name: str, format: str, notes: str }).catch({ name: '', format: '', notes: '' }))
    .nullish()
    .transform(v => (v ?? []).filter(d => d.name)),
})

// Piattaforma e documenti; null se il bando non dice nulla
function parseApplication(raw: unknown): Application | null {
  const a = applicationSchema.safeParse(raw)
  if (!a.success || (!a.data.platform && !a.data.documents.length)) return null
  return {
    platform: a.data.platform.slice(0, 300),
    documents: a.data.documents.slice(0, 40).map(d => ({
      name: d.name.slice(0, 300),
      format: d.format.slice(0, 200),
      notes: d.notes.slice(0, 500),
    })),
  }
}

const PROVINCE_CODES = new Set<string>(PROVINCES.map(p => p.value))
const LEGAL_FORM_VALUES = new Set<string>(LEGAL_FORMS.map(f => f.value))
const ATECO = /^\d{2}(\.\d{1,2}){0,2}$/

const whole = (n: number | undefined) => (n === undefined ? undefined : Math.round(n))

// Solo parametri ben formati, nella forma che usa evaluateRequirement
function normalizeParams(raw: z.infer<typeof requirementSchema>['params']): RequirementParams {
  const p = raw ?? {}
  const out: RequirementParams = {}
  const set = <K extends keyof RequirementParams>(key: K, value: RequirementParams[K] | undefined) => {
    if (value !== undefined && !(Array.isArray(value) && !value.length)) out[key] = value
  }
  set('regions', p.regions)
  set('provinces', p.provinces?.map(c => c.toUpperCase()).filter(c => PROVINCE_CODES.has(c)))
  set('min', whole(p.min))
  set('max', whole(p.max))
  set('minYears', whole(p.minYears))
  set('maxYears', whole(p.maxYears))
  set('minMonths', whole(p.minMonths))
  set('maxMonths', whole(p.maxMonths))
  set('allowed', p.allowed?.filter(f => LEGAL_FORM_VALUES.has(f)) as RequirementParams['allowed'])
  set('include', p.include?.filter(c => ATECO.test(c)))
  set('exclude', p.exclude?.filter(c => ATECO.test(c)))
  return out
}

const LOCAL_DATE_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?(?:\.\d+)?$/
const MIDNIGHT = '00:00:00'

// Le date dei bandi sono ora italiana. Senza orario (o a mezzanotte) una
// scadenza vale fino a fine giornata, un'apertura da inizio giornata.
export function parseCallDate(value: string | null | undefined, endOfDay: boolean): Date | null {
  if (!value) return null
  const local = LOCAL_DATE_TIME.exec(value)
  const day = ISO_DATE.test(value) ? value : local?.[1]
  if (!day) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const time = local ? `${local[2]}:${local[3] ?? '00'}` : MIDNIGHT
  return romeLocalToDate(day, time === MIDNIGHT && endOfDay ? '23:59:59' : time)
}

// I cataloghi segnano "fino a esaurimento fondi" con date tipo 31/12/2050:
// oltre dieci anni non è una scadenza vera, il bando è a sportello
const realDeadline = (date: Date | null) =>
  date && date.getTime() - Date.now() < 10 * 365 * 86_400_000 ? date : null

export type GrantReading =
  | { admitsCompanies: false }
  | {
    admitsCompanies: true
    kind: GrantKind
    // Sviluppo IT, IA o servizi digitali; null se il modello non lo dice
    digital: boolean | null
    ai: boolean | null
    title: string
    issuer: string
    summary: string
    opensAt: Date | null
    deadline: Date | null
    maxAmount: number | null
    funding: string
    requirements: Requirement[]
    application: Application | null
  }

// Valida la risposta del modello; lancia se non è una lettura usabile.
// Un requisito malformato si scarta, non fa cadere tutto il bando.
export function parseGrantReading(raw: unknown): GrantReading {
  const { admitsCompanies } = z.object({ admitsCompanies: z.boolean() }).parse(raw)
  if (!admitsCompanies) return { admitsCompanies: false }

  const g = grantSchema.parse(raw)
  const requirements: Requirement[] = []
  for (const item of g.requirements) {
    const r = requirementSchema.safeParse(item)
    if (!r.success) continue
    requirements.push({
      kind: r.data.kind,
      params: normalizeParams(r.data.params),
      label: r.data.label.slice(0, 300) || 'Requisito',
      quote: r.data.quote.slice(0, 2000),
      page: r.data.page ?? null,
    })
  }
  return {
    admitsCompanies: true,
    kind: g.kind,
    digital: g.digital,
    ai: g.ai,
    title: g.title.slice(0, 500),
    issuer: g.issuer.slice(0, 300),
    summary: g.summary.slice(0, 3000),
    opensAt: parseCallDate(g.opensAt, false),
    deadline: realDeadline(parseCallDate(g.deadline, true)),
    maxAmount: g.maxAmount === undefined ? null : Math.round(g.maxAmount),
    funding: g.funding.slice(0, 500),
    requirements,
    application: parseApplication(g.application),
  }
}

export type GrantReader = (doc: { url: string, content: string }) => Promise<GrantReading>

// Il modello non risponde per motivi che non dipendono dal bando (chiave
// sbagliata, servizio giù, rete): si riprova al giro successivo senza
// consumare i tentativi dei bandi in coda (anche quando finiscono i token)
export class ReaderUnavailable extends Error {}

export const hasLlm = () => !!process.env.ANTHROPIC_API_KEY
// Il modello legge fino a qui: i bandi lunghi hanno i requisiti nelle prime pagine
export const llmMaxChars = () => Number(process.env.RADAR_LLM_MAX_CHARS) || 60_000
export const llmModel = () => process.env.RADAR_LLM_MODEL || 'claude-haiku-5-5'

// La forma della risposta, imposta al modello (structured outputs): tutti i
// campi sempre presenti, null o vuoti quando non servono
const nullable = (type: string) => ({ anyOf: [{ type }, { type: 'null' }] })
const STRING = { type: 'string' }
const strings = { type: 'array', items: STRING }
const object = (properties: Record<string, unknown>) =>
  ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties })

const GRANT_SCHEMA = object({
  kind: { type: 'string', enum: KIND_VALUES },
  admitsCompanies: { type: 'boolean' },
  digital: { type: 'boolean' },
  ai: { type: 'boolean' },
  title: STRING,
  issuer: STRING,
  summary: STRING,
  opensAt: nullable('string'),
  deadline: nullable('string'),
  maxAmount: nullable('number'),
  funding: STRING,
  application: object({
    platform: STRING,
    documents: { type: 'array', items: object({ name: STRING, format: STRING, notes: STRING }) },
  }),
  requirements: {
    type: 'array',
    items: object({
      kind: { type: 'string', enum: REQUIREMENT_KINDS },
      params: object({
        regions: strings,
        provinces: strings,
        min: nullable('number'),
        max: nullable('number'),
        minYears: nullable('number'),
        maxYears: nullable('number'),
        minMonths: nullable('number'),
        maxMonths: nullable('number'),
        allowed: { type: 'array', items: { type: 'string', enum: LEGAL_FORMS.map(f => f.value) } },
        include: strings,
        exclude: strings,
      }),
      label: STRING,
      quote: STRING,
      page: nullable('integer'),
    }),
  },
})

export const READER_KEY = promptKey(SYSTEM_PROMPT, GRANT_SCHEMA)

let client: Anthropic | null = null
// L'SDK riprova da solo 429, 529 e 5xx rispettando retry-after
const anthropic = () => (client ??= new Anthropic({ timeout: 120_000, maxRetries: 2 }))

type Ask = {
  system: Anthropic.TextBlockParam[]
  content: string
  schema: Record<string, unknown>
  effort: 'low' | 'medium'
  maxTokens: number
  // Token consumati, sommati qui (il registro degli import)
  usage?: TokenUsage
}

// Una richiesta al modello con risposta JSON nella forma dello schema
async function askLlm({ system, content, schema, effort, maxTokens, usage }: Ask): Promise<unknown> {
  let res: Anthropic.Message
  try {
    res = await anthropic().messages.create({
      model: llmModel(),
      max_tokens: maxTokens,
      system,
      output_config: { effort, format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content }],
    })
  }
  catch (err) {
    // Un timeout può dipendere dal testo (troppo lungo): conta sul bando
    if (err instanceof Anthropic.APIConnectionTimeoutError) throw new Error('Il modello non ha risposto in tempo')
    if (err instanceof Anthropic.APIConnectionError) throw new ReaderUnavailable(`Modello non raggiungibile: ${err.message}`)
    if (err instanceof Anthropic.APIError) {
      const message = `Il modello ha risposto ${err.status}: ${err.message.slice(0, 300)}`
      // Chiave, limiti, servizio giù o credito finito (un 400 senza un tipo
      // suo): non dipende dal bando
      const unavailable = [401, 402, 403, 429].includes(err.status ?? 0) || (err.status ?? 0) >= 500
        || /credit balance/i.test(err.message)
      throw unavailable ? new ReaderUnavailable(message) : new Error(message)
    }
    throw err
  }
  if (usage) {
    usage.calls++
    usage.input += res.usage.input_tokens
    usage.output += res.usage.output_tokens
    usage.cacheWrite += res.usage.cache_creation_input_tokens ?? 0
    usage.cacheRead += res.usage.cache_read_input_tokens ?? 0
  }
  if (res.stop_reason === 'refusal') throw new Error('Il modello si è rifiutato di leggere il testo')
  if (res.stop_reason === 'max_tokens') throw new Error('Risposta del modello troncata')
  const text = res.content.find(b => b.type === 'text')
  if (!text) throw new Error('Il modello non ha risposto')
  return JSON.parse(text.text)
}

// Un prompt uguale a ogni chiamata: in cache costa un decimo
const cached = (text: string): Anthropic.TextBlockParam[] => [{ type: 'text', text, cache_control: { type: 'ephemeral' } }]

export function llmReader(usage?: TokenUsage): GrantReader {
  return async ({ url, content }) => parseGrantReading(await askLlm({
    system: cached(SYSTEM_PROMPT),
    content: `Fonte: ${url}\n\n${content.slice(0, llmMaxChars())}`,
    schema: GRANT_SCHEMA,
    effort: 'medium',
    maxTokens: 16_000,
    usage,
  }))
}

// ---------- giudizio col profilo ----------

const JUDGE_PROMPT = `You decide whether the company described below can take part in an Italian call: a call for funding (grant) or a tender where a public body buys digital work (tender). You get the company data used by the requirements, then what is known about the call: kind, title, issuer, funding or procedure, summary and the admission requirements with the sentences of the call.

${COMPANY_PROFILE}

Decide "verdict":
- "yes" when the company meets every stated condition, or the conditions the data cannot check would not plausibly exclude it, and the call funds a project or buys work this company could carry out;
- "no" when a condition clearly excludes the company: territory, size, age, legal form, sector or ATECO code, reserved beneficiaries (farmers, companies not yet established, female-led or youth companies when the company is not one), participation requirements far beyond a small software house, or a call that funds or buys something this company does not do;
- "maybe" when the answer depends on facts the data does not give.
"reason" is one short sentence in Italian that names the deciding condition, addressed to the company ("Siete...", "Il bando chiede...").

Answer with one JSON object.`

const JUDGE_SCHEMA = object({
  verdict: { type: 'string', enum: ['yes', 'no', 'maybe'] },
  reason: STRING,
})

export const JUDGE_KEY = promptKey(JUDGE_PROMPT, JUDGE_SCHEMA)

export type GrantSummary = {
  kind: GrantKind
  title: string
  issuer: string
  summary: string
  funding: string
  requirements: Requirement[]
}

export type Judgement = { verdict: Verdict, reason: string }
export type GrantJudge = (grant: GrantSummary, profile: RadarProfile) => Promise<Judgement>

const LEGAL_FORM_LABELS: Record<string, string> = Object.fromEntries(LEGAL_FORMS.map(f => [f.value, f.label]))
const PROVINCE_LABELS: Record<string, string> = Object.fromEntries(PROVINCES.map(p => [p.value, p.label]))

const orUnknown = (v: number | string | null, show: (v: string) => string) =>
  v === null || v === '' ? 'non indicato' : show(String(v))

// I dati del pannello, quelli che usano i requisiti
export function profileFields(p: RadarProfile, now = new Date()): string {
  const founded = p.legalForm === 'da_costituire'
    ? 'da costituire'
    : orUnknown(p.foundedYear, v => `${v} (oggi siamo nel ${romeYear(now)})`)
  return [
    `Forma giuridica: ${LEGAL_FORM_LABELS[p.legalForm]}`,
    `Sede: provincia di ${PROVINCE_LABELS[p.province]} (Puglia)`,
    `Codice ATECO: ${orUnknown(p.ateco, v => v)}`,
    `Fatturato annuo: ${orUnknown(p.revenue, v => `${v} euro`)}`,
    `Dipendenti: ${orUnknown(p.employees, v => v)}`,
    `Anno di costituzione: ${founded}`,
    `Età del titolare: ${orUnknown(p.founderAge, v => `${v} anni`)}`,
    `Impresa femminile: ${p.femaleLed ? 'sì' : 'no'}`,
    `Investimento previsto: ${orUnknown(p.investment, v => `${v} euro`)}`,
    `Durata del progetto: ${orUnknown(p.projectMonths, v => `${v} mesi`)}`,
  ].join('\n')
}

// Il profilo intero, per chi legge il bando fuori dal radar (esportazione)
export const profileText = (p: RadarProfile, now = new Date()) =>
  `${COMPANY_PROFILE}\n\n## Dati\n\n${profileFields(p, now)}`

export const summaryText = (g: GrantSummary) => [
  `Tipo: ${grantKind(g.kind).label}`,
  `Titolo: ${g.title}`,
  `Ente: ${g.issuer}`,
  `Agevolazione: ${g.funding}`,
  '',
  g.summary,
  '',
  'Requisiti:',
  ...g.requirements.map(r => `- ${r.label}${r.quote ? ` («${r.quote}»)` : ''}`),
].join('\n')

export const parseJudgement = (raw: unknown): Judgement => z
  .object({ verdict: z.enum(['yes', 'no', 'maybe']), reason: str })
  .parse(raw)

// Poche centinaia di token: si rifà quando cambia il profilo, senza
// rileggere il bando
export function llmJudge(usage?: TokenUsage): GrantJudge {
  return async (grant, profile) => {
    const j = parseJudgement(await askLlm({
      system: cached(JUDGE_PROMPT),
      content: `Dati dell'azienda:\n${profileFields(profile)}\n\nBando:\n${summaryText(grant)}`,
      schema: JUDGE_SCHEMA,
      effort: 'low',
      maxTokens: 4_000,
      usage,
    }))
    return { ...j, reason: j.reason.slice(0, 500) }
  }
}

// ---------- scelta dei link (siti senza un elenco strutturato) ----------

const PICKER_PROMPT = `You see the links of one page of an Italian public website (a comune, a regional agency, a chamber of commerce). Pick the ones worth opening to find opportunities for a software house: calls that give money or benefits to private businesses, and notices where the body buys IT or digital work.

- "call": the page of one call or notice that either offers funding, grants, vouchers, subsidised loans, tax relief or free services to businesses, professionals or people starting a business (bando, avviso, contributi, agevolazioni, voucher, bonus per imprese o attività commerciali), or buys IT or digital work from companies (gara, affidamento, procedura negoziata, avviso di manifestazione di interesse o indagine di mercato per software, siti web, app, piattaforme, intelligenza artificiale, servizi digitali, transizione digitale). Skip calls that are clearly closed or published more than two years ago.
- "list": a page that lists such calls or notices (bandi, avvisi, contributi, agevolazioni, finanziamenti, bandi di gara e contratti, notizie del comune). Only lists, never single items.

Skip procurement of anything that is not IT or digital work (lavori, forniture, servizi sociali, pulizie, mense), job contests (concorsi), events, services for citizens, documents of the council, contacts and generic pages. Pick at most 20 calls and 3 lists, the most promising first. Answer with one JSON object; an empty list is a fine answer.`

const PICKER_SCHEMA = object({
  picks: { type: 'array', items: object({ index: { type: 'integer' }, kind: { type: 'string', enum: ['call', 'list'] } }) },
})

export type PageLink = { text: string, href: string }
export type LinkPick = { href: string, kind: 'call' | 'list' }
export type LinkPicker = (page: { url: string, links: PageLink[] }) => Promise<LinkPick[]>

export function parsePicks(raw: unknown, links: PageLink[]): LinkPick[] {
  const { picks } = z
    .object({ picks: z.array(z.object({ index: z.number().int(), kind: z.enum(['call', 'list']) })) })
    .parse(raw)
  const seen = new Set<string>()
  const out: LinkPick[] = []
  for (const p of picks) {
    const link = links[p.index]
    if (!link || seen.has(link.href)) continue
    seen.add(link.href)
    out.push({ href: link.href, kind: p.kind })
  }
  return out
}

export function llmLinkPicker(usage?: TokenUsage): LinkPicker {
  return async ({ url, links }) => {
    const list = links.map((l, i) => `${i}. ${l.text} -> ${l.href}`).join('\n')
    return parsePicks(await askLlm({
      system: cached(PICKER_PROMPT),
      content: `Pagina: ${url}\n\nLink:\n${list}`,
      schema: PICKER_SCHEMA,
      effort: 'low',
      maxTokens: 4_000,
      usage,
    }), links)
  }
}
