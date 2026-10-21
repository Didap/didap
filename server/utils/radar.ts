import { createHash } from 'node:crypto'
import { createError } from 'h3'
import type postgres from 'postgres'
import { romeClock, romeDate } from '#shared/dates'
import {
  evaluateGrant,
  isDigestCandidate,
  isInScope,
  parseRadarSettings,
  type EvaluatedGrant,
  type RadarGrant,
  type RadarNotify,
  type RadarProfile,
  type RadarSettings,
  type RadarStatus,
  type Requirement,
} from '#shared/radar'
import { digestHtml, digestSubject, digestText } from '../emails/radar-digest'
import { hasMailer, resendMailer, type Mailer } from './mail'
import {
  hasLlm,
  llmMaxChars,
  llmReader,
  llmTopicReader,
  ReaderUnavailable,
  type GrantReader,
  type TopicReader,
} from './radar-reader'
import { radarSources, type Listing, type RadarSource } from './radar-sources'

// Radar bandi: scarica i bandi dalle fonti, li fa leggere al modello, li
// valuta coi parametri del pannello e manda la mail di riepilogo.
// Tutto riceve il client Postgres come parametro (testabile senza Nitro).

type Sql = postgres.Sql

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

// Bandi ancora da leggere: la stessa condizione per la coda e per il contatore
const queued = (sql: Sql) => sql`
  closed_at is null and (status = 'pending' or (status = 'failed' and attempts < ${MAX_ATTEMPTS}))
`

// La riga id = 1 esiste sempre: la crea lo schema
async function readState(sql: Sql) {
  const [row] = await sql`
    select last_ingest_at, last_ingest_error, to_char(last_digest_on, 'YYYY-MM-DD') as last_digest_on,
      last_digest_at, lease_until,
      (select count(*)::int from radar_documents where ${queued(sql)}) as pending
    from radar_state where id = 1
  `
  return {
    lastIngestAt: row!.last_ingest_at as Date | null,
    lastIngestError: row!.last_ingest_error as string | null,
    lastDigestOn: row!.last_digest_on as string | null,
    lastDigestAt: row!.last_digest_at as Date | null,
    leaseUntil: row!.lease_until as Date | null,
    pending: row!.pending as number,
  }
}

const LEASE_MINUTES = 60

// Un giro alla volta, anche con più istanze del sito: chi prende il turno
// lo tiene finché non lo rilascia o scade (processo morto a metà).
// Restituisce la scadenza, che fa da gettone per rilasciarlo; null se è occupato.
export async function acquireLease(sql: Sql): Promise<Date | null> {
  const until = new Date(Date.now() + LEASE_MINUTES * 60_000)
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

// ---------- scaricamento ----------

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const MAX_ERRORS = 5

// Scarica gli elenchi e salva i testi nuovi o cambiati come "pending".
// Le fonti sono indipendenti e girano insieme; una fonte giù non ferma le
// altre. Restituisce gli errori.
export async function ingestSources(sql: Sql, sources: RadarSource[], now = new Date()): Promise<string[]> {
  const errors = await Promise.all(sources.map(s => ingestSource(sql, s, now)))
  return errors.flat()
}

async function ingestSource(sql: Sql, source: RadarSource, now: Date): Promise<string[]> {
  const errors: string[] = []
  let listings
  try {
    listings = await source.fetchListing()
  }
  catch (err) {
    return [`${source.slug}: ${(err as Error).message}`]
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
    const prev = known.get(listing.externalId)
    if (prev && source.refreshDays && prev.fetched_at.getTime() > fresh) continue
    let content
    try {
      content = listing.content ?? await source.fetchContent!(listing)
    }
    catch (err) {
      if (errors.length < MAX_ERRORS) errors.push(`${source.slug}: ${(err as Error).message}`)
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
  }
  // Testi uguali: solo l'URL (può essersi spostato) e la data, in un colpo
  if (unchanged.length) {
    await sql`
      update radar_documents d set url = v.url, fetched_at = ${now}
      from unnest(${unchanged.map(l => l.externalId)}::text[], ${unchanged.map(l => l.url)}::text[]) as v(id, url)
      where d.source = ${source.slug} and d.external_id = v.id
    `
  }
  return errors
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

// Legge i testi in coda e restituisce quanti ne ha letti. Se il modello non
// risponde (limiti, chiave, servizio giù) si ferma: il resto resta in coda
// per il giro successivo, senza tentativi persi.
export async function readPending(sql: Sql, reader: GrantReader, limit = READ_BATCH): Promise<number> {
  // Il modello legge solo l'inizio: il resto non serve caricarlo
  const docs = await sql<{ id: string, url: string, content: string }[]>`
    select id, url, left(content, ${llmMaxChars()}) as content from radar_documents
    where ${queued(sql)}
    order by fetched_at, id
    limit ${limit}
  `
  let read = 0
  for (const doc of docs) {
    let reading
    try {
      reading = await reader(doc)
    }
    catch (err) {
      if (err instanceof ReaderUnavailable) break
      await sql`
        update radar_documents set status = 'failed', attempts = attempts + 1, error = ${(err as Error).message.slice(0, 1000)}
        where id = ${doc.id}
      `
      continue
    }
    await sql.begin(async (tx) => {
      if (reading.admitsCompanies) {
        await tx`
          insert into radar_grants (document_id, digital, title, issuer, summary, opens_at, deadline, max_amount, funding, requirements)
          values (${doc.id}, ${reading.digital}, ${reading.title}, ${reading.issuer}, ${reading.summary}, ${reading.opensAt},
            ${reading.deadline}, ${reading.maxAmount}, ${reading.funding}, ${tx.json(reading.requirements)})
          on conflict (document_id) do update set
            digital = excluded.digital, title = excluded.title, issuer = excluded.issuer, summary = excluded.summary,
            opens_at = excluded.opens_at, deadline = excluded.deadline, max_amount = excluded.max_amount,
            funding = excluded.funding, requirements = excluded.requirements, updated_at = now()
        `
      }
      else {
        await tx`delete from radar_grants where document_id = ${doc.id}`
      }
      const status = reading.admitsCompanies ? 'read' : 'skipped'
      await tx`update radar_documents set status = ${status}, error = null, read_at = now() where id = ${doc.id}`
    })
    read++
  }
  return read
}

// Il tema (sviluppo IT, IA, servizi digitali) dei bandi letti che non ce
// l'hanno: quelli letti prima del filtro, o se il modello non l'ha detto.
// Gira col download, una volta al giorno: un errore si riprova domani.
export async function classifyTopics(sql: Sql, topics: TopicReader): Promise<number> {
  const grants = await sql<{ id: string, title: string, issuer: string, summary: string, funding: string }[]>`
    select g.id, g.title, g.issuer, g.summary, g.funding
    from radar_grants g join radar_documents d on d.id = g.document_id
    where g.digital is null and d.status = 'read' and d.closed_at is null
    order by g.created_at
  `
  let done = 0
  for (const g of grants) {
    let digital
    try {
      digital = await topics(g)
    }
    catch (err) {
      if (err instanceof ReaderUnavailable) break
      continue
    }
    await sql`update radar_grants set digital = ${digital} where id = ${g.id}`
    done++
  }
  return done
}

// ---------- elenco e valutazione ----------

// Bandi letti, aperti e non scaduti, dalla scadenza più vicina
async function listGrants(sql: Sql, now: Date, { unnotified = false } = {}): Promise<RadarGrant[]> {
  const rows = await sql`
    select g.id, d.source, d.url, g.digital, g.title, g.issuer, g.summary, g.opens_at, g.deadline, g.max_amount,
      g.funding, g.requirements, g.notified_at, g.liked_at, g.created_at
    from radar_grants g join radar_documents d on d.id = g.document_id
    where d.status = 'read' and d.closed_at is null and (g.deadline is null or g.deadline >= ${now})
      ${unnotified ? sql`and g.notified_at is null` : sql``}
    order by g.deadline asc nulls last, g.created_at desc
  `
  const iso = (d: Date | null) => d?.toISOString() ?? null
  return rows.map(r => ({
    id: r.id,
    source: r.source,
    url: r.url,
    digital: r.digital,
    title: r.title,
    issuer: r.issuer,
    summary: r.summary,
    opensAt: iso(r.opens_at),
    deadline: iso(r.deadline),
    maxAmount: r.max_amount === null ? null : Number(r.max_amount),
    funding: r.funding,
    requirements: r.requirements as Requirement[],
    notifiedAt: iso(r.notified_at),
    liked: r.liked_at !== null,
    createdAt: r.created_at.toISOString(),
  }))
}

const evaluate = (grants: RadarGrant[], profile: RadarProfile, now: Date): EvaluatedGrant[] =>
  grants.map(g => ({ ...g, ...evaluateGrant(g.requirements, profile, now) }))

export async function listEvaluatedGrants(sql: Sql, now = new Date()): Promise<EvaluatedGrant[]> {
  const [{ profile }, grants] = await Promise.all([readRadarSettings(sql), listGrants(sql, now)])
  return evaluate(grants, profile, now)
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

// Manda il riepilogo se c'è almeno un bando nuovo; restituisce quanti
export async function sendDigest(sql: Sql, mailer: Mailer, now = new Date(), settings?: RadarSettings): Promise<number> {
  const { notify, profile } = settings ?? await readRadarSettings(sql)
  if (!notify.emails.length) throw createError({ statusCode: 422, statusMessage: 'Nessun indirizzo a cui mandare la mail' })
  const candidates = evaluate(await listGrants(sql, now, { unnotified: true }), profile, now)
    .filter(g => isInScope(g, profile) && isDigestCandidate(g))
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

// ---------- calendario ----------

const INGEST_FROM = 6 * 60

// Una volta al giorno dalle 6 di Roma, così la mail del mattino è aggiornata
export function shouldIngest(lastIngestAt: Date | null, now: Date) {
  if (!lastIngestAt) return true
  const clock = romeClock(now)
  return romeDate(lastIngestAt) !== clock.date && clock.minutes >= INGEST_FROM
}

// Nei giorni scelti, dall'ora scelta in poi, una volta al giorno
export function shouldSendDigest(notify: RadarNotify, lastDigestOn: string | null, now: Date) {
  if (!notify.enabled || !notify.emails.length) return false
  const clock = romeClock(now)
  const [h, m] = notify.time.split(':').map(Number)
  return notify.weekdays.includes(clock.weekday) && clock.minutes >= h! * 60 + m! && lastDigestOn !== clock.date
}

// ---------- giro ----------

export type RadarDeps = {
  sources: RadarSource[]
  reader: GrantReader | null
  topics: TopicReader | null
  mailer: Mailer | null
}

export const radarDeps = (): RadarDeps => ({
  sources: radarSources(),
  reader: hasLlm() ? llmReader() : null,
  topics: hasLlm() ? llmTopicReader() : null,
  mailer: hasMailer() ? resendMailer() : null,
})

async function ingestAll(sql: Sql, deps: RadarDeps, now: Date) {
  const errors = await ingestSources(sql, deps.sources, now)
  await sql`update radar_state set last_ingest_at = ${now}, last_ingest_error = ${errors.join('\n') || null} where id = 1`
  if (deps.topics) await classifyTopics(sql, deps.topics)
}

// Chiamato ogni 15 minuti: scarica una volta al giorno, legge la coda
// (a rate se il modello ha limiti), manda la mail all'ora giusta
export async function radarTick(sql: Sql, deps: RadarDeps, now = new Date()) {
  const lease = await acquireLease(sql)
  if (!lease) return 'busy'
  try {
    const [state, settings] = await Promise.all([readState(sql), readRadarSettings(sql)])
    if (deps.reader) {
      if (shouldIngest(state.lastIngestAt, now)) await ingestAll(sql, deps, now)
      await readPending(sql, deps.reader)
    }
    if (deps.mailer && shouldSendDigest(settings.notify, state.lastDigestOn, now)) {
      await sendDigest(sql, deps.mailer, now, settings)
      // Il giorno conta come fatto anche senza bandi nuovi: si riprova domani
      await sql`update radar_state set last_digest_on = ${romeDate(now)} where id = 1`
    }
    return 'ok'
  }
  finally {
    await releaseLease(sql, lease)
  }
}

// "Aggiorna ora" dal pannello: scarica e legge subito, senza aspettare
export async function radarRunNow(sql: Sql, deps: RadarDeps) {
  const reader = deps.reader
  if (!reader) throw createError({ statusCode: 503, statusMessage: 'Modello AI non configurato (RADAR_LLM_API_KEY)' })
  const lease = await acquireLease(sql)
  if (!lease) throw createError({ statusCode: 409, statusMessage: 'Il radar sta già girando' })
  // Può durare minuti: la risposta non lo aspetta
  void (async () => {
    try {
      await ingestAll(sql, deps, new Date())
      await readPending(sql, reader)
    }
    catch (err) {
      console.error('[radar] aggiornamento non riuscito', err)
    }
    finally {
      await releaseLease(sql, lease)
    }
  })()
}

// "Invia mail ora" dal pannello
export async function radarDigestNow(sql: Sql, deps: RadarDeps) {
  if (!deps.mailer) throw createError({ statusCode: 503, statusMessage: 'Email non configurata (RESEND_API_KEY)' })
  return sendDigest(sql, deps.mailer)
}

export async function radarStatus(sql: Sql, deps: RadarDeps): Promise<RadarStatus> {
  const state = await readState(sql)
  return {
    lastIngestAt: state.lastIngestAt?.toISOString() ?? null,
    lastIngestError: state.lastIngestError,
    lastDigestAt: state.lastDigestAt?.toISOString() ?? null,
    running: !!state.leaseUntil && state.leaseUntil > new Date(),
    pending: state.pending,
    llmConfigured: !!deps.reader,
    emailConfigured: !!deps.mailer,
  }
}
