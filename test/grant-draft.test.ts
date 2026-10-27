import type postgres from 'postgres'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { draftSaveSchema, MAX_DRAFT_CHARS } from '#shared/grant-draft'
import { readDraft, saveDraftAndFill, saveGrantDraft } from '../server/utils/grant-draft'
import { ingestSources, listGrants, radarWipe, readPending } from '../server/utils/radar'
import type { GrantReader } from '../server/utils/radar-reader'
import type { RadarSource } from '../server/utils/radar-sources'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'
import { memoryStore } from './helpers/memory-store'

const NO_GRANT = '00000000-0000-4000-8000-000000000000'

describe('schema del salvataggio', () => {
  it('testo fino al limite, versione intera da 1 o null, niente altro', () => {
    expect(draftSaveSchema.safeParse({ content: 'x'.repeat(MAX_DRAFT_CHARS), baseVersion: null }).success).toBe(true)
    expect(draftSaveSchema.safeParse({ content: 'x'.repeat(MAX_DRAFT_CHARS + 1), baseVersion: null }).success).toBe(false)
    expect(draftSaveSchema.safeParse({ content: '', baseVersion: 3 }).success).toBe(true)
    expect(draftSaveSchema.safeParse({ content: 'a', baseVersion: 0 }).success).toBe(false)
    expect(draftSaveSchema.safeParse({ content: 'a', baseVersion: 1.5 }).success).toBe(false)
    expect(draftSaveSchema.safeParse({ content: 'a' }).success).toBe(false)
    expect(draftSaveSchema.safeParse({ content: 'a', baseVersion: null, savedBy: 'Claude' }).success).toBe(false)
  })
})

// Pagina del bando senza PDF: il riempimento finisce con il solo export
const fakeWeb = () => vi.fn(async (input: string | URL) =>
  String(input).startsWith('https://example.com/')
    ? new Response('<main><p>Bando</p></main>', { headers: { 'content-type': 'text/html' } })
    : new Response('', { status: 404 }))

const source: RadarSource = {
  slug: 'finta',
  refreshDays: 0,
  complete: true,
  fetchListing: async () => ['a', 'b'].map(x => ({ externalId: x, url: `https://example.com/${x}`, content: `bando ${x.toUpperCase()}` })),
}

const reader: GrantReader = async ({ content }) => ({
  admitsCompanies: true,
  digital: true,
  title: `Voucher ${content}`,
  issuer: 'Regione Puglia',
  summary: '',
  opensAt: null,
  deadline: null,
  maxAmount: null,
  funding: '',
  requirements: [],
  application: null,
})

describe.skipIf(!TEST_DATABASE_URL)('bozza della candidatura', () => {
  let sql: postgres.Sql
  let g: string
  let h: string

  beforeAll(async () => {
    sql = await openTestDb()
  })
  afterAll(async () => {
    await sql?.end()
  })
  beforeEach(async () => {
    await resetTestDb(sql)
    await ingestSources(sql, [source])
    await readPending(sql, reader)
    const grants = await listGrants(sql, new Date(), { withFolders: true })
    g = grants.find(x => x.title === 'Voucher bando A')!.id
    h = grants.find(x => x.title === 'Voucher bando B')!.id
  })

  // Il riempimento si raccoglie qui; finisce prima che si tolga il fetch finto
  const jobs: (() => Promise<void>)[] = []
  const running: Promise<void>[] = []
  const run = (job: () => Promise<void>) => {
    jobs.push(job)
  }
  afterEach(async () => {
    for (const job of jobs.splice(0)) running.push(job())
    await Promise.allSettled(running.splice(0))
    vi.unstubAllGlobals()
  })

  const grantRow = async (id: string) =>
    (await sql<{ folder_at: Date | null, liked_at: Date | null, folder_filled_at: Date | null }[]>`
      select folder_at, liked_at, folder_filled_at from radar_grants where id = ${id}
    `)[0]

  it('nessuna bozza: null', async () => {
    expect(await readDraft(sql, g)).toBeNull()
  })

  it('prima bozza: versione 1, bando protetto', async () => {
    const { draft, folderCreated } = await saveGrantDraft(sql, { grantId: g, content: '# Domanda', baseVersion: null, savedBy: 'Ale', byClaude: false })
    expect(draft).toMatchObject({ content: '# Domanda', version: 1, savedBy: 'Ale', byClaude: false })
    expect(new Date(draft.savedAt).getTime()).not.toBeNaN()
    expect(folderCreated).toBe(true)
    const row = await grantRow(g)
    expect(row!.folder_at).not.toBeNull()
    expect(row!.liked_at).not.toBeNull()
    await radarWipe(sql)
    expect(await readDraft(sql, g)).toMatchObject({ version: 1 })
    // Il bando senza bozza invece se n'è andato
    expect(await grantRow(h)).toBeUndefined()
  })

  it('da versione vecchia: 409 con chi ha salvato, niente scritto', async () => {
    await saveGrantDraft(sql, { grantId: g, content: 'uno', baseVersion: null, savedBy: 'Ale', byClaude: false })
    const second = await saveGrantDraft(sql, { grantId: g, content: 'due', baseVersion: 1, savedBy: 'Ale', byClaude: true })
    // La cartella c'era già
    expect(second.folderCreated).toBe(false)
    expect(second.draft).toMatchObject({ content: 'due', version: 2, byClaude: true })
    await expect(saveGrantDraft(sql, { grantId: g, content: 'tre', baseVersion: 1, savedBy: 'Bea', byClaude: false }))
      .rejects.toMatchObject({
        statusCode: 409,
        statusMessage: 'La bozza è cambiata',
        data: { version: 2, savedBy: 'Ale', byClaude: true, savedAt: second.draft.savedAt },
      })
    await expect(saveGrantDraft(sql, { grantId: g, content: 'tre', baseVersion: null, savedBy: 'Bea', byClaude: false }))
      .rejects.toMatchObject({ statusCode: 409 })
    // Una versione che non c'è ancora vale come vecchia
    await expect(saveGrantDraft(sql, { grantId: g, content: 'tre', baseVersion: 3, savedBy: 'Bea', byClaude: false }))
      .rejects.toMatchObject({ statusCode: 409 })
    expect(await readDraft(sql, g)).toMatchObject({ content: 'due', version: 2, savedBy: 'Ale', byClaude: true })
  })

  it('senza bozza, una versione dichiarata è rifiutata', async () => {
    await expect(saveGrantDraft(sql, { grantId: g, content: 'uno', baseVersion: 1, savedBy: 'Ale', byClaude: false }))
      .rejects.toMatchObject({ statusCode: 409, data: undefined })
    expect(await readDraft(sql, g)).toBeNull()
    expect((await grantRow(g))!.folder_at).toBeNull()
  })

  it('due salvataggi insieme dalla stessa versione: uno solo passa', async () => {
    await saveGrantDraft(sql, { grantId: g, content: 'uno', baseVersion: null, savedBy: 'Ale', byClaude: false })
    const results = await Promise.allSettled([
      saveGrantDraft(sql, { grantId: g, content: 'Ale', baseVersion: 1, savedBy: 'Ale', byClaude: false }),
      saveGrantDraft(sql, { grantId: g, content: 'Claude', baseVersion: 1, savedBy: 'Bea', byClaude: true }),
    ])
    const ok = results.filter(r => r.status === 'fulfilled')
    const ko = results.filter(r => r.status === 'rejected')
    expect(ok).toHaveLength(1)
    expect(ko).toHaveLength(1)
    expect(ko[0]!.reason).toMatchObject({ statusCode: 409, data: { version: 2 } })
    const winner = ok[0]!.value.draft
    expect(winner.version).toBe(2)
    expect(await readDraft(sql, g)).toEqual(winner)

    // Anche due prime bozze insieme: una sola
    const firsts = await Promise.allSettled([
      saveGrantDraft(sql, { grantId: h, content: 'A', baseVersion: null, savedBy: 'Ale', byClaude: false }),
      saveGrantDraft(sql, { grantId: h, content: 'B', baseVersion: null, savedBy: 'Bea', byClaude: false }),
    ])
    expect(firsts.map(r => r.status).sort()).toEqual(['fulfilled', 'rejected'])
    expect(await readDraft(sql, h)).toMatchObject({ version: 1 })
  })

  it('senza store la bozza si salva, con store parte il riempimento', async () => {
    vi.stubGlobal('fetch', fakeWeb())
    const first = await saveDraftAndFill(sql, null, { grantId: g, content: 'senza store', baseVersion: null, savedBy: 'Ale', byClaude: false }, run)
    expect(first).toMatchObject({ draft: { version: 1 }, folderCreated: true })
    expect(jobs).toHaveLength(0)
    expect((await grantRow(g))!.folder_at).not.toBeNull()

    const store = memoryStore()
    await saveDraftAndFill(sql, store, { grantId: h, content: 'con store', baseVersion: null, savedBy: 'Ale', byClaude: true }, run)
    expect(jobs).toHaveLength(1)
    for (const job of jobs.splice(0)) await job()
    expect((await grantRow(h))!.folder_filled_at).not.toBeNull()
    expect(store.files.size).toBe(1)

    // Cartella già creata: nessun nuovo riempimento
    await saveDraftAndFill(sql, store, { grantId: h, content: 'ancora', baseVersion: 1, savedBy: 'Ale', byClaude: true }, run)
    expect(jobs).toHaveLength(0)
    expect(await readDraft(sql, h)).toMatchObject({ content: 'ancora', version: 2 })
  })

  it('se il riempimento non parte, la bozza risulta salvata lo stesso', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const broken = () => {
        throw new Error('coda piena')
      }
      const saved = await saveDraftAndFill(sql, memoryStore(), { grantId: g, content: 'uno', baseVersion: null, savedBy: 'Ale', byClaude: true }, broken)
      expect(saved).toMatchObject({ draft: { content: 'uno', version: 1 }, folderCreated: true })
      expect(await readDraft(sql, g)).toMatchObject({ version: 1 })
      expect(logged).toHaveBeenCalledWith(expect.stringContaining('[bozza]'), expect.objectContaining({ message: 'coda piena' }))
    }
    finally {
      logged.mockRestore()
    }
  })

  it('bando inesistente: 404; testo oltre il limite: rifiutato dallo schema', async () => {
    await expect(readDraft(sql, NO_GRANT)).rejects.toMatchObject({ statusCode: 404, statusMessage: 'Bando non trovato' })
    await expect(saveGrantDraft(sql, { grantId: NO_GRANT, content: 'x', baseVersion: null, savedBy: 'Ale', byClaude: false }))
      .rejects.toMatchObject({ statusCode: 404 })
    expect(draftSaveSchema.safeParse({ content: 'x'.repeat(MAX_DRAFT_CHARS + 1), baseVersion: null }).success).toBe(false)
  })

  it('la bozza se ne va con il bando', async () => {
    await saveGrantDraft(sql, { grantId: g, content: 'uno', baseVersion: null, savedBy: 'Ale', byClaude: false })
    await sql`delete from radar_grants where id = ${g}`
    expect((await sql`select count(*)::int as n from grant_drafts`)[0]!.n).toBe(0)
  })
})
