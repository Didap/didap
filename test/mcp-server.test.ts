import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { createError } from 'h3'
import type postgres from 'postgres'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_RADAR_SETTINGS } from '#shared/radar'
import { addFile } from '../server/utils/grant-files'
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

  it('elenca strumenti e prompt, nient\'altro', async () => {
    const tools = (await client.listTools()).tools.map(t => t.name).sort()
    expect(tools).toEqual(['cerca_bandi', 'crea_cartella_bando', 'elenca_cartella', 'leggi_bando', 'leggi_file', 'profilo_azienda', 'segna_interessante'])
    expect((await client.listPrompts()).prompts.map(p => p.name)).toEqual(['come_candidarsi'])
    const readOnly = (await client.listTools()).tools.filter(t => t.annotations?.readOnlyHint).map(t => t.name).sort()
    expect(readOnly).toEqual(['cerca_bandi', 'elenca_cartella', 'leggi_bando', 'leggi_file', 'profilo_azienda'])
  })

  it('schemi in snake_case e annotazioni delle scritture', async () => {
    const { tools } = await client.listTools()
    const byName = Object.fromEntries(tools.map(t => [t.name, t]))
    expect(Object.keys(byName.cerca_bandi!.inputSchema.properties ?? {}).sort())
      .toEqual(['esito', 'fuori_dalla_ricerca', 'scadenza_entro_giorni', 'solo_interessanti', 'testo'])
    expect(byName.leggi_file!.inputSchema.required).toEqual(['id', 'file_id'])
    expect(byName.segna_interessante!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true })
    expect(byName.crea_cartella_bando!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false })
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

  it('senza Cloudinary: messaggio chiaro per Claude', async () => {
    const noStore = () => {
      throw createError({ statusCode: 503, statusMessage: 'Cloudinary non configurato (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)' })
    }
    const server = buildMcpServer({ sql, store: noStore, user: USER, run: job => void jobs.push(job()) })
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
    const other = new Client({ name: 'test', version: '1.0.0' })
    await Promise.all([server.connect(serverSide), other.connect(clientSide)])
    try {
      const r = await other.callTool({ name: 'crea_cartella_bando', arguments: { id: g } })
      expect(r).toMatchObject({ isError: true, content: [{ type: 'text', text: 'La cartella dei file non è configurata sul server.' }] })
      expect(JSON.stringify(r)).not.toContain('CLOUDINARY')
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
    expect(text).not.toMatch(DASHES)
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

  it('il prompt chiede i passi della candidatura', async () => {
    const p = await client.getPrompt({ name: 'come_candidarsi', arguments: { bando: 'Voucher digitale' } })
    expect(p.messages).toHaveLength(1)
    const msg = p.messages[0]!
    expect(msg.role).toBe('user')
    const text = (msg.content as Text).text
    expect(text).toContain('Voucher digitale')
    expect(text).toContain('leggi_bando')
    expect(text).toContain('firma')
    expect(text).not.toMatch(DASHES)
  })
})
