import type postgres from 'postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_RADAR_SETTINGS, type RadarSettings } from '#shared/radar'
import {
  acquireLease,
  classifyTopics,
  ingestSources,
  listEvaluatedGrants,
  radarTick,
  readPending,
  readRadarSettings,
  releaseLease,
  sendDigest,
  setGrantLiked,
  writeRadarSettings,
  type Mail,
} from '../server/utils/radar'
import { ReaderUnavailable, type GrantReader, type GrantReading, type TopicReader } from '../server/utils/radar-reader'
import type { RadarSource } from '../server/utils/radar-sources'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'

// Fonte finta: i testi si cambiano tra un giro e l'altro
// `closed`: voci che la fonte elenca come chiuse
function fakeSource(
  docs: Record<string, string>,
  { refreshDays = 0, complete = true, closed = [] as string[] } = {},
): RadarSource & { fetched: string[] } {
  const fetched: string[] = []
  return {
    slug: 'finta',
    refreshDays,
    complete,
    fetched,
    fetchListing: async () => [
      ...Object.keys(docs).map(id => ({ externalId: id, url: `https://example.com/${id}` })),
      ...closed.map(id => ({ externalId: id, url: `https://example.com/${id}`, closed: true })),
    ],
    fetchContent: async (l) => {
      fetched.push(l.externalId)
      return docs[l.externalId]!
    },
  }
}

// Il "modello": il testo dice se il bando è per le imprese, se è digitale
// (i trattori no) e il tetto di fatturato
const fakeReader: GrantReader = async ({ content }): Promise<GrantReading> => {
  if (content.startsWith('enti')) return { admitsCompanies: false }
  const max = Number(/max (\d+)/.exec(content)?.[1])
  return {
    admitsCompanies: true,
    digital: !content.includes('trattori'),
    title: content,
    issuer: 'Regione Puglia',
    summary: '',
    opensAt: null,
    deadline: content.includes('scaduto') ? new Date('2026-01-01T00:00:00Z') : null,
    maxAmount: 50_000,
    funding: '',
    requirements: max ? [{ kind: 'revenue', params: { max }, label: `Fatturato fino a ${max}`, quote: '', page: null }] : [],
  }
}

const fakeTopics: TopicReader = async g => !g.title.includes('trattori')

const NOW = new Date('2026-10-20T08:00:00Z')

const settings = (revenue: number | null, emails = ['william@didap.it']): RadarSettings => ({
  profile: { ...DEFAULT_RADAR_SETTINGS.profile, revenue },
  notify: { ...DEFAULT_RADAR_SETTINGS.notify, emails },
})

describe.skipIf(!TEST_DATABASE_URL)('radar bandi su Postgres', () => {
  let sql: postgres.Sql
  let sent: Mail[]
  const mailer = async (m: Mail) => {
    sent.push(m)
  }

  beforeAll(async () => {
    sql = await openTestDb()
  })
  afterAll(async () => {
    await sql?.end()
  })
  beforeEach(async () => {
    await resetTestDb(sql)
    sent = []
  })

  it('salva e rilegge i parametri', async () => {
    expect(await readRadarSettings(sql)).toEqual(DEFAULT_RADAR_SETTINGS)
    await writeRadarSettings(sql, settings(300_000))
    expect((await readRadarSettings(sql)).profile.revenue).toBe(300_000)
  })

  it('scarica, legge, scarta i bandi non per imprese e quelli scaduti', async () => {
    await ingestSources(sql, [fakeSource({ a: 'bando A max 1000000', b: 'enti locali', c: 'bando scaduto' })], NOW)
    expect(await readPending(sql, fakeReader)).toBe(3)
    const grants = await listEvaluatedGrants(sql, NOW)
    expect(grants.map(g => g.title)).toEqual(['bando A max 1000000'])
    expect(grants[0]!.eligibility).toBe('to_verify')
  })

  it('un testo cambiato si rilegge, uno uguale no', async () => {
    const docs = { a: 'bando A max 100' }
    await ingestSources(sql, [fakeSource(docs)], NOW)
    await readPending(sql, fakeReader)
    await ingestSources(sql, [fakeSource(docs)], NOW)
    expect(await readPending(sql, fakeReader)).toBe(0)
    await ingestSources(sql, [fakeSource({ a: 'bando A max 900' })], NOW)
    expect(await readPending(sql, fakeReader)).toBe(1)
    expect((await listEvaluatedGrants(sql, NOW))[0]!.title).toBe('bando A max 900')
  })

  it('il cuore resta anche quando il bando si rilegge', async () => {
    await ingestSources(sql, [fakeSource({ a: 'bando A' })], NOW)
    await readPending(sql, fakeReader)
    const [g] = await listEvaluatedGrants(sql, NOW)
    expect(g!.liked).toBe(false)
    await setGrantLiked(sql, g!.id, true)
    await ingestSources(sql, [fakeSource({ a: 'bando A cambiato' })], NOW)
    await readPending(sql, fakeReader)
    expect((await listEvaluatedGrants(sql, NOW))[0]).toMatchObject({ title: 'bando A cambiato', liked: true })
    await setGrantLiked(sql, g!.id, false)
    expect((await listEvaluatedGrants(sql, NOW))[0]!.liked).toBe(false)
    await expect(setGrantLiked(sql, '00000000-0000-4000-8000-000000000000', true)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('una fonte lenta non si riscarica prima dei giorni previsti', async () => {
    const first = fakeSource({ a: 'bando A' }, { refreshDays: 7 })
    await ingestSources(sql, [first], NOW)
    const second = fakeSource({ a: 'bando A' }, { refreshDays: 7 })
    await ingestSources(sql, [second], new Date('2026-10-22T08:00:00Z'))
    expect(second.fetched).toEqual([])
    const third = fakeSource({ a: 'bando A' }, { refreshDays: 7 })
    await ingestSources(sql, [third], new Date('2026-10-28T08:00:00Z'))
    expect(third.fetched).toEqual(['a'])
  })

  it('un bando sparito da un elenco completo si chiude, e rientra se riappare', async () => {
    await ingestSources(sql, [fakeSource({ a: 'bando A', b: 'bando B' })], NOW)
    await readPending(sql, fakeReader)
    await ingestSources(sql, [fakeSource({ a: 'bando A' })], NOW)
    expect((await listEvaluatedGrants(sql, NOW)).map(g => g.title)).toEqual(['bando A'])
    await ingestSources(sql, [fakeSource({ a: 'bando A', b: 'bando B' })], NOW)
    expect((await listEvaluatedGrants(sql, NOW)).map(g => g.title).sort()).toEqual(['bando A', 'bando B'])
  })

  it('un elenco parziale chiude solo i bandi segnati come chiusi', async () => {
    await ingestSources(sql, [fakeSource({ a: 'bando A', b: 'bando B' }, { complete: false })], NOW)
    await readPending(sql, fakeReader)
    // b esce dalla finestra della fonte: resta aperto
    await ingestSources(sql, [fakeSource({ a: 'bando A' }, { complete: false })], NOW)
    expect(await listEvaluatedGrants(sql, NOW)).toHaveLength(2)
    await ingestSources(sql, [fakeSource({ a: 'bando A' }, { complete: false, closed: ['b'] })], NOW)
    expect((await listEvaluatedGrants(sql, NOW)).map(g => g.title)).toEqual(['bando A'])
  })

  it('un elenco completo vuoto non chiude nulla', async () => {
    await ingestSources(sql, [fakeSource({ a: 'bando A' })], NOW)
    await readPending(sql, fakeReader)
    await ingestSources(sql, [fakeSource({})], NOW)
    expect(await listEvaluatedGrants(sql, NOW)).toHaveLength(1)
  })

  it('il limite del modello ferma la lettura e lascia la coda', async () => {
    await ingestSources(sql, [fakeSource({ a: 'uno', b: 'due' })], NOW)
    const limited: GrantReader = async () => {
      throw new ReaderUnavailable('troppi token')
    }
    expect(await readPending(sql, limited)).toBe(0)
    expect(await readPending(sql, fakeReader)).toBe(2)
  })

  it('un errore del modello si riprova al massimo tre volte', async () => {
    await ingestSources(sql, [fakeSource({ a: 'uno' })], NOW)
    const broken: GrantReader = async () => {
      throw new Error('JSON rotto')
    }
    for (let i = 0; i < 3; i++) await readPending(sql, broken)
    expect(await readPending(sql, fakeReader)).toBe(0)
  })

  it('la mail parte solo coi bandi nuovi non esclusi, e una volta sola', async () => {
    await writeRadarSettings(sql, settings(500_000))
    await ingestSources(sql, [fakeSource({ a: 'bando A max 1000000', b: 'bando B max 100000' })], NOW)
    await readPending(sql, fakeReader)

    expect(await sendDigest(sql, mailer, NOW)).toBe(1)
    expect(sent[0]!.to).toEqual(['william@didap.it'])
    expect(sent[0]!.subject).toBe('Radar bandi: 1 bando nuovo per te')
    expect(sent[0]!.text).toContain('bando A')
    expect(sent[0]!.text).not.toContain('bando B')

    expect(await sendDigest(sql, mailer, NOW)).toBe(0)

    // Parametri cambiati: B diventa candidabile e parte
    await writeRadarSettings(sql, settings(50_000))
    expect(await sendDigest(sql, mailer, NOW)).toBe(1)
    expect(sent[1]!.text).toContain('bando B')
  })

  it('con "Solo digitali" i bandi su altro non vanno in mail', async () => {
    await writeRadarSettings(sql, settings(null))
    await ingestSources(sql, [fakeSource({ a: 'bando A', t: 'trattori agricoli' })], NOW)
    await readPending(sql, fakeReader)
    // Il pannello li riceve tutti e nasconde da sé, anche coi parametri non salvati
    expect((await listEvaluatedGrants(sql, NOW)).map(g => [g.title, g.digital]).sort()).toEqual([
      ['bando A', true],
      ['trattori agricoli', false],
    ])
    expect(await sendDigest(sql, mailer, NOW)).toBe(1)
    expect(sent[0]!.text).not.toContain('trattori')

    const all = settings(null)
    all.profile.digitalOnly = false
    await writeRadarSettings(sql, all)
    expect(await sendDigest(sql, mailer, NOW)).toBe(1)
    expect(sent[1]!.text).toContain('trattori')
  })

  it('i bandi letti senza tema si classificano dal riassunto', async () => {
    await ingestSources(sql, [fakeSource({ a: 'bando A', t: 'trattori agricoli', r: 'bando rotto' })], NOW)
    await readPending(sql, fakeReader)
    // Come i bandi letti prima del filtro
    await sql`update radar_grants set digital = null`
    const topics: TopicReader = async (g) => {
      if (g.title === 'bando rotto') throw new Error('JSON rotto')
      return fakeTopics(g)
    }
    expect(await classifyTopics(sql, topics)).toBe(2)
    const digital = Object.fromEntries((await listEvaluatedGrants(sql, NOW)).map(g => [g.title, g.digital]))
    expect(digital).toEqual({ 'bando A': true, 'trattori agricoli': false, 'bando rotto': null })
    // Il limite del modello ferma tutto: si riprova al prossimo download
    const limited: TopicReader = async () => {
      throw new ReaderUnavailable('troppi token')
    }
    expect(await classifyTopics(sql, limited)).toBe(0)
  })

  it('il giro scarica, legge e manda la mail una volta al giorno', async () => {
    await writeRadarSettings(sql, settings(null))
    const deps = { sources: [fakeSource({ a: 'bando A' })], reader: fakeReader, topics: fakeTopics, mailer }
    expect(await radarTick(sql, deps, NOW)).toBe('ok')
    expect(sent).toHaveLength(1)
    expect(await radarTick(sql, deps, new Date('2026-10-20T08:15:00Z'))).toBe('ok')
    expect(sent).toHaveLength(1)
  })

  it('un giro alla volta', async () => {
    const lease = await acquireLease(sql)
    expect(lease).toBeInstanceOf(Date)
    expect(await acquireLease(sql)).toBeNull()
    expect(await radarTick(sql, { sources: [], reader: null, topics: null, mailer: null }, NOW)).toBe('busy')
    await releaseLease(sql, new Date(0))
    expect(await acquireLease(sql)).toBeNull()
    await releaseLease(sql, lease!)
    expect(await acquireLease(sql)).toBeInstanceOf(Date)
  })
})
