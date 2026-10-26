import type postgres from 'postgres'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_FILE_BYTES } from '#shared/grant-files'
import { listFolder, renameEntry } from '../server/utils/grant-files'
import { pdfFileName, startGrantFolder } from '../server/utils/grant-folder'
import { ingestSources, listGrants, readPending } from '../server/utils/radar'
import type { GrantReader } from '../server/utils/radar-reader'
import type { RadarSource } from '../server/utils/radar-sources'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'
import { memoryStore } from './helpers/memory-store'

describe('nomi dei PDF del bando', () => {
  it('dal link, puliti per la cartella', () => {
    expect(pdfFileName('https://example.com/docs/avviso.pdf')).toBe('avviso.pdf')
    expect(pdfFileName('https://example.com/docs/Avviso%20pubblico.pdf')).toBe('Avviso pubblico.pdf')
    // Barre e caratteri di controllo dal nome decodificato
    expect(pdfFileName('https://example.com/docs/a%2Fb%0Ac.pdf')).toBe('a b c.pdf')
    const long = pdfFileName(`https://example.com/docs/${'x'.repeat(400)}.pdf`)
    expect(long.length).toBeLessThanOrEqual(160)
    expect(long.endsWith('.pdf')).toBe(true)
    expect(pdfFileName('https://example.com/docs/%2F.pdf')).toBe('documento.pdf')
  })
})

// Lo store vede solo i byte: il PDF finto comincia con %PDF, l'export del bando no
const isPdf = (data: Buffer) => data.subarray(0, 4).toString() === '%PDF'

// Il sito del bando finto: ogni richiesta finisce in `calls`
// `bigPdf`: avviso.pdf di 10 MB + 1 byte; `pageDown`: la pagina del bando dà 404
function fakeWeb(calls: string[], { bigPdf = false, pageDown = false } = {}) {
  return vi.fn(async (input: string | URL) => {
    const url = String(input)
    calls.push(url)
    if (url === 'https://example.com/a' && !pageDown) {
      return new Response('<main><p>Bando</p><a href="/docs/avviso.pdf">Avviso</a><a href="/docs/rotto.pdf">Rotto</a></main>', { headers: { 'content-type': 'text/html' } })
    }
    if (url === 'https://example.com/docs/avviso.pdf') {
      return new Response(bigPdf ? Buffer.alloc(MAX_FILE_BYTES + 1) : Buffer.from('%PDF-1.4 finto'))
    }
    return new Response('', { status: 404 })
  })
}

const source: RadarSource = {
  slug: 'finta',
  refreshDays: 0,
  complete: true,
  fetchListing: async () => [{ externalId: 'a', url: 'https://example.com/a', content: 'bando A' }],
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

describe.skipIf(!TEST_DATABASE_URL)('cartella del bando', () => {
  let sql: postgres.Sql
  const calls: string[] = []

  beforeAll(async () => {
    sql = await openTestDb()
  })
  afterAll(async () => {
    await sql?.end()
  })
  beforeEach(async () => {
    await resetTestDb(sql)
    calls.length = 0
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Il lavoro in background si raccoglie qui e parte quando il test lo dice
  const jobs: (() => Promise<void>)[] = []
  const run = (job: () => Promise<void>) => {
    jobs.push(job)
  }
  const finish = async () => {
    for (const job of jobs.splice(0)) await job()
  }

  async function oneGrant() {
    await ingestSources(sql, [source])
    await readPending(sql, reader)
    return (await listGrants(sql, new Date(), { withFolders: true }))[0]!
  }

  const reread = async () => (await listGrants(sql, new Date(), { withFolders: true }))[0]!

  // "Dal bando" dentro la principale, e i nomi dei file che contiene
  async function fromSite(grantId: string) {
    const root = await listFolder(sql, grantId, null)
    const folders = root.folders.filter(f => f.name === 'Dal bando')
    expect(folders).toHaveLength(1)
    return (await listFolder(sql, grantId, folders[0]!.id)).files
  }

  it('crea la cartella col bando e i suoi PDF, una volta sola', async () => {
    const grant = await oneGrant()
    expect(grant).toMatchObject({ hasFolder: false, folderFilled: false, folderFilling: false, folderNote: '', closed: false })
    vi.stubGlobal('fetch', fakeWeb(calls))
    const store = memoryStore()

    expect(await startGrantFolder(sql, store, grant.id, run)).toEqual({ status: 'filling' })
    // Un secondo clic mentre lavora non apre un altro lavoro
    expect(await startGrantFolder(sql, store, grant.id, run)).toEqual({ status: 'filling' })
    expect(jobs).toHaveLength(1)
    expect(await reread()).toMatchObject({ hasFolder: true, folderFilled: false, folderFilling: true })
    await finish()

    const files = await fromSite(grant.id)
    expect(files.map(f => f.name)).toEqual(['avviso.pdf', 'bando-voucher-bando-a.md'])
    expect(files.every(f => f.uploadedBy === null)).toBe(true)
    const stored = [...store.files.values()].map(b => b.toString())
    expect(stored).toContain('%PDF-1.4 finto')
    expect(stored.some(b => b.includes('titolo: "Voucher bando A"'))).toBe(true)

    expect(await reread()).toMatchObject({
      hasFolder: true,
      folderFilled: true,
      folderFilling: false,
      folderNote: '1 PDF del bando caricati, 1 non scaricati dal sito',
      liked: true,
    })
    // Già riempita: niente lavoro né richieste
    calls.length = 0
    expect(await startGrantFolder(sql, store, grant.id, run)).toEqual({ status: 'ready' })
    expect(jobs).toHaveLength(0)
    expect(calls).toEqual([])
  })

  it('un PDF oltre 10 MB non si carica e la nota lo dice', async () => {
    const grant = await oneGrant()
    vi.stubGlobal('fetch', fakeWeb(calls, { bigPdf: true }))
    const store = memoryStore()
    await startGrantFolder(sql, store, grant.id, run)
    await finish()
    expect((await reread()).folderNote).toContain('1 oltre 10 MB, da scaricare dal sito del bando')
    expect((await fromSite(grant.id)).map(f => f.name)).toEqual(['bando-voucher-bando-a.md'])
  })

  it('se lo store si ferma a metà, il clic dopo riprende nella stessa cartella', async () => {
    const grant = await oneGrant()
    vi.stubGlobal('fetch', fakeWeb(calls))
    const store = memoryStore()
    const failing = {
      ...store,
      put: async (key: string, data: Buffer) => {
        if (!isPdf(data)) throw new Error('quota')
        return store.put(key, data)
      },
    }
    await startGrantFolder(sql, failing, grant.id, run)
    await finish()
    // Creata ma non riempita: il pannello offre di riprovare
    expect(await reread()).toMatchObject({ hasFolder: true, folderFilled: false, folderFilling: false, folderFailed: true, folderNote: 'Non riuscita: quota' })
    expect((await fromSite(grant.id)).map(f => f.name)).toEqual(['avviso.pdf'])

    // Lo store torna a funzionare
    calls.length = 0
    expect(await startGrantFolder(sql, store, grant.id, run)).toEqual({ status: 'filling' })
    await finish()
    // Stessa "Dal bando", e il PDF già presente non si riscarica né si ricarica
    expect((await fromSite(grant.id)).map(f => f.name)).toEqual(['avviso.pdf', 'bando-voucher-bando-a.md'])
    expect(calls).not.toContain('https://example.com/docs/avviso.pdf')
    expect(store.files.size).toBe(2)
    expect(await reread()).toMatchObject({ folderFilled: true, folderFilling: false, folderFailed: false, folderNote: '1 PDF del bando caricati, 1 non scaricati dal sito' })
  })

  it('un PDF scaricato ma non caricato: cartella da finire, il clic dopo lo prende', async () => {
    const grant = await oneGrant()
    vi.stubGlobal('fetch', fakeWeb(calls))
    const store = memoryStore()
    const noPdf = {
      ...store,
      put: async (key: string, data: Buffer) => {
        if (isPdf(data)) throw new Error('quota')
        return store.put(key, data)
      },
    }
    await startGrantFolder(sql, noPdf, grant.id, run)
    await finish()
    // La nota resta, ma non è "riempita": il pannello offre di riprovare
    expect(await reread()).toMatchObject({
      hasFolder: true,
      folderFilled: false,
      folderFilling: false,
      folderNote: '0 PDF del bando caricati, 1 non scaricati dal sito, 1 non caricati',
    })
    expect((await fromSite(grant.id)).map(f => f.name)).toEqual(['bando-voucher-bando-a.md'])

    expect(await startGrantFolder(sql, store, grant.id, run)).toEqual({ status: 'filling' })
    await finish()
    expect((await fromSite(grant.id)).map(f => f.name)).toEqual(['avviso.pdf', 'bando-voucher-bando-a.md'])
    expect(store.files.size).toBe(2)
    expect(await reread()).toMatchObject({ folderFilled: true, folderNote: '1 PDF del bando caricati, 1 non scaricati dal sito' })
  })

  // L'id della "Dal bando" segnato sul bando
  const sourceId = async (grantId: string) =>
    (await sql`select folder_source_id from radar_grants where id = ${grantId}`)[0]!.folder_source_id as string | null

  it('i tentativi riprendono nella stessa "Dal bando", anche rinominata; se è stata eliminata se ne fa una nuova', async () => {
    const grant = await oneGrant()
    vi.stubGlobal('fetch', fakeWeb(calls))
    const store = memoryStore()
    const failing = {
      ...store,
      put: async () => {
        throw new Error('quota')
      },
    }
    await startGrantFolder(sql, failing, grant.id, run)
    await finish()
    const first = await sourceId(grant.id)
    expect(first).not.toBeNull()
    // Rinominata con le maiuscole cambiate: per nome non si ritroverebbe
    await renameEntry(sql, grant.id, 'folder', first!, 'DAL BANDO')
    await startGrantFolder(sql, failing, grant.id, run)
    await finish()
    await startGrantFolder(sql, failing, grant.id, run)
    await finish()
    expect(await sourceId(grant.id)).toBe(first)
    expect((await listFolder(sql, grant.id, null)).folders.map(f => f.name)).toEqual(['DAL BANDO'])

    // Eliminata a mano: il tentativo dopo ne crea una e la segna
    await sql`delete from grant_folders where id = ${first}`
    expect(await sourceId(grant.id)).toBeNull()
    await startGrantFolder(sql, store, grant.id, run)
    await finish()
    const second = await sourceId(grant.id)
    expect(second).not.toBeNull()
    expect(second).not.toBe(first)
    expect((await fromSite(grant.id)).map(f => f.name)).toEqual(['avviso.pdf', 'bando-voucher-bando-a.md'])
  })

  it('un lavoro rimasto indietro non copre quello nuovo, e due lavori insieme non fanno "(2)"', async () => {
    const grant = await oneGrant()
    vi.stubGlobal('fetch', fakeWeb(calls))
    const store = memoryStore()
    await startGrantFolder(sql, store, grant.id, run)
    // Il turno del primo scade e un altro clic lo riprende
    await sql`update radar_grants set folder_claimed_at = now() - interval '1 hour' where id = ${grant.id}`
    await startGrantFolder(sql, store, grant.id, run)
    const [stale, fresh] = jobs.splice(0)
    // Il vecchio finisce per primo: lo stato resta quello del nuovo, in corso
    await stale!()
    expect(await reread()).toMatchObject({ folderFilled: false, folderFilling: true })
    await fresh!()
    expect(await reread()).toMatchObject({ folderFilled: true, folderFilling: false })
    expect((await fromSite(grant.id)).map(f => f.name)).toEqual(['avviso.pdf', 'bando-voucher-bando-a.md'])

    // Due lavori in parallelo sulla stessa cartella vuota: un file per nome,
    // e i byte del doppione escono dallo store. Lo store trattiene ogni file
    // finché l'altro lavoro non ha caricato lo stesso nome: entrambi hanno
    // già controllato che mancasse.
    await sql`delete from grant_files`
    store.files.clear()
    const waiting = new Map<string, () => void>()
    const paired = {
      ...store,
      put: async (key: string, data: Buffer) => {
        // Stesso file, stessi byte
        const same = data.toString()
        const other = waiting.get(same)
        if (other) other()
        else await new Promise<void>(resolve => waiting.set(same, resolve))
        return store.put(key, data)
      },
    }
    await sql`update radar_grants set folder_filled_at = null, folder_claimed_at = null where id = ${grant.id}`
    await startGrantFolder(sql, paired, grant.id, run)
    await sql`update radar_grants set folder_claimed_at = now() - interval '1 hour' where id = ${grant.id}`
    await startGrantFolder(sql, paired, grant.id, run)
    expect(jobs).toHaveLength(2)
    await Promise.all(jobs.splice(0).map(job => job()))
    expect((await fromSite(grant.id)).map(f => f.name)).toEqual(['avviso.pdf', 'bando-voucher-bando-a.md'])
    expect(store.files.size).toBe(2)
  })

  it('pagina del bando non raggiungibile: la nota resta e la cartella si può riprovare', async () => {
    const grant = await oneGrant()
    vi.stubGlobal('fetch', fakeWeb(calls, { pageDown: true }))
    const store = memoryStore()
    await startGrantFolder(sql, store, grant.id, run)
    await finish()
    expect(await reread()).toMatchObject({
      hasFolder: true,
      folderFilled: false,
      folderFilling: false,
      folderFailed: false,
      folderNote: 'Pagina del bando non raggiungibile: riprova più tardi o aggiungi i PDF a mano',
    })
    expect((await fromSite(grant.id)).map(f => f.name)).toEqual(['bando-voucher-bando-a.md'])

    vi.stubGlobal('fetch', fakeWeb(calls))
    expect(await startGrantFolder(sql, store, grant.id, run)).toEqual({ status: 'filling' })
    await finish()
    expect(await reread()).toMatchObject({ folderFilled: true, folderNote: '1 PDF del bando caricati, 1 non scaricati dal sito' })
    expect((await fromSite(grant.id)).map(f => f.name)).toEqual(['avviso.pdf', 'bando-voucher-bando-a.md'])
  })

  it('un bando che non c\'è', async () => {
    await expect(startGrantFolder(sql, memoryStore(), '00000000-0000-4000-8000-000000000000'))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})
