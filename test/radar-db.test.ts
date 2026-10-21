import type postgres from 'postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_RADAR_SETTINGS, emptyUsage, type RadarSettings } from '#shared/radar'
import {
  acquireLease,
  ingestSources,
  judgeGrants,
  listEvaluatedGrants,
  listRuns,
  radarTick,
  radarWipe,
  readPending,
  readRadarSettings,
  releaseLease,
  sendDigest,
  setGrantLiked,
  writeRadarSettings,
  type Mail,
  type RadarDeps,
} from '../server/utils/radar'
import { ReaderUnavailable, type GrantJudge, type GrantReader, type GrantReading } from '../server/utils/radar-reader'
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
    group: 'regione',
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
    application: null,
  }
}

// Il giudizio: "sicuro" sì, "escluso" no, il resto da capire
const fakeJudge: GrantJudge = async g => ({
  verdict: g.title.includes('sicuro') ? 'yes' : g.title.includes('escluso') ? 'no' : 'maybe',
  reason: 'Motivo',
  digital: !g.title.includes('trattori'),
})

const deps = (sources: ReturnType<typeof fakeSource>[], mailer: RadarDeps['mailer'] = null): RadarDeps => ({
  sources: () => sources,
  reader: fakeReader,
  judge: fakeJudge,
  mailer,
  usage: emptyUsage(),
  model: 'claude-haiku-5-5',
})

const NOW = new Date('2026-10-20T08:00:00Z')

const settings = (revenue: number | null, emails = ['william@didap.it']): RadarSettings => ({
  search: { ...DEFAULT_RADAR_SETTINGS.search },
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
    expect((await readPending(sql, fakeReader)).read).toBe(3)
    const grants = await listEvaluatedGrants(sql, NOW)
    expect(grants.map(g => g.title)).toEqual(['bando A max 1000000'])
    expect(grants[0]!.eligibility).toBe('to_verify')
  })

  it('un testo cambiato si rilegge, uno uguale no', async () => {
    const docs = { a: 'bando A max 100' }
    await ingestSources(sql, [fakeSource(docs)], NOW)
    await readPending(sql, fakeReader)
    await ingestSources(sql, [fakeSource(docs)], NOW)
    expect((await readPending(sql, fakeReader)).read).toBe(0)
    await ingestSources(sql, [fakeSource({ a: 'bando A max 900' })], NOW)
    expect((await readPending(sql, fakeReader)).read).toBe(1)
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
    expect(await readPending(sql, limited)).toMatchObject({ read: 0, unavailable: true })
    expect((await readPending(sql, fakeReader, { concurrency: 2 })).read).toBe(2)
  })

  it('un errore del modello si riprova al massimo tre volte', async () => {
    await ingestSources(sql, [fakeSource({ a: 'uno' })], NOW)
    const broken: GrantReader = async () => {
      throw new Error('JSON rotto')
    }
    for (let i = 0; i < 3; i++) await readPending(sql, broken)
    expect((await readPending(sql, fakeReader)).tried).toBe(0)
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
    all.search.digitalOnly = false
    await writeRadarSettings(sql, all)
    expect(await sendDigest(sql, mailer, NOW)).toBe(1)
    expect(sent[1]!.text).toContain('trattori')
  })

  it('il giudizio decide i casi aperti, esclude, e si rifà quando cambia il profilo', async () => {
    await ingestSources(sql, [fakeSource({ a: 'bando sicuro', b: 'bando escluso', c: 'bando incerto', t: 'trattori' })], NOW)
    await readPending(sql, fakeReader)
    // Lettura senza tema: lo completa il giudizio
    await sql`update radar_grants set digital = null where title = 'trattori'`
    const { profile } = await readRadarSettings(sql)
    expect(await judgeGrants(sql, fakeJudge, profile, NOW)).toEqual({ judged: 4, unavailable: false })
    const byTitle = Object.fromEntries((await listEvaluatedGrants(sql, NOW)).map(g => [g.title, g]))
    expect(byTitle['bando sicuro']!.eligibility).toBe('eligible')
    expect(byTitle['bando escluso']!.eligibility).toBe('excluded')
    expect(byTitle['bando incerto']!.eligibility).toBe('to_verify')
    expect(byTitle.trattori!.digital).toBe(false)
    // Stesso profilo: niente da rifare; profilo nuovo: tutti di nuovo
    expect((await judgeGrants(sql, fakeJudge, profile, NOW)).judged).toBe(0)
    expect((await judgeGrants(sql, fakeJudge, { ...profile, employees: 12 }, NOW)).judged).toBe(4)
    const limited: GrantJudge = async () => {
      throw new ReaderUnavailable('troppi token')
    }
    expect(await judgeGrants(sql, limited, profile, NOW)).toEqual({ judged: 0, unavailable: true })
  })

  it('il giro importa la ricerca salvata, lo registra e manda la mail una volta al giorno', async () => {
    await writeRadarSettings(sql, settings(null))
    const d = deps([fakeSource({ a: 'bando A', b: 'enti locali' })], mailer)
    d.usage.input = 1000
    expect(await radarTick(sql, d, NOW)).toBe('ok')
    expect(sent).toHaveLength(1)
    const [run] = await listRuns(sql)
    expect(run).toMatchObject({
      trigger: 'automatico',
      status: 'done',
      groups: ['governo', 'regione'],
      stats: { listed: 2, queued: 2, read: 2, grants: 1, judged: 1, errors: [] },
      usage: { input: 1000 },
    })
    // Un quarto d'ora dopo: niente da fare, niente nel registro
    expect(await radarTick(sql, d, new Date('2026-10-20T08:15:00Z'))).toBe('ok')
    expect(sent).toHaveLength(1)
    expect(await listRuns(sql)).toHaveLength(1)
  })

  it('i comuni delle province non scelte restano fuori dalla mail', async () => {
    const comune = { ...fakeSource({ a: 'bando del comune' }), slug: 'comune-072006', group: 'comuni' as const }
    await ingestSources(sql, [comune], NOW)
    await readPending(sql, fakeReader)
    await writeRadarSettings(sql, settings(null))
    expect(await sendDigest(sql, mailer, NOW)).toBe(0)
    const s = settings(null)
    s.search = { ...s.search, groups: ['comuni'], provinces: ['BA'] }
    await writeRadarSettings(sql, s)
    expect(await sendDigest(sql, mailer, NOW)).toBe(1)
  })

  it('svuota i dati ma tiene impostazioni e registro', async () => {
    await writeRadarSettings(sql, settings(100))
    await radarTick(sql, deps([fakeSource({ a: 'bando A' })]), NOW)
    expect(await radarWipe(sql)).toBe(1)
    expect(await listEvaluatedGrants(sql, NOW)).toEqual([])
    expect((await readRadarSettings(sql)).profile.revenue).toBe(100)
    expect(await listRuns(sql)).toHaveLength(1)
  })

  it('un giro alla volta', async () => {
    const lease = await acquireLease(sql)
    expect(lease).toBeInstanceOf(Date)
    expect(await acquireLease(sql)).toBeNull()
    expect(await radarTick(sql, { ...deps([]), reader: null, judge: null }, NOW)).toBe('busy')
    await releaseLease(sql, new Date(0))
    expect(await acquireLease(sql)).toBeNull()
    await releaseLease(sql, lease!)
    expect(await acquireLease(sql)).toBeInstanceOf(Date)
  })
})
