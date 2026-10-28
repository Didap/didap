import type postgres from 'postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { entryNameSchema, MAX_FILE_BYTES, treeFolders, uniqueName } from '../shared/grant-files'
import {
  addFile,
  addFileOnce,
  createFolder,
  deleteEntry,
  folderTree,
  listFolder,
  moveEntry,
  readFileEntry,
  renameEntry,
  requireGrantFolder,
} from '../server/utils/grant-files'
import { ingestSources, readPending } from '../server/utils/radar'
import type { GrantReader } from '../server/utils/radar-reader'
import type { RadarSource } from '../server/utils/radar-sources'
import { createUser } from '../server/utils/users'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'
import { memoryStore } from './helpers/memory-store'

describe('uniqueName', () => {
  it('aggiunge (2), (3) prima dell\'estensione, senza maiuscole', () => {
    expect(uniqueName(new Set(['visura.pdf']), 'Visura.pdf')).toBe('Visura (2).pdf')
    expect(uniqueName(new Set(['visura.pdf', 'visura (2).pdf']), 'Visura.pdf')).toBe('Visura (3).pdf')
    expect(uniqueName(new Set(['bozze']), 'Bozze')).toBe('Bozze (2)')
  })

  it('un nome libero resta com\'è; ".env" non ha estensione', () => {
    expect(uniqueName(new Set(['altro.pdf']), 'Visura.pdf')).toBe('Visura.pdf')
    expect(uniqueName(new Set(['.env']), '.env')).toBe('.env (2)')
  })
})

describe('treeFolders', () => {
  it('la principale, poi ogni cartella con le sue figlie sotto', () => {
    const rows = [
      { id: 'a', parentId: null, name: 'Alfa' },
      { id: 'a1', parentId: 'a', name: 'Uno' },
      { id: 'a11', parentId: 'a1', name: 'Dentro' },
      { id: 'b', parentId: null, name: 'Beta' },
      // Genitore che non c'è: non si vede
      { id: 'x', parentId: 'manca', name: 'Orfana' },
    ]
    expect(treeFolders(rows, 'Bando')).toEqual([
      { id: null, name: 'Bando', depth: 0 },
      { id: 'a', name: 'Alfa', depth: 1 },
      { id: 'a1', name: 'Uno', depth: 2 },
      { id: 'a11', name: 'Dentro', depth: 3 },
      { id: 'b', name: 'Beta', depth: 1 },
    ])
  })
})

describe('entryNameSchema', () => {
  it('accetta nomi con accenti, virgolette e punti e virgola', () => {
    expect(entryNameSchema.parse('  Domanda è "finale"; v2.docx ')).toBe('Domanda è "finale"; v2.docx')
  })

  it('rifiuta barre, punti, nomi vuoti e troppo lunghi', () => {
    for (const bad of ['a/b', 'a\\b', '.', '..', '   ', 'a\nb', 'fattura\u202Efdp.exe', 'a\u200Bb', 'x'.repeat(201)]) {
      const r = entryNameSchema.safeParse(bad)
      expect(r.success, bad).toBe(false)
      expect(r.error?.issues[0]?.message).toBe('Nome non valido')
    }
    expect(entryNameSchema.safeParse('x'.repeat(200)).success).toBe(true)
  })
})

// Un bando creato come nel radar: fonte e lettore finti
function oneGrantSource(id: string): RadarSource {
  return {
    slug: 'finta',
    refreshDays: 0,
    complete: true,
    fetchListing: async () => [{ externalId: id, url: `https://example.com/${id}` }],
    fetchContent: async () => id,
  }
}

const reader: GrantReader = async ({ content }) => ({
  admitsCompanies: true,
  digital: true,
  title: content,
  issuer: 'Regione Puglia',
  summary: '',
  opensAt: null,
  deadline: null,
  maxAmount: null,
  funding: '',
  requirements: [],
  application: null,
})

const NOW = new Date('2026-10-20T08:00:00Z')
const pdf = (s = 'pdf') => Buffer.from(s)

describe.skipIf(!TEST_DATABASE_URL)('cartella del bando su Postgres', () => {
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

  // Con la cartella creata (folder_at), come dopo "Crea cartella del bando";
  // `folder: false` lascia il bando com'è uscito dal radar
  async function grant(title: string, { folder = true } = {}): Promise<string> {
    await ingestSources(sql, [oneGrantSource(title)], NOW)
    await readPending(sql, reader)
    const [row] = await sql`select id from radar_grants where title = ${title}`
    if (folder) await sql`update radar_grants set folder_at = now() where id = ${row!.id}`
    return row!.id
  }

  const file = (grantId: string, folderId: string | null, name: string, userId: string | null = null) =>
    ({ grantId, folderId, name, mime: 'application/pdf', data: pdf(name), userId })

  it('crea cartelle annidate e le elenca dalla principale, contando i file delle sottocartelle', async () => {
    const g = await grant('Bando Smart')
    const docs = await createFolder(sql, g, null, 'Documenti')
    expect(docs).toMatchObject({ name: 'Documenti', fileCount: 0 })
    const drafts = await createFolder(sql, g, docs.id, 'Bozze')
    const store = memoryStore()
    await addFile(sql, store, file(g, docs.id, 'visura.pdf'))
    await addFile(sql, store, file(g, drafts.id, 'domanda.docx'))
    await addFile(sql, store, file(g, null, 'bando.pdf'))

    const root = await listFolder(sql, g, null)
    expect(root.path).toEqual([{ id: null, name: 'Bando Smart' }])
    expect(root.folders).toMatchObject([{ id: docs.id, name: 'Documenti', fileCount: 2 }])
    expect(root.files.map(f => f.name)).toEqual(['bando.pdf'])

    const inner = await listFolder(sql, g, drafts.id)
    expect(inner.path).toEqual([
      { id: null, name: 'Bando Smart' },
      { id: docs.id, name: 'Documenti' },
      { id: drafts.id, name: 'Bozze' },
    ])
    expect(inner.folders).toEqual([])
    expect(inner.files).toMatchObject([{ name: 'domanda.docx', mime: 'application/pdf', bytes: 12 }])
  })

  it('elenca cartelle e file in ordine di nome', async () => {
    const g = await grant('Bando')
    await createFolder(sql, g, null, 'beta')
    await createFolder(sql, g, null, 'Alfa')
    const store = memoryStore()
    await addFile(sql, store, file(g, null, 'z.pdf'))
    await addFile(sql, store, file(g, null, 'B.pdf'))
    const list = await listFolder(sql, g, null)
    expect(list.folders.map(f => f.name)).toEqual(['Alfa', 'beta'])
    expect(list.files.map(f => f.name)).toEqual(['B.pdf', 'z.pdf'])
  })

  it('una cartella con un nome già usato prende (2)', async () => {
    const g = await grant('Bando')
    await createFolder(sql, g, null, 'Bozze')
    expect((await createFolder(sql, g, null, 'bozze')).name).toBe('bozze (2)')
    expect((await listFolder(sql, g, null)).folders.map(f => f.name)).toEqual(['Bozze', 'bozze (2)'])
  })

  it('un file oltre 10 MB dà 413 senza toccare lo store', async () => {
    const g = await grant('Bando')
    const store = memoryStore()
    const big = { ...file(g, null, 'grande.pdf'), data: Buffer.alloc(MAX_FILE_BYTES + 1) }
    await expect(addFile(sql, store, big)).rejects.toMatchObject({ statusCode: 413, statusMessage: 'File oltre 10 MB' })
    expect(store.files.size).toBe(0)
  })

  it('se lo store non salva, nessuna riga', async () => {
    const g = await grant('Bando')
    await expect(addFile(sql, memoryStore({ failPut: true }), file(g, null, 'x.pdf'))).rejects.toThrow()
    const [{ n }] = await sql`select count(*)::int as n from grant_files` as unknown as [{ n: number }]
    expect(n).toBe(0)
  })

  it('se la riga non entra, il file esce dallo store', async () => {
    const g = await grant('Bando')
    const store = memoryStore()
    // Persona inesistente: la chiave esterna fa fallire l'insert
    const ghost = '00000000-0000-4000-8000-000000000000'
    await expect(addFile(sql, store, file(g, null, 'x.pdf', ghost))).rejects.toThrow()
    expect(store.files.size).toBe(0)
  })

  it('due file con lo stesso nome danno x.pdf e x (2).pdf, con chi li ha caricati', async () => {
    const g = await grant('Bando')
    const u = await createUser(sql, { name: 'William', email: 'william@didap.it', pages: ['bandi'] })
    const store = memoryStore()
    const a = await addFile(sql, store, file(g, null, 'x.pdf', u.id))
    const b = await addFile(sql, store, file(g, null, 'X.pdf'))
    expect(a).toMatchObject({ name: 'x.pdf', uploadedBy: 'William', bytes: 5 })
    expect(b).toMatchObject({ name: 'X (2).pdf', uploadedBy: null })
    expect(store.files.size).toBe(2)
    const files = (await listFolder(sql, g, null)).files
    expect(files.map(f => [f.name, f.uploadedBy])).toEqual([['X (2).pdf', null], ['x.pdf', 'William']])
  })

  it('il nome di chi ha caricato resta anche se la persona viene eliminata', async () => {
    const g = await grant('Bando')
    const u = await createUser(sql, { name: 'Giulia', email: 'giulia@didap.it', pages: ['bandi'] })
    const store = memoryStore()
    await addFile(sql, store, file(g, null, 'suo.pdf', u.id))
    await addFile(sql, store, file(g, null, 'radar.pdf'))
    await sql`delete from admin_users where id = ${u.id}`
    const files = (await listFolder(sql, g, null)).files
    expect(files.map(f => [f.name, f.uploadedBy])).toEqual([
      ['radar.pdf', null],
      ['suo.pdf', 'Giulia'],
    ])
  })

  it('addFileOnce: un nome già presente non si aggiunge e i byte escono dallo store', async () => {
    const g = await grant('Bando')
    const store = memoryStore()
    await addFile(sql, store, file(g, null, 'avviso.pdf'))
    expect(await addFileOnce(sql, store, file(g, null, 'AVVISO.pdf'))).toBeNull()
    expect(store.files.size).toBe(1)
    expect((await listFolder(sql, g, null)).files.map(f => f.name)).toEqual(['avviso.pdf'])
    expect(await addFileOnce(sql, store, file(g, null, 'altro.pdf'))).toMatchObject({ name: 'altro.pdf' })
    expect(store.files.size).toBe(2)
  })

  it('albero delle cartelle in una lettura: prima le madri, solo quel bando', async () => {
    const g = await grant('Bando')
    const h = await grant('Altro bando')
    const beta = await createFolder(sql, g, null, 'beta')
    const alfa = await createFolder(sql, g, null, 'Alfa')
    const zeta = await createFolder(sql, g, alfa.id, 'Zeta')
    const uno = await createFolder(sql, g, alfa.id, 'uno')
    const sotto = await createFolder(sql, g, zeta.id, 'Sotto')
    await createFolder(sql, h, null, 'Sua')
    expect(await folderTree(sql, g)).toEqual([
      { id: alfa.id, parentId: null, name: 'Alfa' },
      { id: uno.id, parentId: alfa.id, name: 'uno' },
      { id: zeta.id, parentId: alfa.id, name: 'Zeta' },
      { id: sotto.id, parentId: zeta.id, name: 'Sotto' },
      { id: beta.id, parentId: null, name: 'beta' },
    ])
    expect(await folderTree(sql, '00000000-0000-4000-8000-000000000000')).toEqual([])
  })

  it('rinomina: 409 su un nome occupato, altrimenti cambia il nome ma non la chiave', async () => {
    const g = await grant('Bando')
    const store = memoryStore()
    const a = await addFile(sql, store, file(g, null, 'a.pdf'))
    await addFile(sql, store, file(g, null, 'b.pdf'))
    await createFolder(sql, g, null, 'Cartella')
    await expect(renameEntry(sql, g, 'file', a.id, 'B.pdf')).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Esiste già un elemento con questo nome',
    })
    await expect(renameEntry(sql, g, 'file', a.id, 'cartella')).rejects.toMatchObject({ statusCode: 409 })
    const before = await readFileEntry(sql, g, a.id)
    await renameEntry(sql, g, 'file', a.id, 'A.pdf')
    const after = await readFileEntry(sql, g, a.id)
    expect(after).toEqual({ name: 'A.pdf', mime: 'application/pdf', bytes: before.bytes, storeKey: before.storeKey })
    expect(store.files.has(after.storeKey)).toBe(true)
  })

  it('rinomina una cartella', async () => {
    const g = await grant('Bando')
    const f = await createFolder(sql, g, null, 'Vecchia')
    await renameEntry(sql, g, 'folder', f.id, 'Nuova')
    expect((await listFolder(sql, g, null)).folders.map(x => x.name)).toEqual(['Nuova'])
  })

  it('sposta: non una cartella dentro sé stessa, sì un file in un\'altra cartella', async () => {
    const g = await grant('Bando')
    const top = await createFolder(sql, g, null, 'Sopra')
    const sub = await createFolder(sql, g, top.id, 'Sotto')
    const other = await createFolder(sql, g, null, 'Altra')
    const msg = 'Non puoi spostare una cartella dentro sé stessa'
    await expect(moveEntry(sql, g, 'folder', top.id, sub.id)).rejects.toMatchObject({ statusCode: 400, statusMessage: msg })
    await expect(moveEntry(sql, g, 'folder', top.id, top.id)).rejects.toMatchObject({ statusCode: 400 })

    const store = memoryStore()
    const f = await addFile(sql, store, file(g, top.id, 'x.pdf'))
    await moveEntry(sql, g, 'file', f.id, other.id)
    expect((await listFolder(sql, g, other.id)).files.map(x => x.name)).toEqual(['x.pdf'])
    expect((await listFolder(sql, g, top.id)).files).toEqual([])

    // Nome occupato nella destinazione
    await addFile(sql, store, file(g, null, 'X.pdf'))
    await expect(moveEntry(sql, g, 'file', f.id, null)).rejects.toMatchObject({ statusCode: 409 })

    // Una cartella si sposta nella principale
    await moveEntry(sql, g, 'folder', sub.id, null)
    expect((await listFolder(sql, g, null)).folders.map(x => x.name)).toEqual(['Altra', 'Sopra', 'Sotto'])
  })

  it('elimina una cartella con i file delle sottocartelle', async () => {
    const g = await grant('Bando')
    const top = await createFolder(sql, g, null, 'Sopra')
    const sub = await createFolder(sql, g, top.id, 'Sotto')
    const store = memoryStore()
    await addFile(sql, store, file(g, sub.id, 'a.pdf'))
    await addFile(sql, store, file(g, sub.id, 'b.pdf'))
    const keep = await addFile(sql, store, file(g, null, 'resta.pdf'))
    expect(await deleteEntry(sql, store, g, 'folder', top.id)).toEqual({ files: 2 })
    const [{ n }] = await sql`select count(*)::int as n from grant_files` as unknown as [{ n: number }]
    expect(n).toBe(1)
    const [{ m }] = await sql`select count(*)::int as m from grant_folders` as unknown as [{ m: number }]
    expect(m).toBe(0)
    expect([...store.files.keys()]).toEqual([(await readFileEntry(sql, g, keep.id)).storeKey])
    expect(await deleteEntry(sql, store, g, 'file', keep.id)).toEqual({ files: 1 })
    expect(store.files.size).toBe(0)
  })

  it('se lo store non cancella, le righe spariscono lo stesso', async () => {
    const g = await grant('Bando')
    const top = await createFolder(sql, g, null, 'Sopra')
    const sub = await createFolder(sql, g, top.id, 'Sotto')
    await addFile(sql, memoryStore(), file(g, sub.id, 'a.pdf'))
    await addFile(sql, memoryStore(), file(g, sub.id, 'b.pdf'))
    const broken = memoryStore({ failRemove: true })
    expect(await deleteEntry(sql, broken, g, 'folder', top.id)).toEqual({ files: 2 })
    const [{ n }] = await sql`select count(*)::int as n from grant_files` as unknown as [{ n: number }]
    expect(n).toBe(0)
  })

  it('cartelle e file di un altro bando danno 404', async () => {
    const g = await grant('Bando uno')
    const h = await grant('Bando due')
    const store = memoryStore()
    const folder = await createFolder(sql, h, null, 'Sua')
    const f = await addFile(sql, store, file(h, null, 'suo.pdf'))
    const noFolder = { statusCode: 404, statusMessage: 'Cartella non trovata' }
    const noFile = { statusCode: 404, statusMessage: 'File non trovato' }
    await expect(listFolder(sql, g, folder.id)).rejects.toMatchObject(noFolder)
    await expect(createFolder(sql, g, folder.id, 'x')).rejects.toMatchObject(noFolder)
    await expect(addFile(sql, store, file(g, folder.id, 'x.pdf'))).rejects.toMatchObject(noFolder)
    await expect(renameEntry(sql, g, 'folder', folder.id, 'x')).rejects.toMatchObject(noFolder)
    await expect(moveEntry(sql, g, 'file', f.id, null)).rejects.toMatchObject(noFile)
    await expect(deleteEntry(sql, store, g, 'file', f.id)).rejects.toMatchObject(noFile)
    await expect(readFileEntry(sql, g, f.id)).rejects.toMatchObject(noFile)
    // Un file non si sposta in una cartella di un altro bando
    const mine = await createFolder(sql, g, null, 'Mia')
    await expect(moveEntry(sql, h, 'file', f.id, mine.id)).rejects.toMatchObject(noFolder)
    expect(store.files.size).toBe(1)
  })

  it('un bando eliminato si porta via cartelle e file', async () => {
    const g = await grant('Bando')
    const top = await createFolder(sql, g, null, 'Sopra')
    await addFile(sql, memoryStore(), file(g, top.id, 'a.pdf'))
    await sql`delete from radar_grants where id = ${g}`
    const [{ n }] = await sql`select count(*)::int as n from grant_files` as unknown as [{ n: number }]
    expect(n).toBe(0)
  })

  it('si scrive solo in un bando con la cartella creata', async () => {
    const g = await grant('Bando', { folder: false })
    await expect(requireGrantFolder(sql, g)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'Crea prima la cartella del bando' })
    await sql`update radar_grants set folder_at = now() where id = ${g}`
    await expect(requireGrantFolder(sql, g)).resolves.toBeUndefined()
    await expect(requireGrantFolder(sql, '00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({ statusCode: 404, statusMessage: 'Bando non trovato' })
    // Con la cartella: deve essere di quel bando
    const h = await grant('Altro bando')
    const mine = await createFolder(sql, g, null, 'Mia')
    const theirs = await createFolder(sql, h, null, 'Sua')
    await expect(requireGrantFolder(sql, g, mine.id)).resolves.toBeUndefined()
    await expect(requireGrantFolder(sql, g, theirs.id)).rejects.toMatchObject({ statusCode: 404, statusMessage: 'Cartella non trovata' })
  })

  it('indici su bando più cartella', async () => {
    const rows = await sql`
      select indexname, indexdef from pg_indexes
      where indexname in ('grant_folders_grant_parent', 'grant_files_grant_folder')
      order by indexname
    `
    expect(rows.map(r => r.indexdef.replace(/^.* USING btree /, ''))).toEqual(['(grant_id, folder_id)', '(grant_id, parent_id)'])
  })

  it('senza cartella del bando: 409 su ogni scrittura, niente nello store', async () => {
    const g = await grant('Bando', { folder: false })
    const store = memoryStore()
    const noFolder = { statusCode: 409, statusMessage: 'Crea prima la cartella del bando' }
    await expect(createFolder(sql, g, null, 'Bozze')).rejects.toMatchObject(noFolder)
    await expect(addFile(sql, store, file(g, null, 'x.pdf'))).rejects.toMatchObject(noFolder)
    expect(store.files.size).toBe(0)
    const [{ n }] = await sql`
      select (select count(*) from grant_files) + (select count(*) from grant_folders) as n
    ` as unknown as [{ n: string }]
    expect(Number(n)).toBe(0)

    // Righe messe a mano (come prima del controllo): niente rinomina, spostamento o cancellazione
    const [folder] = await sql`insert into grant_folders (grant_id, name) values (${g}, 'Vecchia') returning id`
    await expect(renameEntry(sql, g, 'folder', folder!.id, 'Nuova')).rejects.toMatchObject(noFolder)
    await expect(moveEntry(sql, g, 'folder', folder!.id, null)).rejects.toMatchObject(noFolder)
    await expect(deleteEntry(sql, store, g, 'folder', folder!.id)).rejects.toMatchObject(noFolder)
  })

  it('un bando che non c\'è: 404 senza caricare niente', async () => {
    const ghost = '00000000-0000-4000-8000-000000000000'
    const store = memoryStore()
    const noGrant = { statusCode: 404, statusMessage: 'Bando non trovato' }
    await expect(createFolder(sql, ghost, null, 'Bozze')).rejects.toMatchObject(noGrant)
    await expect(addFile(sql, store, file(ghost, null, 'x.pdf'))).rejects.toMatchObject(noGrant)
    expect(store.files.size).toBe(0)
  })

  it('la cartella tolta tra il controllo e la riga: 409 e i byte escono dallo store', async () => {
    const g = await grant('Bando')
    const base = memoryStore()
    // Lo store toglie folder_at mentre carica: il controllo sotto il lucchetto lo vede
    const racing = {
      ...base,
      put: async (key: string, data: Buffer) => {
        await base.put(key, data)
        await sql`update radar_grants set folder_at = null where id = ${g}`
      },
    }
    await expect(addFile(sql, racing, file(g, null, 'x.pdf'))).rejects.toMatchObject({ statusCode: 409 })
    expect(base.files.size).toBe(0)
  })
})
