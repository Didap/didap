import { z } from 'zod'
import { ISO_DATE, romeLocalToDate } from '#shared/dates'
import { LEGAL_FORMS, PROVINCES, REQUIREMENT_KINDS, type Requirement, type RequirementParams } from '#shared/radar'

// Lettura dei bandi con un modello AI: API compatibile OpenAI (Groq di
// default, ma basta cambiare RADAR_LLM_BASE_URL e RADAR_LLM_MODEL).
// Il prompt nasce da quello del Radar Bandi di cityfix, girato sulle imprese.

// Il filtro sul tema, uguale nella lettura completa e nella sola
// classificazione dei bandi letti prima che esistesse
const DIGITAL_RULE = `"digital" is for a software house that builds websites, apps, software and AI solutions: true only if the call funds IT or digital work as its purpose or as one of its main, explicitly named activities: software, web or app development, artificial intelligence, data, cloud, cybersecurity, e-commerce, digital transformation of business processes, digital services or ICT consulting, research and innovation projects in the digital field, calls for innovative or high-tech startups (startup innovative), which usually fund digital products. It is false when the call funds something else, such as machinery, vehicles, tractors or farm equipment, buildings, energy plants, agriculture, tourism facilities, film or audiovisual production, hiring, training, liquidity, guarantees, trade fairs or exports, even if software or digital costs appear as one eligible expense among many.`

const SYSTEM_PROMPT = `You read Italian calls for funding ("bandi", "avvisi", "incentivi") and extract structured data for a private company based in Puglia, Italy. Answer with one JSON object and nothing else.

First decide "admitsCompanies": true only if the text says that private businesses can apply as beneficiaries: imprese, PMI, micro/piccole/medie imprese, startup, liberi professionisti, lavoratori autonomi, or people who will start a new business (imprese da costituire, aspiranti imprenditori). Calls reserved to public bodies, comuni, schools, universities, associations, private citizens, farmers only, or job applicants (concorsi, selezioni di personale, mobilita) are false. Procurement notices where the public body buys services (gare d'appalto, manifestazioni di interesse per fornitori, short list di professionisti) are false. The company must receive something (a grant, a subsidised loan, a voucher, a tax credit, free services): calls where companies give something, such as sponsors, donors or suppliers of goods for events, are false. A text that does not say who can apply is false: never assume it. If false, return {"admitsCompanies": false} and stop.

Then decide ${DIGITAL_RULE}

Then return:
{
  "admitsCompanies": true,
  "digital": boolean,
  "title": string,
  "issuer": string (the body that publishes the call),
  "summary": string (2-4 sentences in Italian: what is funded, for whom, how much),
  "opensAt": string | null (ISO 8601; date only if the call gives no time),
  "deadline": string | null (ISO 8601; date only if the call gives no time; null for calls open until funds run out),
  "maxAmount": number | null (maximum grant a single company can obtain, in euro),
  "funding": string (in Italian, short: form and intensity of the aid, e.g. "Fondo perduto fino al 50% delle spese"),
  "requirements": [{
    "kind": one of ${JSON.stringify(REQUIREMENT_KINDS)},
    "params": object,
    "label": string (short, in Italian, e.g. "Fatturato fino a 2 milioni di euro"),
    "quote": string (the exact sentence of the call that states the requirement, copied verbatim),
    "page": number | null (page of the PDF the quote comes from)
  }]
}

Requirements are the conditions a company must satisfy to be admitted, one per item. Leave out generic conditions every regular company meets (being registered, having a VAT number, DURC, no bankruptcy, de minimis declarations) and never emit a requirement that only says companies may apply (e.g. "Soggetti ammessi: Impresa"). Kinds and params:
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

const grantSchema = z.object({
  // Senza risposta resta da capire: il bando si mostra
  digital: z.boolean().nullish().catch(null).transform(v => v ?? null),
  title: z.string().trim().min(1),
  issuer: str,
  summary: str,
  opensAt: z.string().nullish(),
  deadline: z.string().nullish(),
  maxAmount: num,
  funding: str,
  requirements: z.array(z.unknown()).nullish().transform(v => v ?? []),
})

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
    // Sviluppo IT, IA o servizi digitali; null se il modello non lo dice
    digital: boolean | null
    title: string
    issuer: string
    summary: string
    opensAt: Date | null
    deadline: Date | null
    maxAmount: number | null
    funding: string
    requirements: Requirement[]
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
    digital: g.digital,
    title: g.title.slice(0, 500),
    issuer: g.issuer.slice(0, 300),
    summary: g.summary.slice(0, 3000),
    opensAt: parseCallDate(g.opensAt, false),
    deadline: realDeadline(parseCallDate(g.deadline, true)),
    maxAmount: g.maxAmount === undefined ? null : Math.round(g.maxAmount),
    funding: g.funding.slice(0, 500),
    requirements,
  }
}

export type GrantReader = (doc: { url: string, content: string }) => Promise<GrantReading>

// Il modello non risponde per motivi che non dipendono dal bando (chiave
// sbagliata, servizio giù, rete): si riprova al giro successivo senza
// consumare i tentativi dei bandi in coda (anche quando finiscono i token)
export class ReaderUnavailable extends Error {}

const llmKey = () => process.env.RADAR_LLM_API_KEY ?? ''
export const hasLlm = () => llmKey() !== ''
// I piani gratuiti hanno pochi token al minuto: i testi lunghi si tagliano
export const llmMaxChars = () => Number(process.env.RADAR_LLM_MAX_CHARS) || 24_000

const RETRIES = 3
const SHRINKS = 4
const MAX_WAIT_MS = 60_000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Una richiesta al modello con risposta JSON. Se il testo supera i token al
// minuto del piano (413 su Groq) si riprova più corto.
async function askLlm(system: string, content: string, prefix = ''): Promise<unknown> {
  const baseUrl = (process.env.RADAR_LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '')
  const model = process.env.RADAR_LLM_MODEL || 'openai/gpt-oss-120b'
  let chars = llmMaxChars()
  for (let attempt = 1; ; attempt++) {
    let res: Response
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${llmKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: `${prefix}${content.slice(0, chars)}` },
          ],
        }),
        signal: AbortSignal.timeout(120_000),
      })
    }
    catch (err) {
      // Un timeout può dipendere dal testo (troppo lungo): conta sul bando
      if ((err as Error).name === 'TimeoutError') throw err
      throw new ReaderUnavailable(`Modello non raggiungibile: ${(err as Error).message}`)
    }
    if (res.ok) {
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const answer = body.choices?.[0]?.message?.content
      if (!answer) throw new Error('Il modello non ha risposto')
      return JSON.parse(answer)
    }
    const detail = (await res.text()).slice(0, 300)
    if (res.status === 413 && content.length > chars * 0.6 && attempt < SHRINKS) {
      chars = Math.floor(chars * 0.6)
      continue
    }
    const retryable = res.status === 429 || res.status >= 500
    if (!retryable || attempt >= RETRIES) {
      const message = `Il modello ha risposto ${res.status}: ${detail}`
      if ([401, 403, 429].includes(res.status) || res.status >= 500) throw new ReaderUnavailable(message)
      throw new Error(message)
    }
    const wait = Number(res.headers.get('retry-after')) * 1000 || 3_000 * attempt
    await sleep(Math.min(wait, MAX_WAIT_MS))
  }
}

export function llmReader(): GrantReader {
  return async ({ url, content }) => parseGrantReading(await askLlm(SYSTEM_PROMPT, content, `Fonte: ${url}\n\n`))
}

// ---------- solo il tema ----------

const TOPIC_PROMPT = `You read the summary of an Italian call for funding open to private companies. Decide ${DIGITAL_RULE}

Answer with one JSON object, {"digital": boolean}, and nothing else.`

export type GrantSummary = { title: string, issuer: string, summary: string, funding: string }
export type TopicReader = (grant: GrantSummary) => Promise<boolean>

export const summaryText = (g: GrantSummary) =>
  [`Titolo: ${g.title}`, `Ente: ${g.issuer}`, `Agevolazione: ${g.funding}`, '', g.summary].join('\n')

export const parseTopic = (raw: unknown) => z.object({ digital: z.boolean() }).parse(raw).digital

// Per i bandi già letti senza il tema: titolo e riassunto bastano, costa
// poche centinaia di token invece di rileggere tutto il bando
export function llmTopicReader(): TopicReader {
  return async grant => parseTopic(await askLlm(TOPIC_PROMPT, summaryText(grant)))
}
