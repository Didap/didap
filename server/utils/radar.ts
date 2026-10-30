import { createHash } from 'node:crypto'
import { createError } from 'h3'
import type postgres from 'postgres'
import {
  emptyStats,
  emptyUsage,
  evaluateRadarGrant,
  FOLDER_CLAIM_MINUTES,
  isDigestCandidate,
  isInScope,
  parseRadarSettings,
  sourceLabel,
  type Application,
  type EvaluatedGrant,
  type RadarGrant,
  type RadarProfile,
  type RadarRun,
  type RadarSearch,
  type RadarSettings,
  type RadarStatus,
  type Requirement,
  type RunStats,
  type TokenUsage,
} from '#shared/radar'
import { digestHtml, digestSubject, digestText } from '../emails/radar-digest'
import { cloudinaryConfig } from './cloudinary'
import { hasMailer, resendMailer, type Mailer } from './mail'
import { SourceUnreachable, withDownHosts } from './radar-fetch'
import {
  hasLlm,
  JUDGE_KEY,
  llmJudge,
  llmLinkPicker,
  llmMaxChars,
  llmModel,
  llmReader,
  READER_KEY,
  ReaderUnavailable,
  type GrantJudge,
  type GrantReader,
} from './radar-reader'
import { radarSources, type Listing, type RadarSource } from './radar-sources'

// Radar bandi: a ogni scan, lanciato dal pannello, scarica i bandi dalle
// fonti scelte, li fa leggere al modello, li fa giudicare col profilo
// dell'azienda, li valuta coi parametri del pannello e manda la mail coi
// bandi nuovi. Ogni scan finisce nel registro con tempi, token e bandi
// trovati. Tutto riceve il client Postgres come parametro (testabile senza
// Nitro).

type Sql = postgres.Sql
type Scope = Pick<RadarSearch, 'groups' | 'provinces'>

// Al massimo `size` lavori insieme, nell'ordine della lista
export async function inPool<T, R>(items: T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length })
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await work(items[i]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker))
  return results
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

// ---------- impostazioni ----------

export async function readRadarSettings(sql: Sql): Promise<RadarSettings> {
  const [row] = await sql`select data from radar_settings where id = 1`
  return parseRadarSettings(row?.data)
}

export async function writeRadarSettings(sql: Sql, data: RadarSettings): Promise<void> {
  await sql`
    insert into radar_settings (id, data, updated_at)
    values (1, ${sql.json(data)}, now())
    on conflict (id) do update set data = excluded.data, updated_at = now()
  `
}

// ---------- stato e turno ----------

const MAX_ATTEMPTS = 3

// Bando letto, aperto e non scaduto (g: radar_grants, d: radar_documents)
const openGrant = (sql: Sql, now: Date) => sql`
  d.status = 'read' and d.closed_at is null and (g.deadline is null or g.deadline >= ${now})
`

// Chiuso dalla fonte o scaduto
const closedGrant = (sql: Sql, now: Date) => sql`
  (d.closed_at is not null or (g.deadline is not null and g.deadline < ${now}))
`

// Bandi ancora da leggere: la stessa condizione per la coda e per il
// contatore. Quando il prompt di lettura cambia (READER_KEY) si rileggono i
// bandi digitali, che restano "read" e in elenco finché non si rileggono;
// i testi scartati e i bandi su altro si rileggono solo se il testo cambia.
// I testi scartati o falliti col prompt di prima dell'impronta (senza
// chiave: non riconosceva le gare) si rileggono una volta
const queued = (sql: Sql) => sql`
  closed_at is null and (
    status = 'pending' or (status = 'failed' and attempts < ${MAX_ATTEMPTS})
    or (status in ('skipped', 'failed') and reader_key is null)
    or (status = 'read' and reader_key is distinct from ${READER_KEY} and exists (
      select 1 from radar_grants g where g.document_id = radar_documents.id and g.digital is not false
    ))
  )
`

// Uno scan "in corso" senza più il turno è morto col processo (riavvio,
// deploy): si mostra fallito, e lo scan dopo lo segna così (startRun)
const INTERRUPTED = 'Interrotto (il server si è riavviato)'
const staleRun = (sql: Sql) => sql`(r.status = 'running' and (s.lease_until is null or s.lease_until <= now()))`

// La riga id = 1 esiste sempre: la crea lo schema. L'ultimo scan viene dal
// registro (anche quelli del vecchio giro automatico)
async function readState(sql: Sql) {
  const [row] = await sql`
    select s.last_ingest_error, s.last_digest_at, s.lease_until,
      (select count(*)::int from radar_documents where ${queued(sql)}) as pending,
      r.id as scan_id, case when ${staleRun(sql)} then 'failed' else r.status end as scan_status,
      r.started_at as scan_started_at
    from radar_state s
    left join lateral (
      select id, status, started_at from radar_runs where trigger in ('manuale', 'automatico')
      order by started_at desc limit 1
    ) r on true
    where s.id = 1
  `
  return {
    lastScan: row!.scan_id
      ? { id: row!.scan_id as string, status: row!.scan_status as RadarRun['status'], startedAt: (row!.scan_started_at as Date).toISOString() }
      : null,
    lastIngestError: row!.last_ingest_error as string | null,
    lastDigestAt: row!.last_digest_at as Date | null,
    leaseUntil: row!.lease_until as Date | null,
    pending: row!.pending as number,
  }
}

// Il turno scade presto e chi lavora lo rinnova: un processo morto a metà
// (riavvio, deploy) lo libera in pochi minuti, un import lungo lo tiene
const LEASE_MINUTES = 10
const RENEW_MS = 2 * 60_000

// Un giro alla volta, anche con più istanze del sito: chi prende il turno
// lo tiene finché non lo rilascia o scade.
// Restituisce la scadenza, che fa da gettone per rilasciarlo; null se è occupato.
export async function acquireLease(sql: Sql, minutes = LEASE_MINUTES): Promise<Date | null> {
  const until = new Date(Date.now() + minutes * 60_000)
  const rows = await sql`
    update radar_state set lease_until = ${until}
    where id = 1 and (lease_until is null or lease_until < now())
    returning id
  `
  return rows.length > 0 ? until : null
}

// Rilascia solo il proprio turno: un giro scaduto e finito tardi non libera
// quello di chi l'ha preso dopo
export async function releaseLease(sql: Sql, lease: Date) {
  await sql`update radar_state set lease_until = null where id = 1 and lease_until = ${lease}`
}

// Prende il turno e lo rinnova finché non si chiama `release`; null se è occupato
async function holdLease(sql: Sql): Promise<{ release: () => Promise<void> } | null> {
  let lease = await acquireLease(sql)
  if (!lease) return null
  let renewing: Promise<void> = Promise.resolve()
  const timer = setInterval(() => {
    renewing = (async () => {
      const next = new Date(Date.now() + LEASE_MINUTES * 60_000)
      try {
        const rows = await sql`update radar_state set lease_until = ${next} where id = 1 and lease_until = ${lease} returning id`
        if (rows.length) lease = next
      }
      catch (err) {
        console.error('[radar] turno non rinnovato', err)
      }
    })()
  }, RENEW_MS)
  return {
    async release() {
      clearInterval(timer)
      // Un rinnovo a metà cambierebbe il gettone sotto i piedi
      await renewing
      await releaseLease(sql, lease!)
    },
  }
}

// ---------- scaricamento ----------

const MAX_ERRORS = 5
// Fonti scaricate insieme: con tanti comuni non si apre tutto in una volta
const SOURCE_CONCURRENCY = 6

// Com'è andata una fonte: errori da guardare, siti che non hanno risposto
// (non sono errori), voci trovate e testi messi in coda
export type SourceResult = Pick<RunStats, 'errors' | 'unreachable' | 'listed' | 'queued'>

const emptySource = (): SourceResult => ({ errors: [], unreachable: [], listed: 0, queued: 0 })

// Somma una fonte in un totale, o nelle statistiche dello scan
function addSource(into: SourceResult, r: SourceResult) {
  into.errors.push(...r.errors)
  into.unreachable.push(...r.unreachable)
  into.listed += r.listed
  into.queued += r.queued
}

// Una fonte che non risponde da più di un giorno resta ferma due settimane,
// poi si riprova da sola (e se non risponde ancora, altre due). Una fonte
// che risponde esce dalla tabella; "Svuota" la azzera.
const PAUSE_AFTER_HOURS = 24
const PAUSE_DAYS = 14

// Scarica gli elenchi e salva i testi nuovi o cambiati come "pending".
// Le fonti sono indipendenti; una fonte giù non ferma le altre, una in
// pausa si salta (`paused`). `onSource`: chiamata a ogni fonte finita, per
// il registro
export async function ingestSources(
  sql: Sql,
  sources: RadarSource[],
  now = new Date(),
  onSource?: (r: SourceResult) => Promise<void>,
): Promise<SourceResult & { paused: string[] }> {
  const tracked = new Map((await sql<{ slug: string, paused: boolean }[]>`
    select slug, coalesce(paused_until > ${now}, false) as paused from radar_sources
    where slug = any(${sources.map(s => s.slug)})
  `).map(t => [t.slug, t.paused]))
  const total = emptySource()
  const down: string[] = []
  const back: string[] = []
  await inPool(sources.filter(s => !tracked.get(s.slug)), SOURCE_CONCURRENCY, async (s) => {
    // Un guasto imprevisto (database, testo strano) resta nella sua fonte
    const r = await ingestSource(sql, s, now)
      .catch((err): SourceResult => ({ ...emptySource(), errors: [`${sourceLabel(s.slug)}: ${(err as Error).message}`] }))
    if (r.unreachable.length) down.push(s.slug)
    else if (tracked.has(s.slug)) back.push(s.slug)
    addSource(total, r)
    await onSource?.(r)
  })
  await recordReach(sql, down, back, now)
  return { ...total, paused: sources.filter(s => tracked.get(s.slug)).map(s => sourceLabel(s.slug)) }
}

// Chi ha risposto esce dalla tabella; chi no ci entra, e va in pausa se non
// risponde da più di un giorno
async function recordReach(sql: Sql, down: string[], back: string[], now: Date) {
  if (back.length) await sql`delete from radar_sources where slug = any(${back})`
  if (!down.length) return
  const dayAgo = new Date(now.getTime() - PAUSE_AFTER_HOURS * 3_600_000)
  const until = new Date(now.getTime() + PAUSE_DAYS * 86_400_000)
  await sql`
    insert into radar_sources (slug, unreachable_since)
    select unnest(${down}::text[]), ${now}::timestamptz
    on conflict (slug) do update set
      paused_until = case when radar_sources.unreachable_since <= ${dayAgo} then ${until}::timestamptz end
  `
}

async function ingestSource(sql: Sql, source: RadarSource, now: Date): Promise<SourceResult> {
  const label = sourceLabel(source.slug)
  const result = emptySource()
  let listings
  try {
    listings = await source.fetchListing()
  }
  catch (err) {
    if (err instanceof SourceUnreachable) result.unreachable.push(label)
    else result.errors.push(`${label}: ${(err as Error).message}`)
    return result
  }
  await markClosed(sql, source, listings, now)
  const known = new Map(
    (await sql<{ external_id: string, content_hash: string, fetched_at: Date }[]>`
      select external_id, content_hash, fetched_at from radar_documents where source = ${source.slug}
    `).map(r => [r.external_id, r]),
  )
  const fresh = now.getTime() - source.refreshDays * 86_400_000
  const unchanged: Listing[] = []
  for (const listing of listings) {
    if (listing.closed) continue
    result.listed++
    const prev = known.get(listing.externalId)
    if (prev && source.refreshDays && prev.fetched_at.getTime() > fresh) continue
    let content
    try {
      // Postgres non accetta il carattere nullo, che a volte esce dai PDF
      content = (listing.content ?? await source.fetchContent!(listing)).replaceAll('\0', '')
    }
    catch (err) {
      // Un sito che non risponde a metà elenco: il bando si riprova al prossimo scan
      if (!(err instanceof SourceUnreachable) && result.errors.length < MAX_ERRORS) {
        result.errors.push(`${label}: ${(err as Error).message}`)
      }
      continue
    }
    const hash = sha256(content)
    if (prev?.content_hash === hash) {
      unchanged.push(listing)
      continue
    }
    await sql`
      insert into radar_documents (source, external_id, url, content, content_hash, fetched_at)
      values (${source.slug}, ${listing.externalId}, ${listing.url}, ${content}, ${hash}, ${now})
      on conflict (source, external_id) do update set
        url = excluded.url, content = excluded.content, content_hash = excluded.content_hash,
        status = 'pending', attempts = 0, error = null, fetched_at = excluded.fetched_at
    `
    result.queued++
  }
  // Testi uguali: solo l'URL (può essersi spostato) e la data, in un colpo
  if (unchanged.length) {
    await sql`
      update radar_documents d set url = v.url, fetched_at = ${now}
      from unnest(${unchanged.map(l => l.externalId)}::text[], ${unchanged.map(l => l.url)}::text[]) as v(id, url)
      where d.source = ${source.slug} and d.external_id = v.id
    `
  }
  return result
}

// Un bando chiuso esce da elenco e mail; se la fonte lo riapre, rientra.
// Un elenco completo ma vuoto è più probabilmente una fonte rotta: non chiude nulla.
async function markClosed(sql: Sql, source: RadarSource, listings: Listing[], now: Date) {
  const open = listings.filter(l => !l.closed).map(l => l.externalId)
  if (source.complete) {
    if (open.length) {
      await sql`
        update radar_documents set closed_at = ${now}
        where source = ${source.slug} and closed_at is null and not (external_id = any(${open}))
      `
    }
  }
  else {
    const closed = listings.filter(l => l.closed).map(l => l.externalId)
    await sql`
      update radar_documents set closed_at = ${now}
      where source = ${source.slug} and closed_at is null and external_id = any(${closed})
    `
  }
  await sql`
    update radar_documents set closed_at = null
    where source = ${source.slug} and closed_at is not null and external_id = any(${open})
  `
}

// ---------- lettura ----------

const READ_BATCH = 40
// Testi letti insieme dal modello
const READ_CONCURRENCY = 4

// `tried`: testi presi dalla coda; `failed`: quelli che hanno dato errore
// (restano in coda); `read`: letti; `grants`: aperti alle imprese
export type ReadResult = { tried: string[], failed: string[], read: number, grants: number, unavailable: boolean }

// Legge un lotto della coda. Se il modello non risponde (limiti, chiave,
// servizio giù) si ferma: il resto resta in coda per il giro successivo,
// senza tentativi persi.
export async function readPending(
  sql: Sql,
  reader: GrantReader,
  // `skip`: testi che in questo scan hanno già dato errore (si riprovano allo
  // scan dopo); `runId`: lo scan a cui vanno i bandi nuovi
  { limit = READ_BATCH, concurrency = 1, skip = [] as string[], runId = null as string | null } = {},
): Promise<ReadResult> {
  // Il modello legge solo l'inizio: prima si sceglie il lotto, poi si
  // carica l'inizio del testo solo di quello
  const docs = await sql<{ id: string, url: string, content: string }[]>`
    select d.id, d.url, left(d.content, ${llmMaxChars()}) as content
    from (
      select id, fetched_at from radar_documents
      where ${queued(sql)} and not (id = any(${skip}::uuid[]))
      order by fetched_at, id
      limit ${limit}
    ) q join radar_documents d on d.id = q.id
    order by q.fetched_at, q.id
  `
  const result: ReadResult = { tried: docs.map(d => d.id), failed: [], read: 0, grants: 0, unavailable: false }
  await inPool(docs, concurrency, async (doc) => {
    if (result.unavailable) return
    let reading
    try {
      reading = await reader(doc)
    }
    catch (err) {
      if (err instanceof ReaderUnavailable) {
        result.unavailable = true
        return
      }
      // Un bando già letto che non si rilegge resta coi dati di prima, in
      // elenco; un testo nuovo si riprova allo scan dopo
      await sql`
        update radar_documents set status = case when status = 'read' then 'read' else 'failed' end,
          attempts = attempts + 1, error = ${(err as Error).message.slice(0, 1000)}, reader_key = ${READER_KEY}
        where id = ${doc.id}
      `
      result.failed.push(doc.id)
      return
    }
    await sql.begin(async (tx) => {
      if (reading.admitsCompanies) {
        // Testo nuovo: il giudizio col profilo va rifatto. Lo scan resta
        // quello che ha trovato il bando la prima volta
        await tx`
          insert into radar_grants (document_id, kind, digital, ai, title, issuer, summary, opens_at, deadline, max_amount,
            funding, requirements, application, run_id)
          values (${doc.id}, ${reading.kind}, ${reading.digital}, ${reading.ai}, ${reading.title}, ${reading.issuer},
            ${reading.summary}, ${reading.opensAt}, ${reading.deadline}, ${reading.maxAmount}, ${reading.funding},
            ${tx.json(reading.requirements)}, ${reading.application ? tx.json(reading.application) : null}, ${runId})
          on conflict (document_id) do update set
            kind = excluded.kind, digital = excluded.digital, ai = excluded.ai,
            title = excluded.title, issuer = excluded.issuer, summary = excluded.summary,
            opens_at = excluded.opens_at, deadline = excluded.deadline, max_amount = excluded.max_amount,
            funding = excluded.funding, requirements = excluded.requirements, application = excluded.application,
            verdict = null, verdict_reason = '', judged_profile = null, updated_at = now()
        `
      }
      // Un bando con cartella o col cuore non si cancella: resta coi dati di
      // prima. La condizione sta nella delete: una cartella creata nel
      // frattempo blocca la riga e Postgres la ricontrolla dopo.
      let kept = false
      if (!reading.admitsCompanies) {
        await tx`delete from radar_grants where document_id = ${doc.id} and folder_at is null and liked_at is null`
        kept = (await tx`select 1 from radar_grants where document_id = ${doc.id}`).length > 0
      }
      const status = reading.admitsCompanies || kept ? 'read' : 'skipped'
      await tx`
        update radar_documents set status = ${status}, error = null, read_at = now(), reader_key = ${READER_KEY}
        where id = ${doc.id}
      `
    })
    result.read++
    if (reading.admitsCompanies) result.grants++
  })
  return result
}

// ---------- giudizio col profilo ----------

const JUDGE_CONCURRENCY = 4

// Il profilo con cui un bando è stato giudicato: i dati del pannello e il
// prompt del giudizio, che contiene server/radar/didap.md. Se cambia uno
// dei due, si rigiudica
export const profileKey = (profile: RadarProfile) => sha256(JSON.stringify({ judge: JUDGE_KEY, profile })).slice(0, 16)

// Giudica i bandi aperti mai giudicati con questo profilo, tutti: la
// ricerca decide solo cosa si vede, e un bando trovato con una ricerca non
// ancora salvata ha già il suo giudizio. Costa poche centinaia di token l'uno
export async function judgeGrants(
  sql: Sql,
  judge: GrantJudge,
  { profile }: Pick<RadarSettings, 'profile'>,
  now = new Date(),
): Promise<{ judged: number, unavailable: boolean }> {
  const key = profileKey(profile)
  const grants = await sql<{
    id: string
    kind: RadarGrant['kind']
    title: string
    issuer: string
    summary: string
    funding: string
    requirements: Requirement[]
  }[]>`
    select g.id, g.kind, g.title, g.issuer, g.summary, g.funding, g.requirements
    from radar_grants g join radar_documents d on d.id = g.document_id
    where ${openGrant(sql, now)} and g.judged_profile is distinct from ${key}
    order by g.created_at
  `
  const result = { judged: 0, unavailable: false }
  await inPool(grants, JUDGE_CONCURRENCY, async (g) => {
    if (result.unavailable) return
    let j
    try {
      j = await judge(g, profile)
    }
    catch (err) {
      if (err instanceof ReaderUnavailable) result.unavailable = true
      // Altrimenti resta da giudicare: si riprova al prossimo giro
      return
    }
    await sql`
      update radar_grants set verdict = ${j.verdict}, verdict_reason = ${j.reason},
        judged_profile = ${key}
      where id = ${g.id}
    `
    result.judged++
  })
  return result
}

// ---------- registro degli scan ----------

async function startRun(sql: Sql, scope: Scope, model: string): Promise<string> {
  // Uno scan alla volta: uno ancora "in corso" è morto a metà (riavvio)
  await sql`
    update radar_runs set status = 'failed', finished_at = now(), error = ${INTERRUPTED}
    where status = 'running'
  `
  const [row] = await sql<{ id: string }[]>`
    insert into radar_runs (trigger, groups, provinces, model, stats, usage)
    values ('manuale', ${scope.groups}, ${scope.provinces}, ${model}, ${sql.json(emptyStats())}, ${sql.json(emptyUsage())})
    returning id
  `
  return row!.id
}

async function saveRun(sql: Sql, id: string, stats: RunStats, usage: TokenUsage, end?: { status: 'done' | 'failed', error?: string }) {
  await sql`
    update radar_runs set stats = ${sql.json(stats)}, usage = ${sql.json(usage)}
      ${end ? sql`, status = ${end.status}, finished_at = now(), error = ${end.error ?? null}` : sql``}
    where id = ${id}
  `
}

export async function listRuns(sql: Sql, limit = 30): Promise<RadarRun[]> {
  const rows = await sql`
    select r.id, r.trigger, r.groups, r.provinces, r.started_at, r.finished_at, r.model, r.stats, r.usage,
      case when ${staleRun(sql)} then 'failed' else r.status end as status,
      case when ${staleRun(sql)} then ${INTERRUPTED} else r.error end as error
    from radar_runs r cross join radar_state s
    where s.id = 1
    order by r.started_at desc limit ${limit}
  `
  return rows.map(r => ({
    id: r.id,
    trigger: r.trigger,
    groups: r.groups,
    provinces: r.provinces,
    status: r.status,
    startedAt: r.started_at.toISOString(),
    finishedAt: r.finished_at?.toISOString() ?? null,
    model: r.model,
    stats: { ...emptyStats(), ...r.stats },
    usage: { ...emptyUsage(), ...r.usage },
    error: r.error,
  }))
}

// ---------- elenco e valutazione ----------

// Bandi aperti, dalla scadenza più vicina; `id`: solo quel bando. Il
// pannello li valuta da sé coi parametri del modulo, anche non salvati.
// `withFolders`: anche i bandi con cartella chiusi o scaduti (pannello,
// esportazione); la mail e il resto del radar vedono solo quelli aperti.
export async function listGrants(
  sql: Sql,
  now: Date,
  { unnotified = false, id = '', withFolders = false } = {},
): Promise<RadarGrant[]> {
  const rows = await sql`
    select g.id, d.source, d.url, g.kind, g.digital, g.ai, g.verdict, g.verdict_reason, g.title, g.issuer, g.summary,
      g.opens_at, g.deadline, g.max_amount, g.funding, g.requirements, g.application, g.notified_at,
      g.liked_at, g.folder_at, g.folder_filled_at, g.folder_failed_at, g.folder_note,
      coalesce(g.folder_filled_at is null and g.folder_claimed_at > now() - ${`${FOLDER_CLAIM_MINUTES} minutes`}::interval, false)
        as folder_filling,
      ${closedGrant(sql, now)} as closed,
      g.created_at, g.run_id
    from radar_grants g join radar_documents d on d.id = g.document_id
    where (${openGrant(sql, now)} ${withFolders ? sql`or g.folder_at is not null` : sql``})
      ${unnotified ? sql`and g.notified_at is null` : sql``}
      ${id ? sql`and g.id = ${id}` : sql``}
    order by g.deadline asc nulls last, g.created_at desc
  `
  const iso = (d: Date | null) => d?.toISOString() ?? null
  return rows.map(r => ({
    id: r.id,
    source: r.source,
    url: r.url,
    kind: r.kind,
    digital: r.digital,
    ai: r.ai,
    verdict: r.verdict,
    verdictReason: r.verdict_reason,
    title: r.title,
    issuer: r.issuer,
    summary: r.summary,
    opensAt: iso(r.opens_at),
    deadline: iso(r.deadline),
    maxAmount: r.max_amount === null ? null : Number(r.max_amount),
    funding: r.funding,
    requirements: r.requirements as Requirement[],
    application: r.application as Application | null,
    notifiedAt: iso(r.notified_at),
    liked: r.liked_at !== null,
    hasFolder: r.folder_at !== null,
    folderFilled: r.folder_filled_at !== null,
    folderFilling: r.folder_filling,
    folderFailed: r.folder_failed_at !== null,
    folderNote: r.folder_note,
    closed: r.closed,
    createdAt: r.created_at.toISOString(),
    runId: r.run_id,
  }))
}

const evaluate = (grants: RadarGrant[], profile: RadarProfile, now: Date): EvaluatedGrant[] =>
  grants.map(g => ({ ...g, ...evaluateRadarGrant(g, profile, now) }))

export async function listEvaluatedGrants(sql: Sql, now = new Date()): Promise<EvaluatedGrant[]> {
  const [{ profile }, grants] = await Promise.all([readRadarSettings(sql), listGrants(sql, now)])
  return evaluate(grants, profile, now)
}

// Un bando aperto (o con cartella), valutato, col testo letto e il profilo
// (esportazione, cartella)
export async function readGrantDocument(sql: Sql, id: string, now = new Date()) {
  const [[row], [grant], { profile }] = await Promise.all([
    sql<{ content: string }[]>`
      select d.content from radar_grants g join radar_documents d on d.id = g.document_id where g.id = ${id}
    `,
    listGrants(sql, now, { id, withFolders: true }),
    readRadarSettings(sql),
  ])
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Bando non trovato' })
  if (!grant) throw createError({ statusCode: 404, statusMessage: 'Bando chiuso o scaduto' })
  return { grant: { ...grant, ...evaluateRadarGrant(grant, profile, now) }, content: row.content, profile }
}

// Il cuore: un bando interessante per noi resta segnato anche se si rilegge
export async function setGrantLiked(sql: Sql, id: string, liked: boolean) {
  const [row] = await sql`
    update radar_grants set liked_at = ${liked ? sql`coalesce(liked_at, now())` : null}
    where id = ${id}
    returning id
  `
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Bando non trovato' })
}

// ---------- mail ----------

const DIGEST_ORDER = { eligible: 0, to_verify: 1, excluded: 2 }

// Manda il riepilogo se c'è almeno un bando mai mandato nella ricerca
// scelta; restituisce quanti
export async function sendDigest(sql: Sql, mailer: Mailer, now = new Date(), settings?: RadarSettings): Promise<number> {
  const { notify, profile, search } = settings ?? await readRadarSettings(sql)
  if (!notify.emails.length) throw createError({ statusCode: 422, statusMessage: 'Nessun indirizzo a cui mandare la mail' })
  const candidates = evaluate(await listGrants(sql, now, { unnotified: true }), profile, now)
    .filter(g => isInScope(g, search) && isDigestCandidate(g))
    .sort((a, b) => DIGEST_ORDER[a.eligibility] - DIGEST_ORDER[b.eligibility])
  if (!candidates.length) return 0
  // Si prenotano prima dell'invio: il giro e "Invia mail ora" insieme non
  // mandano due volte gli stessi bandi
  const claimed = (await sql<{ id: string }[]>`
    update radar_grants set notified_at = ${now}
    where id = any(${candidates.map(g => g.id)}::uuid[]) and notified_at is null
    returning id
  `).map(r => r.id)
  const grants = candidates.filter(g => claimed.includes(g.id))
  if (!grants.length) return 0
  try {
    await mailer({ to: notify.emails, subject: digestSubject(grants), html: digestHtml(grants), text: digestText(grants) })
  }
  catch (err) {
    await sql`update radar_grants set notified_at = null where id = any(${claimed}::uuid[])`
    throw err
  }
  await sql`update radar_state set last_digest_at = ${now} where id = 1`
  return grants.length
}

// ---------- scan ----------

// Le fonti dipendono dalla ricerca; lettura, giudizio e scelta dei link
// sommano i token in `usage`, che finisce nel registro
export type RadarDeps = {
  sources: (scope: Scope) => RadarSource[]
  reader: GrantReader | null
  judge: GrantJudge | null
  mailer: Mailer | null
  usage: TokenUsage
  model: string
}

export const radarDeps = (): RadarDeps => {
  const usage = emptyUsage()
  const llm = hasLlm()
  const picker = llmLinkPicker(usage)
  return {
    sources: scope => radarSources(scope, picker),
    reader: llm ? llmReader(usage) : null,
    judge: llm ? llmJudge(usage) : null,
    mailer: hasMailer() ? resendMailer() : null,
    usage,
    model: llmModel(),
  }
}

// Legge tutta la coda (a lotti, più testi insieme) e giudica i bandi nuovi
// o con un profilo cambiato. Aggiorna `stats` man mano.
async function readAndJudge(sql: Sql, deps: RadarDeps, runId: string, stats: RunStats, progress: () => Promise<void>, now: Date) {
  const failed: string[] = []
  for (;;) {
    const r = await readPending(sql, deps.reader!, { concurrency: READ_CONCURRENCY, skip: failed, runId })
    failed.push(...r.failed)
    stats.read += r.read
    stats.grants += r.grants
    await progress()
    if (r.unavailable) {
      stats.errors.push('Modello AI non disponibile: il resto della coda si legge al prossimo scan')
      return
    }
    if (!r.tried.length) break
  }
  await judge(sql, deps, stats, now)
}

async function judge(sql: Sql, deps: RadarDeps, stats: RunStats, now: Date) {
  const j = await judgeGrants(sql, deps.judge!, await readRadarSettings(sql), now)
  stats.judged += j.judged
  if (j.unavailable) stats.errors.push('Modello AI non disponibile: il giudizio dei bandi rimasti si fa al prossimo scan')
}

// Uno scan registrato: scarica le fonti della ricerca, legge, giudica e
// manda la mail coi bandi nuovi. Chi chiama tiene il turno
export async function runScan(sql: Sql, deps: RadarDeps, scope: Scope, now = new Date()) {
  const stats: RunStats = emptyStats()
  const id = await startRun(sql, scope, deps.model)
  const progress = () => saveRun(sql, id, stats, deps.usage)
  try {
    if (scope.groups.length) {
      // Un sito giù resta giù fino alla fine di questo scan, non oltre
      const ingest = await withDownHosts(() => ingestSources(sql, deps.sources(scope), now, async (r) => {
        addSource(stats, r)
        await progress()
      }))
      stats.paused.push(...ingest.paused)
      await sql`update radar_state set last_ingest_error = ${ingest.errors.join('\n') || null} where id = 1`
      await progress()
    }
    await readAndJudge(sql, deps, id, stats, progress, now)
    await mailNewGrants(sql, deps, stats, now)
    await saveRun(sql, id, stats, deps.usage, { status: 'done' })
  }
  catch (err) {
    await saveRun(sql, id, stats, deps.usage, { status: 'failed', error: (err as Error).message.slice(0, 1000) })
    throw err
  }
}

// A fine scan, se la mail è accesa: i bandi mai mandati, cioè quelli di
// questo scan più quelli di uno scan prima la cui mail non è partita. Una
// mail che non parte non fa fallire lo scan, finisce tra gli errori
async function mailNewGrants(sql: Sql, deps: RadarDeps, stats: RunStats, now: Date) {
  const settings = await readRadarSettings(sql)
  if (!deps.mailer || !settings.notify.enabled || !settings.notify.emails.length) return
  try {
    await sendDigest(sql, deps.mailer, now, settings)
  }
  catch (err) {
    stats.errors.push(`Mail non inviata: ${(err as Error).message}`)
  }
}

// Giudizio col profilo nuovo, senza scaricare né leggere: finisce nel
// registro solo se ha fatto qualcosa
async function rejudge(sql: Sql, deps: RadarDeps, now: Date) {
  const stats: RunStats = emptyStats()
  await judge(sql, deps, stats, now)
  if (!stats.judged && !stats.errors.length) return
  await sql`
    insert into radar_runs (trigger, groups, provinces, model, status, started_at, finished_at, stats, usage)
    values ('profilo', ${[]}, ${[]}, ${deps.model}, 'done', ${now}, now(), ${sql.json(stats)}, ${sql.json(deps.usage)})
  `
}

// In background col turno preso; la risposta non aspetta
function inBackground(lease: { release: () => Promise<void> }, work: () => Promise<void>) {
  void (async () => {
    try {
      await work()
    }
    catch (err) {
      console.error('[radar] giro non riuscito', err)
    }
    finally {
      await lease.release()
    }
  })()
}

function requireLlm(deps: RadarDeps) {
  if (!deps.reader || !deps.judge) {
    throw createError({ statusCode: 503, statusMessage: 'Modello AI non configurato (ANTHROPIC_API_KEY)' })
  }
}

// "Avvia scan" dal pannello: i moduli e i comuni scelti, subito. È l'unico
// modo di scaricare: niente giri automatici
export async function radarRunNow(sql: Sql, deps: RadarDeps, scope: Scope) {
  requireLlm(deps)
  const lease = await holdLease(sql)
  if (!lease) throw createError({ statusCode: 409, statusMessage: 'Il radar sta già girando' })
  inBackground(lease, () => runScan(sql, deps, scope))
}

// Profilo salvato e cambiato: si rigiudicano i bandi, se il radar è libero
// (altrimenti lo fa lo scan in corso o il prossimo)
export async function radarJudgeNow(sql: Sql, deps: RadarDeps) {
  if (!deps.reader || !deps.judge) return
  const lease = await holdLease(sql)
  if (!lease) return
  inBackground(lease, () => rejudge(sql, deps, new Date()))
}

// "Svuota": via documenti e bandi letti (cuori compresi) e fonti in pausa,
// restano impostazioni e registro. Il prossimo scan riparte da zero.
// I bandi con cartella restano col loro documento (`kept`): non si
// rileggono finché il testo non cambia.
export async function radarWipe(sql: Sql): Promise<{ deleted: number, kept: number }> {
  const lease = await acquireLease(sql)
  if (!lease) throw createError({ statusCode: 409, statusMessage: 'Il radar sta girando: riprova a import finito' })
  try {
    // Prima i bandi senza cartella, con la condizione nella delete: una
    // cartella creata nel frattempo blocca la riga e Postgres la ricontrolla
    // (la cascata da radar_documents invece non guarda folder_at). Poi i
    // documenti rimasti senza bando.
    const result = await sql.begin(async (tx) => {
      await tx`delete from radar_grants where folder_at is null`
      await tx`delete from radar_sources`
      const gone = await tx`
        delete from radar_documents d where not exists (select 1 from radar_grants g where g.document_id = d.id)
      `
      const [row] = await tx<{ kept: number }[]>`select count(*)::int as kept from radar_grants`
      return { deleted: gone.count, kept: row!.kept }
    })
    await sql`update radar_state set last_ingest_error = null where id = 1`
    return result
  }
  finally {
    await releaseLease(sql, lease)
  }
}

// "Invia mail ora" dal pannello
export async function radarDigestNow(sql: Sql, deps: RadarDeps) {
  if (!deps.mailer) throw createError({ statusCode: 503, statusMessage: 'Email non configurata (RESEND_API_KEY)' })
  return sendDigest(sql, deps.mailer)
}

export async function radarStatus(sql: Sql, deps: RadarDeps): Promise<RadarStatus> {
  const state = await readState(sql)
  return {
    lastScan: state.lastScan,
    lastIngestError: state.lastIngestError,
    lastDigestAt: state.lastDigestAt?.toISOString() ?? null,
    running: !!state.leaseUntil && state.leaseUntil > new Date(),
    pending: state.pending,
    llmConfigured: !!deps.reader,
    emailConfigured: !!deps.mailer,
    filesConfigured: cloudinaryConfig() !== null,
  }
}
