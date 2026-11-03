import { randomUUID } from 'node:crypto'
import type Anthropic from '@anthropic-ai/sdk'
import { createError } from 'h3'
import type postgres from 'postgres'
import { z } from 'zod'
import { ISO_DATE, romeDate } from '#shared/dates'
import { httpUrl } from '#shared/product'
import {
  emptyUsage,
  grantKind,
  OUTCOME_CLAIM_MINUTES,
  OUTCOME_STATUSES,
  usageCost,
  type GrantOutcome,
  type RadarGrant,
} from '#shared/radar'
import { liveClaim, llmMissing } from './radar'
import { addUsage, llmClient, llmFailure, llmNullable, llmObject } from './radar-reader'

// "Controlla esito": il modello cerca sul web l'esito di un bando a cui ci
// siamo candidati (graduatoria, aggiudicazione) e dice se abbiamo vinto, con
// che punteggio e chi ha vinto.
//
// Gira in background come il riempimento della cartella, con lo stato nel
// database: outcome_claim = gettone del controllo in corso,
// outcome_claimed_at = da quando (per la scadenza), outcome = l'ultimo esito
// trovato, outcome_error = com'è fallito l'ultimo controllo.

type Sql = postgres.Sql

// Il modello che cerca: la ricerca sul web vuole un modello capace, e un
// controllo si fa a mano, un bando alla volta. Opus o Sonnet: gli strumenti
// web che usa non ci sono per Haiku
const outcomeModel = () => process.env.RADAR_OUTCOME_MODEL || 'claude-opus-5-5'

const OUTCOME_PROMPT = `You find the outcome of an Italian call that Didap applied to. Didap is a software house in Puglia, Italy, a limited company: in official documents it appears as "Didap S.r.l.", "DIDAP SRL" or similar.

The call is either a call for funding (grant: look for the ranking or the list of admitted, funded and excluded applications, "graduatoria", "esito istruttoria", "elenco delle domande ammesse", "decreto di concessione") or a tender where a public body buys digital work (tender: look for the award and the scores of the bidders, "aggiudicazione", "esito di gara", "verbale di gara", "determina di aggiudicazione"). Search the web starting from the issuer's site and the page of the call, open the documents that publish the result and look for Didap in them. Rankings can be long PDFs: search them for Didap and the first positions instead of reading them whole.

When you are done, call report_outcome once:
- "status": "won" if Didap is among the winners (admitted to funding, awarded the contract, ranked within the funded positions); "lost" if a result is published and Didap is excluded, not admitted, not funded or did not win; "unclear" if a result is published but you cannot tell whether Didap is in it (applications listed by protocol number, partial documents); "not_published" if you find no published result.
- "summary": two or three sentences in Italian addressed to Didap ("Siete...", "La graduatoria..."): what was published, when, and what it says about Didap.
- "published_on": the date of the act that publishes the result (YYYY-MM-DD), null if you did not find it.
- "our_score" and "our_rank": Didap's score as written in the document (for example "78,5/100") and its position, null when the document does not give them.
- "winners": who won, with the score as written: the awardee of a tender, or the first applications of a ranking (at most 5); empty if nothing is published.
- "sources": the pages or documents that publish the result, with the URLs you opened (at most 5).
Never invent names, scores or links: leave a field null or a list empty when the documents do not say.`

// L'esito arriva come chiamata di questo strumento: la ricerca sul web
// risponde con citazioni, che non vanno d'accordo con la risposta in JSON
const REPORT_TOOL: Anthropic.Tool = {
  name: 'report_outcome',
  description: 'Report the outcome of the call. Call it exactly once, as the last step, when the search is over.',
  strict: true,
  input_schema: llmObject({
    status: { type: 'string', enum: [...OUTCOME_STATUSES] },
    summary: { type: 'string' },
    published_on: llmNullable('string'),
    our_score: llmNullable('string'),
    our_rank: llmNullable('integer'),
    winners: { type: 'array', items: llmObject({ name: { type: 'string' }, score: llmNullable('string') }) },
    sources: { type: 'array', items: llmObject({ title: { type: 'string' }, url: { type: 'string' } }) },
  }),
}

// Ricerca e lettura delle pagine sui server di Anthropic, al massimo così
// tante per richiesta: una graduatoria in PDF letta intera costa cara
const TOOLS: Anthropic.ToolUnion[] = [
  { type: 'web_search_20260209', name: 'web_search', max_uses: 8 },
  { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 5 },
  REPORT_TOOL,
]
// Al più cinque richieste per controllo: la prima, le riprese dopo una
// pausa, un sollecito
const MAX_REQUESTS = 5
// Il controllo si ferma, anche a metà di una risposta, dieci minuti prima
// che scada il turno: un controllo ancora vivo non ne trova uno nuovo
const CHECK_TIMEOUT_MS = (OUTCOME_CLAIM_MINUTES - 10) * 60_000
// 10 dollari ogni mille ricerche, oltre ai token
const SEARCH_DOLLARS = 0.01

const text = z.string().trim()
const optional = z.string().trim().nullish().transform(v => v || null)

const reportSchema = z.object({
  status: z.enum(OUTCOME_STATUSES),
  summary: text,
  published_on: optional,
  our_score: optional,
  our_rank: z.number().int().positive().nullish().catch(null),
  winners: z.array(z.object({ name: text, score: optional })).catch([]),
  sources: z.array(z.object({ title: text, url: text })).catch([]),
})

// Valida l'esito dato dal modello; lancia se non è usabile. I link finiscono
// come href nel pannello: solo http(s), una volta sola
export function parseOutcome(raw: unknown): Omit<GrantOutcome, 'checkedAt' | 'cost'> {
  const r = reportSchema.parse(raw)
  // Un esito senza spiegazione non si salva: niente "Avete vinto" senza basi
  if (!r.summary) throw new Error('Il modello ha dato un esito senza spiegarlo')
  return {
    status: r.status,
    summary: r.summary.slice(0, 1000),
    publishedOn: r.published_on && ISO_DATE.test(r.published_on) ? r.published_on : null,
    ourScore: r.our_score?.slice(0, 60) ?? null,
    ourRank: r.our_rank ?? null,
    winners: r.winners
      .filter(w => w.name)
      .slice(0, 5)
      .map(w => ({ name: w.name.slice(0, 200), score: w.score?.slice(0, 60) ?? null })),
    sources: r.sources
      .filter((s, i) => httpUrl.safeParse(s.url).success && r.sources.findIndex(x => x.url === s.url) === i)
      .slice(0, 5)
      .map(s => ({ title: (s.title || s.url).slice(0, 200), url: s.url })),
  }
}

export type OutcomeQuery = Pick<RadarGrant, 'kind' | 'title' | 'issuer' | 'url' | 'funding' | 'summary'> & { deadline: Date | null }
// `signal`: la scadenza del controllo, data da chi tiene il turno
export type OutcomeFinder = (grant: OutcomeQuery, signal: AbortSignal) => Promise<Omit<GrantOutcome, 'checkedAt'>>

const callText = (g: OutcomeQuery) => [
  `Tipo: ${grantKind(g.kind).label}`,
  `Titolo: ${g.title}`,
  `Ente: ${g.issuer}`,
  `Pagina del bando: ${g.url}`,
  `Scadenza: ${g.deadline ? romeDate(g.deadline) : 'a sportello'}`,
  `${grantKind(g.kind).funding}: ${g.funding || 'non indicata'}`,
  '',
  g.summary,
].join('\n')

export const llmOutcomeFinder: OutcomeFinder = async (grant, signal) => {
  const model = outcomeModel()
  const usage = emptyUsage()
  let searches = 0
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: callText(grant) }]
  for (let i = 0; i < MAX_REQUESTS; i++) {
    let res: Anthropic.Message
    try {
      res = await llmClient().messages.stream({
        model,
        max_tokens: 16_000,
        // La ripresa rimanda le pagine già lette: dalla cache costano un decimo
        cache_control: { type: 'ephemeral' },
        system: OUTCOME_PROMPT,
        tools: TOOLS,
        output_config: { effort: 'medium' },
        messages,
      }, { signal }).finalMessage()
    }
    catch (err) {
      if (signal.aborted) throw new Error('Il controllo è durato troppo ed è stato fermato')
      throw llmFailure(err)
    }
    addUsage(usage, res.usage)
    searches += res.usage.server_tool_use?.web_search_requests ?? 0
    if (res.stop_reason === 'refusal') throw new Error('Il modello si è rifiutato di cercare l\'esito')
    const report = res.content.find(b => b.type === 'tool_use' && b.name === REPORT_TOOL.name)
    if (report?.type === 'tool_use') {
      const tokens = usageCost(model, usage)
      return { ...parseOutcome(report.input), cost: tokens === null ? null : tokens + searches * SEARCH_DOLLARS }
    }
    if (res.stop_reason === 'max_tokens') throw new Error('Risposta del modello troncata')
    messages.push({ role: 'assistant', content: res.content })
    // In pausa (troppi passi in una richiesta): il server riprende da dove
    // si è fermato. Finito senza esito: glielo si chiede
    if (res.stop_reason !== 'pause_turn') messages.push({ role: 'user', content: 'Chiama report_outcome con quello che hai trovato.' })
  }
  throw new Error('Il modello non ha dato un esito')
}

// "Controlla esito" su un bando candidato: parte in background, il pannello
// segue lo stato del bando. Già in corso (altro clic, altra istanza): si
// aspetta quello
export async function startGrantOutcome(
  sql: Sql,
  finder: OutcomeFinder | null,
  id: string,
  run: (job: () => Promise<void>) => void = job => void job(),
): Promise<void> {
  if (!finder) throw llmMissing()
  // Gettone casuale del turno, come per la cartella: l'ora serve solo a farlo scadere
  const claim = randomUUID()
  const [claimed] = await sql`
    update radar_grants set outcome_claim = ${claim}, outcome_claimed_at = now(), outcome_error = ''
    where id = ${id} and applied_at is not null
      and not ${liveClaim(sql, 'outcome_claimed_at', OUTCOME_CLAIM_MINUTES)}
    returning id
  `
  if (claimed) {
    run(() => checkOutcome(sql, finder, id, claim))
    return
  }
  const [row] = await sql<{ applied: boolean }[]>`select applied_at is not null as applied from radar_grants where id = ${id}`
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Bando non trovato' })
  if (!row.applied) throw createError({ statusCode: 409, statusMessage: 'Segnate prima il bando tra i candidati' })
}

// Lo stato si scrive solo se il turno è ancora suo: un controllo rimasto
// indietro (turno scaduto e ripreso da un altro) non copre quello nuovo
async function checkOutcome(sql: Sql, finder: OutcomeFinder, id: string, claim: string) {
  try {
    // Com'è adesso, anche se nel frattempo è stato chiuso o tolto dai candidati
    const [grant] = await sql<OutcomeQuery[]>`
      select g.kind, g.title, g.issuer, d.url, g.deadline, g.funding, g.summary
      from radar_grants g join radar_documents d on d.id = g.document_id
      where g.id = ${id}
    `
    if (!grant) throw new Error('Bando non trovato')
    const found = await finder(grant, AbortSignal.timeout(CHECK_TIMEOUT_MS))
    const outcome: GrantOutcome = { ...found, checkedAt: new Date().toISOString() }
    await sql`
      update radar_grants set outcome = ${sql.json(outcome)}, outcome_claim = null, outcome_claimed_at = null
      where id = ${id} and outcome_claim = ${claim}
    `
  }
  catch (err) {
    console.error('[radar] esito del bando non controllato', err)
    await sql`
      update radar_grants set outcome_claim = null, outcome_claimed_at = null,
        outcome_error = ${`Non riuscito: ${err instanceof Error ? err.message : String(err)}`.slice(0, 500)}
      where id = ${id} and outcome_claim = ${claim}
    `
  }
}
