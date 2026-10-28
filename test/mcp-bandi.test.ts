import type postgres from 'postgres'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMUNI_PUGLIA } from '#shared/comuni-puglia'
import { comuneSlug, DEFAULT_RADAR_SETTINGS, ELIGIBILITY_LABELS } from '#shared/radar'
import { addFile, createFolder, grantFolderContents } from '../server/utils/grant-files'
import { startGrantFolder } from '../server/utils/grant-folder'
import { grantSearchSchema, MAX_TOOL_IMAGE_BYTES, MAX_TOOL_TEXT, readGrantFile, readGrantText, searchGrants, textPart } from '../server/utils/mcp-bandi'
import { ingestSources, listGrants, readPending, setGrantLiked, writeRadarSettings } from '../server/utils/radar'
import type { GrantReader } from '../server/utils/radar-reader'
import type { RadarSource } from '../server/utils/radar-sources'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'
import { memoryStore } from './helpers/memory-store'

const NOW = new Date('2026-10-27T10:00:00Z')
const DAY = 86_400_000
const NO_GRANT = '00000000-0000-0000-0000-000000000000'

// Un bando finto: il contenuto è un JSON con quello che il lettore restituisce
type Spec = { title: string, issuer?: string, summary?: string, deadline?: number | null }

const reader: GrantReader = async ({ content }) => {
  const s = JSON.parse(content) as Spec
  return {
    admitsCompanies: true,
    digital: true,
    title: s.title,
    issuer: s.issuer ?? 'Regione Puglia',
    summary: s.summary ?? '',
    opensAt: null,
    deadline: s.deadline == null ? null : new Date(NOW.getTime() + s.deadline * DAY),
    maxAmount: 5000,
    funding: 'Contributo',
    requirements: [],
    application: null,
  }
}

const source = (slug: string, specs: Spec[]): RadarSource => ({
  slug,
  refreshDays: 0,
  complete: true,
  fetchListing: async () => specs.map((s, i) => ({ externalId: `${slug}-${i}`, url: `https://example.com/${slug}/${i}`, content: JSON.stringify(s) })),
})

describe('schema della ricerca', () => {
  it('limita giorni e testo', () => {
    expect(grantSearchSchema.safeParse({}).success).toBe(true)
    expect(grantSearchSchema.safeParse({ scadenzaEntroGiorni: 0 }).success).toBe(false)
    expect(grantSearchSchema.safeParse({ scadenzaEntroGiorni: 366 }).success).toBe(false)
    expect(grantSearchSchema.safeParse({ testo: 'x'.repeat(201) }).success).toBe(false)
    expect(grantSearchSchema.safeParse({ esito: ['altro'] }).success).toBe(false)
  })
})

describe('testo per Claude', () => {
  it('testo a parti', () => {
    const long = 'a'.repeat(MAX_TOOL_TEXT * 2 + 5)
    expect(textPart(long, 1)).toMatchObject({ part: 1, parts: 3 })
    expect(textPart(long, 1).text).toHaveLength(MAX_TOOL_TEXT)
    expect(textPart(long, 3).text).toHaveLength(5)
    expect(() => textPart(long, 4)).toThrow(/Parte 4 inesistente/)
    expect(() => textPart(long, 0)).toThrow(/Parte 0 inesistente/)
    expect(textPart('', 1)).toMatchObject({ part: 1, parts: 1, text: '' })
    expect(textPart('a'.repeat(MAX_TOOL_TEXT), 1)).toMatchObject({ parts: 1 })
  })

  it('un\'emoji sul confine non resta a metà', () => {
    const text = `${'a'.repeat(MAX_TOOL_TEXT - 1)}😀b`
    const [one, two] = [textPart(text, 1), textPart(text, 2)]
    expect(one.text).toHaveLength(MAX_TOOL_TEXT - 1)
    expect(one.text + two.text).toBe(text)
  })
})

describe.skipIf(!TEST_DATABASE_URL)('bandi per Claude', () => {
  let sql: postgres.Sql

  beforeAll(async () => {
    sql = await openTestDb()
  })
  afterAll(async () => {
    await sql?.end()
  })
  beforeEach(async () => {
    await resetTestDb(sql)
  })
  // I riempimenti delle cartelle finiscono prima che si tolga il fetch finto
  let jobs: Promise<void>[] = []
  afterEach(async () => {
    await Promise.allSettled(jobs)
    jobs = []
    vi.unstubAllGlobals()
  })

  async function seed(sources: RadarSource[]) {
    await ingestSources(sql, sources, NOW)
    await readPending(sql, reader, { limit: 500 })
  }

  const verdict = (title: string, v: 'yes' | 'no' | 'maybe') =>
    sql`update radar_grants set verdict = ${v} where title = ${title}`

  const saveSearch = (groups: ('governo' | 'regione' | 'comuni')[], provinces: ('BA')[] = []) =>
    writeRadarSettings(sql, { ...DEFAULT_RADAR_SETTINGS, search: { ...DEFAULT_RADAR_SETTINGS.search, groups, provinces } })

  // La cartella si crea subito, senza scaricare nulla dal sito
  async function withFolder(grantId: string) {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    await startGrantFolder(sql, memoryStore(), grantId, job => void jobs.push(job()))
  }

  it('segue la ricerca salvata e salta gli esclusi', async () => {
    await seed([
      source('incentivi-gov', [{ title: 'Credito governo' }]),
      source('regione-puglia', [{ title: 'Voucher regione' }, { title: 'Bando regione escluso' }]),
    ])
    await verdict('Bando regione escluso', 'no')
    await saveSearch(['regione'])

    const r = await searchGrants(sql, {}, NOW)
    expect(r.bandi.map(b => b.titolo)).toEqual(['Voucher regione'])
    expect(r.altri).toBe(0)
    expect(r.bandi[0]).toMatchObject({
      ente: 'Regione Puglia',
      fonte: 'Regione Puglia',
      esito: ELIGIBILITY_LABELS.eligible,
      importoMassimo: 5000,
      agevolazione: 'Contributo',
      scadenza: null,
      apertura: null,
      interessante: false,
      cartella: false,
      chiuso: false,
      url: 'https://example.com/regione-puglia/0',
    })
    expect((await searchGrants(sql, { fuoriDallaRicerca: true }, NOW)).bandi).toHaveLength(2)
    expect((await searchGrants(sql, { esito: ['escluso'] }, NOW)).bandi.map(b => b.esito)).toEqual([ELIGIBILITY_LABELS.excluded])
  })

  it('un comune conta se la sua provincia è nella ricerca', async () => {
    const bari = COMUNI_PUGLIA.find(c => c.province === 'BA')!
    await seed([source(comuneSlug(bari.istat), [{ title: 'Bando comunale' }])])
    await saveSearch(['comuni'])
    expect((await searchGrants(sql, {}, NOW)).bandi).toHaveLength(0)
    await saveSearch(['comuni'], ['BA'])
    expect((await searchGrants(sql, {}, NOW)).bandi.map(b => b.fonte)).toEqual([`Comune di ${bari.name}`])
  })

  it('filtri su testo, scadenza e interessanti', async () => {
    await seed([
      source('regione-puglia', [
        { title: 'Voucher digitale', deadline: 5, issuer: 'Puglia Sviluppo' },
        { title: 'Altro bando', deadline: 90, summary: 'Per le imprese' },
        { title: 'Senza scadenza' },
      ]),
    ])
    await saveSearch(['regione'])
    const titles = async (s: Parameters<typeof searchGrants>[1]) => (await searchGrants(sql, s, NOW)).bandi.map(b => b.titolo)

    expect(await titles({ testo: 'VOUCHER' })).toEqual(['Voucher digitale'])
    expect(await titles({ testo: 'puglia sviluppo' })).toEqual(['Voucher digitale'])
    expect(await titles({ testo: 'imprese' })).toEqual(['Altro bando'])
    expect(await titles({ scadenzaEntroGiorni: 10 })).toEqual(['Voucher digitale'])
    expect(await titles({})).toHaveLength(3)
    const [first] = (await searchGrants(sql, { testo: 'voucher' }, NOW)).bandi
    expect(first).toMatchObject({ scadenza: '2026-11-01' })

    expect(await titles({ soloInteressanti: true })).toEqual([])
    const g = (await listGrants(sql, NOW)).find(x => x.title === 'Altro bando')!
    await setGrantLiked(sql, g.id, true)
    expect(await titles({ soloInteressanti: true })).toEqual(['Altro bando'])
    expect((await searchGrants(sql, { soloInteressanti: true }, NOW)).bandi[0]!.interessante).toBe(true)
  })

  it('un bando con cartella resta anche chiuso', async () => {
    await seed([source('regione-puglia', [{ title: 'Voucher breve', deadline: 5 }, { title: 'Voucher altro', deadline: 6 }])])
    await saveSearch(['regione'])
    const g = (await listGrants(sql, NOW)).find(x => x.title === 'Voucher breve')!
    await withFolder(g.id)

    const later = new Date(NOW.getTime() + 30 * DAY)
    const r = await searchGrants(sql, {}, later)
    expect(r.bandi.map(b => b.titolo)).toEqual(['Voucher breve'])
    expect(r.bandi[0]).toMatchObject({ chiuso: true, cartella: true })
  })

  it('al massimo 50, gli altri contati', async () => {
    await seed([source('regione-puglia', Array.from({ length: 52 }, (_, i) => ({ title: `Bando ${i}`, deadline: 20 })))])
    await saveSearch(['regione'])
    const r = await searchGrants(sql, {}, NOW)
    expect(r.bandi).toHaveLength(50)
    expect(r.altri).toBe(2)
  })

  it('il testo del bando è l\'esportazione per Claude', async () => {
    await seed([source('regione-puglia', [{ title: 'Voucher digitale' }])])
    const [g] = await listGrants(sql, NOW)
    expect(await readGrantText(sql, g!.id)).toContain('titolo: "Voucher digitale"')
    await expect(readGrantText(sql, NO_GRANT)).rejects.toMatchObject({ statusCode: 404 })
    // Corto: una parte sola, senza intestazione
    expect(await readGrantText(sql, g!.id)).toMatch(/^---\n/)
  })

  it('leggi_bando a parti con la guida in testa', async () => {
    await seed([source('regione-puglia', [{ title: 'Bando lungo' }])])
    // Il testo si allunga dopo la lettura: il lettore ne vede solo l'inizio
    await sql`update radar_documents set content = content || ${'x'.repeat(MAX_TOOL_TEXT * 2)}`
    const [g] = await listGrants(sql, NOW)
    const first = await readGrantText(sql, g!.id)
    expect(first).toMatch(/^\[Parte 1 di 3\. Chiedi la parte 2 con parte: 2\.\]\n\n---\n/)
    expect(first).toContain('## Cosa fare')
    expect(first).toContain('titolo: "Bando lungo"')
    expect(await readGrantText(sql, g!.id, 1)).toBe(first)
    expect(await readGrantText(sql, g!.id, 2)).toMatch(/^\[Parte 2 di 3\. Chiedi la parte 3 con parte: 3\.\]\n\nx/)
    const last = await readGrantText(sql, g!.id, 3)
    expect(last).toMatch(/^\[Parte 3 di 3, l'ultima\.\]\n\n/)
    expect(last.endsWith('x\n')).toBe(true)
    await expect(readGrantText(sql, g!.id, 4)).rejects.toMatchObject({ statusCode: 400, statusMessage: expect.stringContaining('Parte 4 inesistente') })
  })

  describe('file della cartella', () => {
    async function folderGrant(title: string) {
      await seed([source('regione-puglia', [{ title }])])
      const g = (await listGrants(sql, NOW))[0]!
      await withFolder(g.id)
      return g.id
    }

    const put = (store: ReturnType<typeof memoryStore>, grantId: string, name: string, mime: string, data: string) =>
      addFile(sql, store, { grantId, folderId: null, name, mime, data: Buffer.from(data), userId: null }).then(f => f.id)

    it('legge i file per tipo', async () => {
      const g = await folderGrant('Bando con file')
      const store = memoryStore()
      const mdId = await put(store, g, 'nota.md', 'application/octet-stream', '# Nota')
      const pdfId = await put(store, g, 'avviso.pdf', 'application/pdf', 'x')
      const scanId = await put(store, g, 'scansione.pdf', 'application/pdf', 'x')
      const pngId = await put(store, g, 'logo.png', 'image/png', 'PNG')
      const zipId = await put(store, g, 'tutto.zip', 'application/zip', 'ZIP')
      const bigTxtId = await put(store, g, 'lungo.txt', 'text/plain', 'a'.repeat(MAX_TOOL_TEXT + 5000))
      const longPdfId = await put(store, g, 'lungo.pdf', 'application/pdf', 'x')

      expect(await readGrantFile(sql, store, g, mdId)).toEqual([{ type: 'text', text: '# Nota' }])
      const pdf = await readGrantFile(sql, store, g, pdfId, 1, async () => ['prima', ''])
      expect(pdf[0]).toMatchObject({ type: 'text', text: expect.stringContaining('[[avviso.pdf | pagina 1]]\nprima') })
      expect(await readGrantFile(sql, store, g, scanId, 1, async () => ['', ''])).toEqual([
        { type: 'text', text: expect.stringContaining('PDF senza testo leggibile') },
      ])
      expect((await readGrantFile(sql, store, g, pngId))[0]).toEqual({ type: 'image', data: Buffer.from('PNG').toString('base64'), mimeType: 'image/png' })
      const zip = (await readGrantFile(sql, store, g, zipId))[0] as { text: string }
      expect(zip.text).toContain('tutto.zip')
      expect(zip.text).toContain('application/zip')
      expect(zip.text).toContain('pannello')
      // Testo e PDF lunghi: a parti, come leggi_bando
      const big = (await readGrantFile(sql, store, g, bigTxtId))[0] as { text: string }
      expect(big.text).toBe(`[Parte 1 di 2. Chiedi la parte 2 con parte: 2.]\n\n${'a'.repeat(MAX_TOOL_TEXT)}`)
      const bigEnd = (await readGrantFile(sql, store, g, bigTxtId, 2))[0] as { text: string }
      expect(bigEnd.text).toBe(`[Parte 2 di 2, l'ultima.]\n\n${'a'.repeat(5000)}`)
      await expect(readGrantFile(sql, store, g, bigTxtId, 3)).rejects.toMatchObject({ statusCode: 400 })
      const longPdf = await readGrantFile(sql, store, g, longPdfId, 2, async () => ['p'.repeat(MAX_TOOL_TEXT), 'q'])
      expect(longPdf[0]).toMatchObject({ type: 'text', text: expect.stringMatching(/^\[Parte 2 di 2, l'ultima\.\]\n\n/) })
      expect((longPdf[0] as { text: string }).text).toContain('[[lungo.pdf | pagina 2]]\nq')
    })

    it('PDF a parti: scaricato e letto una volta sola', async () => {
      const g = await folderGrant('Bando con PDF lungo')
      const store = memoryStore()
      const id = await put(store, g, 'lungo.pdf', 'application/pdf', 'x')
      let gets = 0
      let extracts = 0
      const counted = { ...store, get: (key: string) => (gets++, store.get(key)) }
      const extract = async () => (extracts++, ['p'.repeat(MAX_TOOL_TEXT), 'q'])
      await readGrantFile(sql, counted, g, id, 1, extract)
      const second = (await readGrantFile(sql, counted, g, id, 2, extract))[0] as { text: string }
      expect(second.text).toContain('[[lungo.pdf | pagina 2]]\nq')
      expect([gets, extracts]).toEqual([1, 1])
    })

    it('immagine troppo grande: solo descritta, senza scaricarla', async () => {
      const g = await folderGrant('Bando con foto')
      const store = memoryStore()
      const bigId = await put(store, g, 'foto.png', 'image/png', 'a'.repeat(MAX_TOOL_IMAGE_BYTES + 1))
      const okId = await put(store, g, 'giusta.png', 'image/png', 'a'.repeat(MAX_TOOL_IMAGE_BYTES))
      const zipId = await put(store, g, 'tutto.zip', 'application/zip', 'ZIP')
      const gets: string[] = []
      const counted = { ...store, get: (key: string) => (gets.push(key), store.get(key)) }
      const kb = Math.round((MAX_TOOL_IMAGE_BYTES + 1) / 1024)
      expect(await readGrantFile(sql, counted, g, bigId)).toEqual([
        { type: 'text', text: `File "foto.png" (image/png, ${kb} KB): immagine troppo grande per Claude, aprila dal pannello.` },
      ])
      await readGrantFile(sql, counted, g, zipId)
      expect(gets).toEqual([])
      expect((await readGrantFile(sql, counted, g, okId))[0]).toMatchObject({ type: 'image', mimeType: 'image/png' })
      expect(gets).toHaveLength(1)
    })

    it('file di un altro bando: 404', async () => {
      const g = await folderGrant('Bando uno')
      const store = memoryStore()
      const id = await put(store, g, 'nota.md', 'text/markdown', 'x')
      await expect(readGrantFile(sql, store, NO_GRANT, id)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('elenca cartelle e file con la cartella di ciascuno', async () => {
      const g = await folderGrant('Bando elenco')
      const docs = await createFolder(sql, g, null, 'Documenti')
      await put(memoryStore(), g, 'nota.md', 'text/markdown', 'x')
      const all = await grantFolderContents(sql, g)
      expect(all.folders).toContainEqual({ id: docs.id, parentId: null, name: 'Documenti' })
      expect(all.files.find(f => f.name === 'nota.md')).toMatchObject({ folderId: null, mime: 'text/markdown', bytes: 1 })
    })
  })

  it('cartella mancante: 409 chiaro', async () => {
    await seed([source('regione-puglia', [{ title: 'Senza cartella' }])])
    const [g] = await listGrants(sql, NOW)
    await expect(grantFolderContents(sql, g!.id)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'Crea prima la cartella del bando' })
    await expect(grantFolderContents(sql, NO_GRANT)).rejects.toMatchObject({ statusCode: 404 })
  })
})
