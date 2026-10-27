import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import type postgres from 'postgres'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_DRAFT_CHARS } from '#shared/grant-draft'
import { DEFAULT_RADAR_SETTINGS } from '#shared/radar'
import { readDraft, saveGrantDraft } from '../server/utils/grant-draft'
import { addFile } from '../server/utils/grant-files'
import { MAX_TOOL_TEXT } from '../server/utils/mcp-bandi'
import { buildMcpServer } from '../server/utils/mcp-server'
import { ingestSources, listGrants, readPending, writeRadarSettings } from '../server/utils/radar'
import type { GrantReader } from '../server/utils/radar-reader'
import type { RadarSource } from '../server/utils/radar-sources'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'
import { memoryStore } from './helpers/memory-store'

const NOW = new Date('2026-10-27T10:00:00Z')
const DAY = 86_400_000
// Trattini lunghi e medi, vietati nei testi (CLAUDE.md)
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)
const USER = { id: '00000000-0000-0000-0000-000000000001', name: 'Prova', email: 'prova@didap.local', pages: ['bandi' as const] }

// Bandi finti come in mcp-bandi.test.ts: il contenuto è il titolo
const reader: GrantReader = async ({ content }) => ({
  admitsCompanies: true,
  digital: true,
  title: content,
  issuer: 'Regione Puglia',
  summary: '',
  opensAt: null,
  deadline: new Date(NOW.getTime() + 30 * DAY),
  maxAmount: 5000,
  funding: 'Contributo',
  requirements: [],
  application: null,
})

const source = (titles: string[]): RadarSource => ({
  slug: 'regione-puglia',
  refreshDays: 0,
  complete: true,
  fetchListing: async () => titles.map((t, i) => ({ externalId: `r-${i}`, url: `https://example.com/r/${i}`, content: t })),
})

type Text = { type: 'text', text: string }
const firstText = (r: { content?: unknown }) => ((r.content as Text[])[0]!).text

describe.skipIf(!TEST_DATABASE_URL)('server MCP', () => {
  let sql: postgres.Sql
  let client: Client
  let store: ReturnType<typeof memoryStore>
  let jobs: Promise<void>[]
  let g: string

  beforeAll(async () => {
    sql = await openTestDb()
  })
  afterAll(async () => {
    await sql?.end()
  })
  beforeEach(async () => {
    await resetTestDb(sql)
    await writeRadarSettings(sql, { ...DEFAULT_RADAR_SETTINGS, search: { ...DEFAULT_RADAR_SETTINGS.search, groups: ['regione'] } })
    await ingestSources(sql, [source(['Voucher digitale', 'Altro bando'])], NOW)
    await readPending(sql, reader, { limit: 10 })
    g = (await listGrants(sql, NOW)).find(x => x.title === 'Voucher digitale')!.id

    // La cartella si riempie senza rete: la pagina del bando è vuota, senza PDF
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<main><p>Bando</p></main>', { headers: { 'content-type': 'text/html' } })))
    store = memoryStore()
    jobs = []
    const server = buildMcpServer({ sql, store: () => store, user: USER, run: job => void jobs.push(job()) })
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'test', version: '1.0.0' })
    await Promise.all([server.connect(serverSide), client.connect(clientSide)])
  })
  afterEach(async () => {
    await Promise.allSettled(jobs)
    await client?.close()
    vi.unstubAllGlobals()
  })

  it('nove strumenti, prompt prepara_candidatura', async () => {
    expect((await client.listTools()).tools.map(t => t.name).sort()).toEqual(['cerca_bandi', 'crea_cartella_bando', 'elenca_cartella', 'leggi_bando', 'leggi_bozza', 'leggi_file', 'profilo_azienda', 'salva_bozza', 'segna_interessante'])
    const [p] = (await client.listPrompts()).prompts
    expect(p).toMatchObject({ name: 'prepara_candidatura', arguments: [{ name: 'bando', required: true }] })
    expect((await client.listPrompts()).prompts).toHaveLength(1)
    const readOnly = (await client.listTools()).tools.filter(t => t.annotations?.readOnlyHint).map(t => t.name).sort()
    expect(readOnly).toEqual(['cerca_bandi', 'elenca_cartella', 'leggi_bando', 'leggi_bozza', 'leggi_file', 'profilo_azienda'])
  })

  it('salva e rilegge la bozza come Claude per la persona', async () => {
    const r = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: '# Domanda' } })
    expect(r.isError).toBeFalsy()
    expect(await readDraft(sql, g)).toMatchObject({ version: 1, savedBy: USER.name, byClaude: true })
    const stale = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'x' } })
    expect(stale).toMatchObject({ isError: true, content: [{ type: 'text', text: expect.stringContaining('leggi_bozza') }] })
    const ok = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: '# Domanda v2', versione: 1 } })
    expect(ok.isError).toBeFalsy()
  })

  it('leggi_bozza: senza bozza lo dice, poi testo, versione e autore', async () => {
    const none = await client.callTool({ name: 'leggi_bozza', arguments: { id: g } })
    expect(none.isError).toBeFalsy()
    expect(firstText(none)).toBe('Questo bando non ha ancora una bozza: scrivila con salva_bozza senza versione.')

    await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: '# Domanda' } })
    const r = await client.callTool({ name: 'leggi_bozza', arguments: { id: g } })
    const draft = (await readDraft(sql, g))!
    const meta = { versione: 1, salvata_il: draft.savedAt, salvata_da: USER.name, da_claude: true, caratteri: 9 }
    expect(JSON.parse(firstText(r))).toEqual({ testo: '# Domanda', ...meta })
    // Il testo una volta sola, senza structuredContent (versione senza testo)
    expect(r.content).toHaveLength(1)
    expect(r.structuredContent).toBeUndefined()
    expect(JSON.stringify(r).split('# Domanda')).toHaveLength(2)

    const missing = await client.callTool({ name: 'leggi_bozza', arguments: { id: crypto.randomUUID() } })
    expect(missing).toMatchObject({ isError: true, content: [{ type: 'text', text: 'Bando non trovato' }] })
  })

  it('leggi_bozza: la bozza fino a 60.000 caratteri arriva intera', async () => {
    const full = `${'a'.repeat(MAX_TOOL_TEXT - 1)}z`
    await saveGrantDraft(sql, { grantId: g, content: full, baseVersion: null, savedBy: 'Bea', byClaude: false })
    const r = await client.callTool({ name: 'leggi_bozza', arguments: { id: g } })
    expect(JSON.parse(firstText(r))).toMatchObject({ testo: full, versione: 1, caratteri: MAX_TOOL_TEXT })
    expect(r.structuredContent).toBeUndefined()
  })

  it('leggi_bozza: oltre 60.000 caratteri solo chi e quando, senza testo né versione', async () => {
    // Bozza allungata a mano nel pannello
    await saveGrantDraft(sql, { grantId: g, content: `inizio ${'a'.repeat(MAX_TOOL_TEXT)} coda`, baseVersion: null, savedBy: 'Bea', byClaude: false })
    const r = await client.callTool({ name: 'leggi_bozza', arguments: { id: g } })
    expect(r.isError).toBeFalsy()
    expect(r.content).toHaveLength(1)
    expect(firstText(r)).toMatch(/^La bozza supera 60\.000 caratteri: lavorala nel pannello\. L'ha salvata Bea il \d{2}\/\d{2}\/\d{4} alle \d{2}:\d{2}\.$/)
    expect(r.structuredContent).toBeUndefined()
    const all = JSON.stringify(r)
    expect(all).not.toContain('inizio')
    expect(all).not.toContain('coda')
    expect(all).not.toContain('versione')
  })

  it('salva_bozza rifiuta un testo oltre 60.000 caratteri', async () => {
    const r = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'x'.repeat(MAX_TOOL_TEXT + 1) } })
    expect(r).toMatchObject({ isError: true, content: [{ type: 'text', text: 'Il testo supera 60.000 caratteri: Claude lavora su bozze più corte. Accorcialo o lavoralo nel pannello.' }] })
    expect(await readDraft(sql, g)).toBeNull()
    // Fino al limite si salva
    const ok = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'x'.repeat(MAX_TOOL_TEXT) } })
    expect(ok.isError).toBeFalsy()
  })

  it('salva_bozza non tocca una bozza salvata oltre 60.000 caratteri', async () => {
    const long = `inizio ${'a'.repeat(MAX_TOOL_TEXT)} coda`
    await saveGrantDraft(sql, { grantId: g, content: long, baseVersion: null, savedBy: 'Bea', byClaude: false })
    for (const versione of [1, undefined]) {
      const r = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'riscritta corta', versione } })
      expect(r).toMatchObject({ isError: true, content: [{ type: 'text', text: 'La bozza supera 60.000 caratteri: lavorala nel pannello.' }] })
    }
    expect(await readDraft(sql, g)).toMatchObject({ content: long, version: 1, savedBy: 'Bea', byClaude: false })
  })

  it('salva_bozza: prima volta crea la cartella, poi solo versione', async () => {
    const first = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: '# Domanda' } })
    expect(firstText(first)).toBe('Bozza salvata (versione 1). La trovi nel pannello, scheda Bozza del bando. Ho creato la cartella del bando e l\'ho messo tra gli interessanti.')
    await Promise.allSettled(jobs)
    const row = (await listGrants(sql, NOW, { id: g }))[0]!
    expect(row).toMatchObject({ hasFolder: true, liked: true })
    expect(store.files.size).toBeGreaterThan(0)

    const second = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: '# Domanda v2', versione: 1 } })
    expect(firstText(second)).toBe('Bozza salvata (versione 2). La trovi nel pannello, scheda Bozza del bando.')
    expect(await readDraft(sql, g)).toMatchObject({ content: '# Domanda v2', version: 2 })
  })

  it('salva_bozza su bozza cambiata: dice chi ha salvato e non scrive', async () => {
    await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'uno' } })
    // Correzione a mano dal pannello
    await saveGrantDraft(sql, { grantId: g, content: 'uno, corretto', baseVersion: 1, savedBy: 'Bea', byClaude: false })
    const stale = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'riscritto', versione: 1 } })
    expect(stale.isError).toBe(true)
    expect(firstText(stale)).toMatch(/^La bozza è cambiata \(versione 2, salvata da Bea il \d{2}\/\d{2}\/\d{4} alle \d{2}:\d{2}\): rileggila con leggi_bozza e riapplica le modifiche\.$/)
    expect(await readDraft(sql, g)).toMatchObject({ content: 'uno, corretto', version: 2 })

    // Salvata da Claude: si dice per chi
    await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'tre', versione: 2 } })
    const again = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'quattro', versione: 2 } })
    expect(firstText(again)).toContain('salvata da Claude per Prova il ')
  })

  it('salva_bozza con versione ma senza bozza: invito a rileggere', async () => {
    const r = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'uno', versione: 1 } })
    expect(r).toMatchObject({ isError: true, content: [{ type: 'text', text: 'La bozza è cambiata o non esiste: rileggila con leggi_bozza e riparti da lì.' }] })
    expect(await readDraft(sql, g)).toBeNull()
  })

  it('salva_bozza valida gli argomenti', async () => {
    const tooLong = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'x'.repeat(MAX_DRAFT_CHARS + 1) } })
    expect(tooLong.isError).toBe(true)
    expect(firstText(tooLong)).toContain('testo')
    const zero = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'x', versione: 0 } })
    expect(zero.isError).toBe(true)
    expect(firstText(zero)).toContain('versione')
    expect(await readDraft(sql, g)).toBeNull()
  })

  it('schemi in snake_case e annotazioni delle scritture', async () => {
    const { tools } = await client.listTools()
    const byName = Object.fromEntries(tools.map(t => [t.name, t]))
    expect(Object.keys(byName.cerca_bandi!.inputSchema.properties ?? {}).sort())
      .toEqual(['esito', 'fuori_dalla_ricerca', 'scadenza_entro_giorni', 'solo_interessanti', 'testo'])
    expect(byName.leggi_file!.inputSchema.required).toEqual(['id', 'file_id'])
    expect(byName.segna_interessante!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true })
    expect(byName.crea_cartella_bando!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false })
    // Al primo salvataggio riempie la cartella dal sito del bando, come crea_cartella_bando
    expect(byName.salva_bozza!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, openWorldHint: true })
    expect(byName.leggi_bozza!.annotations).toMatchObject({ readOnlyHint: true })
    expect(byName.salva_bozza!.inputSchema.required).toEqual(['id', 'testo'])
    expect(byName.salva_bozza!.inputSchema.properties).toHaveProperty('testo', expect.objectContaining({ type: 'string', maxLength: MAX_TOOL_TEXT }))
    expect(byName.salva_bozza!.inputSchema.properties).toHaveProperty('versione', expect.objectContaining({ type: 'integer', minimum: 1 }))
    expect(byName.leggi_bando!.inputSchema.properties).toHaveProperty('parte', expect.objectContaining({ type: 'integer', minimum: 1 }))
    expect(byName.leggi_file!.inputSchema.properties).toHaveProperty('parte', expect.objectContaining({ type: 'integer', minimum: 1 }))
    expect(byName.leggi_bando!.inputSchema.required).toEqual(['id'])
    for (const t of tools) expect(t.description).toBeTruthy()
  })

  it('crea_cartella_bando dichiara il mondo aperto', async () => {
    const { tools } = await client.listTools()
    const byName = Object.fromEntries(tools.map(t => [t.name, t]))
    // Scarica dal sito del bando: fuori dal pannello
    expect(byName.crea_cartella_bando!.annotations?.openWorldHint).toBe(true)
    for (const name of ['cerca_bandi', 'leggi_bando', 'leggi_file', 'segna_interessante']) {
      expect(byName[name]!.annotations?.openWorldHint).toBe(false)
    }
  })

  it('leggi_bando accetta parte e la valida', async () => {
    const one = await client.callTool({ name: 'leggi_bando', arguments: { id: g, parte: 1 } })
    expect(one.isError).toBeFalsy()
    expect(firstText(one)).toContain('titolo: "Voucher digitale"')
    const zero = await client.callTool({ name: 'leggi_bando', arguments: { id: g, parte: 0 } })
    expect(zero.isError).toBe(true)
    expect(firstText(zero)).toContain('parte')
    const half = await client.callTool({ name: 'leggi_bando', arguments: { id: g, parte: 1.5 } })
    expect(half.isError).toBe(true)
    const beyond = await client.callTool({ name: 'leggi_bando', arguments: { id: g, parte: 2 } })
    expect(beyond).toMatchObject({ isError: true, content: [{ type: 'text', text: expect.stringContaining('inesistente') }] })
  })

  it('leggi_file a parti', async () => {
    await client.callTool({ name: 'crea_cartella_bando', arguments: { id: g } })
    await Promise.allSettled(jobs)
    const file = await addFile(sql, store, { grantId: g, folderId: null, name: 'lungo.txt', mime: 'text/plain', data: Buffer.from('a'.repeat(70_000)), userId: null })
    const second = await client.callTool({ name: 'leggi_file', arguments: { id: g, file_id: file.id, parte: 2 } })
    expect(firstText(second)).toBe(`[Parte 2 di 2, l'ultima.]\n\n${'a'.repeat(10_000)}`)
    const beyond = await client.callTool({ name: 'leggi_file', arguments: { id: g, file_id: file.id, parte: 3 } })
    expect(beyond).toMatchObject({ isError: true, content: [{ type: 'text', text: expect.stringContaining('inesistente') }] })
  })

  it('senza Cloudinary: messaggio chiaro per Claude, la bozza si salva lo stesso', async () => {
    // useFileStore senza le variabili di Cloudinary
    const server = buildMcpServer({ sql, store: () => null, user: USER, run: job => void jobs.push(job()) })
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
    const other = new Client({ name: 'test', version: '1.0.0' })
    await Promise.all([server.connect(serverSide), other.connect(clientSide)])
    try {
      const r = await other.callTool({ name: 'crea_cartella_bando', arguments: { id: g } })
      expect(r).toMatchObject({ isError: true, content: [{ type: 'text', text: 'La cartella dei file non è configurata sul server.' }] })
      expect(JSON.stringify(r)).not.toContain('CLOUDINARY')

      const saved = await other.callTool({ name: 'salva_bozza', arguments: { id: g, testo: '# Domanda' } })
      expect(saved.isError).toBeFalsy()
      expect(jobs).toHaveLength(0)
      expect(await readDraft(sql, g)).toMatchObject({ content: '# Domanda', version: 1 })
      expect((await listGrants(sql, NOW, { id: g }))[0]!.hasFolder).toBe(true)
    }
    finally {
      await other.close()
    }
  })

  it('istruzioni in italiano', () => {
    const text = client.getInstructions() ?? ''
    expect(text).toContain('fatturato')
    expect(text).toContain('segna_interessante')
    expect(text).toContain('crea_cartella_bando')
    expect(text).toContain('[DA COMPLETARE: ...]')
    expect(text).toContain('leggi_bozza')
    expect(text).toContain('salva_bozza')
    expect(text).toContain('bozze fino a 60.000 caratteri')
    expect(text).not.toMatch(DASHES)
  })

  it('testi degli strumenti senza trattini', async () => {
    const { tools } = await client.listTools()
    expect(JSON.stringify(tools)).not.toMatch(DASHES)
  })

  it('cerca e segna', async () => {
    const r = await client.callTool({ name: 'cerca_bandi', arguments: { testo: 'voucher' } })
    expect(r.isError).toBeFalsy()
    const found = JSON.parse(firstText(r)) as { bandi: { id: string, titolo: string }[], altri: number }
    expect(found.bandi.map(b => b.titolo)).toEqual(['Voucher digitale'])
    expect(r.structuredContent).toEqual(found)

    await client.callTool({ name: 'segna_interessante', arguments: { id: g, interessante: true } })
    expect((await listGrants(sql, NOW, { id: g }))[0]!.liked).toBe(true)
    const liked = await client.callTool({ name: 'cerca_bandi', arguments: { solo_interessanti: true } })
    expect((JSON.parse(firstText(liked)) as typeof found).bandi.map(b => b.id)).toEqual([g])

    await client.callTool({ name: 'segna_interessante', arguments: { id: g, interessante: false } })
    expect((await listGrants(sql, NOW, { id: g }))[0]!.liked).toBe(false)
  })

  it('errori come risultati', async () => {
    const r = await client.callTool({ name: 'leggi_bando', arguments: { id: crypto.randomUUID() } })
    expect(r).toMatchObject({ isError: true, content: [{ type: 'text', text: 'Bando non trovato' }] })
    const bad = await client.callTool({ name: 'cerca_bandi', arguments: { scadenza_entro_giorni: 9999 } })
    expect(bad.isError).toBe(true)
    expect(firstText(bad)).toContain('scadenza_entro_giorni')
    // Un id che non è un uuid non arriva a Postgres
    const notUuid = await client.callTool({ name: 'leggi_bando', arguments: { id: 'abc' } })
    expect(notUuid).toMatchObject({ isError: true, content: [{ type: 'text', text: expect.stringContaining('id') }] })
    const noFolder = await client.callTool({ name: 'elenca_cartella', arguments: { id: g } })
    expect(noFolder).toMatchObject({ isError: true, content: [{ type: 'text', text: 'Crea prima la cartella del bando' }] })
  })

  it('legge bando e profilo', async () => {
    const r = await client.callTool({ name: 'leggi_bando', arguments: { id: g } })
    expect(r.isError).toBeFalsy()
    expect(firstText(r)).toContain('titolo: "Voucher digitale"')
    const p = await client.callTool({ name: 'profilo_azienda', arguments: {} })
    expect(JSON.parse(firstText(p))).toEqual(DEFAULT_RADAR_SETTINGS.profile)
  })

  it('crea la cartella una volta', async () => {
    const first = await client.callTool({ name: 'crea_cartella_bando', arguments: { id: g } })
    expect(firstText(first)).toBe('Cartella creata: i file del bando arrivano tra poco.')
    await Promise.allSettled(jobs)
    const again = await client.callTool({ name: 'crea_cartella_bando', arguments: { id: g } })
    expect(firstText(again)).toBe('La cartella c\'era già.')
    expect((await listGrants(sql, NOW, { id: g }))[0]!.hasFolder).toBe(true)
  })

  it('nessun URL Cloudinary nelle risposte', async () => {
    await client.callTool({ name: 'crea_cartella_bando', arguments: { id: g } })
    await Promise.allSettled(jobs)
    const file = await addFile(sql, store, { grantId: g, folderId: null, name: 'nota.md', mime: 'text/markdown', data: Buffer.from('# Nota'), userId: null })

    const r = await client.callTool({ name: 'elenca_cartella', arguments: { id: g } })
    expect(r.isError).toBeFalsy()
    const text = firstText(r)
    expect(text).not.toContain('cloudinary')
    expect(text).not.toContain('didap/bandi/')
    expect(JSON.stringify(r)).not.toContain('didap/bandi/')
    const listed = JSON.parse(text) as { files: { id: string, name: string }[] }
    expect(listed.files.map(f => f.name)).toContain('nota.md')

    const read = await client.callTool({ name: 'leggi_file', arguments: { id: g, file_id: file.id } })
    expect(read).toMatchObject({ content: [{ type: 'text', text: '# Nota' }] })
  })

  it('il prompt guida la bozza della candidatura', async () => {
    const p = await client.getPrompt({ name: 'prepara_candidatura', arguments: { bando: 'Voucher digitale' } })
    expect(p.messages).toHaveLength(1)
    const msg = p.messages[0]!
    expect(msg.role).toBe('user')
    const text = (msg.content as Text).text
    expect(text).toContain('Voucher digitale')
    for (const tool of ['cerca_bandi', 'leggi_bando', 'profilo_azienda', 'elenca_cartella', 'leggi_file', 'leggi_bozza', 'salva_bozza']) {
      expect(text).toContain(tool)
    }
    expect(text).toContain('uploadedBy')
    expect(text).toContain('[DA COMPLETARE: ...]')
    expect(text).toContain('Da completare')
    expect(text).toContain('firma')
    expect(text).toContain('spese ammesse')
    expect(text).not.toMatch(DASHES)

    await expect(client.getPrompt({ name: 'prepara_candidatura', arguments: { bando: ' ' } })).rejects.toThrow()
  })
})
