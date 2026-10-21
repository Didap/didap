import { createVerify, generateKeyPairSync } from 'node:crypto'
import type postgres from 'postgres'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { driveName, parseServiceAccount, serviceJwt, uploadDriveFile } from '../server/utils/drive'
import { ingestSources, listEvaluatedGrants, readPending } from '../server/utils/radar'
import { startGrantFolder } from '../server/utils/radar-drive'
import type { GrantReader } from '../server/utils/radar-reader'
import type { RadarSource } from '../server/utils/radar-sources'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const account = {
  client_email: 'radar@didap.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
}

describe('account di servizio Google', () => {
  it('legge la chiave in JSON o in base64, scarta il resto', () => {
    const json = JSON.stringify(account)
    expect(parseServiceAccount(json)?.client_email).toBe(account.client_email)
    expect(parseServiceAccount(Buffer.from(json).toString('base64'))?.client_email).toBe(account.client_email)
    expect(parseServiceAccount('{"client_email":"x"}')).toBeNull()
    expect(parseServiceAccount('non è una chiave')).toBeNull()
    expect(parseServiceAccount(undefined)).toBeNull()
  })

  it('firma il JWT con la chiave dell\'account', () => {
    const jwt = serviceJwt(account, Date.UTC(2026, 9, 21))
    const [header, claims, signature] = jwt.split('.')
    expect(JSON.parse(Buffer.from(claims!, 'base64url').toString())).toMatchObject({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
    })
    const verify = createVerify('RSA-SHA256')
    verify.update(`${header}.${claims}`)
    expect(verify.verify(publicKey, Buffer.from(signature!, 'base64url'))).toBe(true)
  })

  it('nomi dei file su Drive', () => {
    expect(driveName('  Bando\nPMI  ')).toBe('Bando PMI')
    expect(driveName('')).toBe('Senza titolo')
  })
})

describe('caricamento su Drive', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('apre la sessione resumable e manda il file all\'indirizzo dato', async () => {
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON', JSON.stringify(account))
    const seen: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)
      seen.push(`${init?.method ?? 'GET'} ${url.split('?')[0]}${url.includes('resumable') ? ' resumable' : ''}`)
      if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'tok', expires_in: 3600 })
      if (url.includes('uploadType=resumable')) return new Response(null, { headers: { location: 'https://upload.example/sessione' } })
      return Response.json({ id: 'file' })
    }))
    await uploadDriveFile('grande.pdf', 'application/pdf', Buffer.alloc(6 * 1024 * 1024), 'cartella')
    expect(seen.slice(-2)).toEqual([
      'POST https://www.googleapis.com/upload/drive/v3/files resumable',
      'PUT https://upload.example/sessione',
    ])
  })
})

// Google e il sito del bando finti: ogni chiamata finisce in `calls`
type Call = { url: string, method: string, body: string }

// `failFile`: il file il cui caricamento su Drive fallisce
function fakeWeb(calls: Call[], { failFile = '' } = {}) {
  let folders = 0
  return vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    const body = init?.body instanceof Uint8Array ? Buffer.from(init.body).toString('latin1') : String(init?.body ?? '')
    calls.push({ url, method: init?.method ?? 'GET', body })
    if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'tok', expires_in: 3600 })
    if (url.startsWith('https://www.googleapis.com/drive/v3/files')) {
      folders++
      return Response.json({ id: `cartella-${folders}` })
    }
    if (url.startsWith('https://www.googleapis.com/upload/drive/v3/files')) {
      if (failFile && body.includes(`"name":"${failFile}"`)) return new Response('quota', { status: 500 })
      return new Response(null, { headers: { location: 'https://upload.example/sessione' } })
    }
    if (url === 'https://upload.example/sessione') return Response.json({ id: 'file' })
    if (url === 'https://example.com/a') {
      return new Response('<main><p>Bando</p><a href="/docs/avviso.pdf">Avviso</a><a href="/docs/rotto.pdf">Rotto</a></main>', { headers: { 'content-type': 'text/html' } })
    }
    if (url === 'https://example.com/docs/avviso.pdf') return new Response(Buffer.from('%PDF-1.4 finto'))
    return new Response('', { status: 404 })
  })
}

const source: RadarSource = {
  slug: 'finta',
  group: 'regione',
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

describe.skipIf(!TEST_DATABASE_URL)('cartella del bando su Drive', () => {
  let sql: postgres.Sql
  const calls: Call[] = []

  beforeAll(async () => {
    sql = await openTestDb()
  })
  afterAll(async () => {
    await sql?.end()
  })
  beforeEach(async () => {
    await resetTestDb(sql)
    calls.length = 0
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON', JSON.stringify(account))
    vi.stubEnv('RADAR_DRIVE_FOLDER_ID', 'cartella-bandi')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
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
    return (await listEvaluatedGrants(sql))[0]!
  }

  it('crea la cartella col bando e i suoi PDF, una volta sola', async () => {
    const grant = await oneGrant()
    vi.stubGlobal('fetch', fakeWeb(calls))

    expect(await startGrantFolder(sql, grant.id, run)).toEqual({ status: 'creating' })
    // Un secondo clic mentre lavora non apre un altro lavoro
    expect(await startGrantFolder(sql, grant.id, run)).toEqual({ status: 'creating' })
    expect(jobs).toHaveLength(1)
    expect((await listEvaluatedGrants(sql))[0]).toMatchObject({ driveCreating: true, driveUrl: null })
    await finish()

    const folder = calls.find(c => c.url.startsWith('https://www.googleapis.com/drive/v3/files'))!
    expect(JSON.parse(folder.body)).toEqual({ name: 'Voucher bando A', mimeType: 'application/vnd.google-apps.folder', parents: ['cartella-bandi'] })
    const sessions = calls.filter(c => c.url.startsWith('https://www.googleapis.com/upload'))
    expect(sessions.map(u => JSON.parse(u.body).name).sort()).toEqual(['avviso.pdf', 'bando-voucher-bando-a.md'])
    const sent = calls.filter(c => c.url === 'https://upload.example/sessione').map(c => c.body)
    expect(sent.some(b => b.includes('titolo: "Voucher bando A"'))).toBe(true)
    expect(sent).toContain('%PDF-1.4 finto')

    // Pronta, salvata sul bando, che diventa interessante; poi solo il link
    const url = 'https://drive.google.com/drive/folders/cartella-1'
    expect((await listEvaluatedGrants(sql))[0]).toMatchObject({
      driveUrl: url,
      driveCreating: false,
      driveNote: '1 PDF del bando caricati, 1 non scaricati dal sito',
      liked: true,
    })
    calls.length = 0
    expect(await startGrantFolder(sql, grant.id, run)).toEqual({ status: 'ready', url })
    expect(jobs).toHaveLength(0)
    expect(calls).toEqual([])
  })

  it('se Drive si ferma a metà, il clic dopo riprende nella stessa cartella', async () => {
    const grant = await oneGrant()
    vi.stubGlobal('fetch', fakeWeb(calls, { failFile: 'bando-voucher-bando-a.md' }))
    await startGrantFolder(sql, grant.id, run)
    await finish()
    expect((await listEvaluatedGrants(sql))[0]).toMatchObject({ driveUrl: null, driveCreating: false })
    expect((await listEvaluatedGrants(sql))[0]!.driveNote).toMatch(/^Non riuscita: Google Drive ha risposto 500/)

    // Drive torna a funzionare
    calls.length = 0
    vi.stubGlobal('fetch', fakeWeb(calls))
    await startGrantFolder(sql, grant.id, run)
    await finish()
    // Nessuna cartella nuova: si usa quella già creata
    expect(calls.some(c => c.url.startsWith('https://www.googleapis.com/drive/v3/files'))).toBe(false)
    expect((await listEvaluatedGrants(sql))[0]!.driveUrl).toBe('https://drive.google.com/drive/folders/cartella-1')
  })

  it('senza configurazione non chiama Google', async () => {
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON', '')
    await expect(startGrantFolder(sql, '00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({ statusCode: 503 })
  })
})
