import { createVerify, generateKeyPairSync } from 'node:crypto'
import type postgres from 'postgres'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { driveName, multipartBody, parseServiceAccount, serviceJwt } from '../server/utils/drive'
import { ingestSources, listEvaluatedGrants, readPending } from '../server/utils/radar'
import { createGrantFolder } from '../server/utils/radar-drive'
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

  it('corpo multipart e nomi dei file', () => {
    const { contentType, body } = multipartBody({ name: 'a.md' }, 'text/markdown', Buffer.from('# Ciao'), 'XYZ')
    expect(contentType).toBe('multipart/related; boundary=XYZ')
    expect(body.toString()).toBe('--XYZ\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"a.md"}\r\n--XYZ\r\nContent-Type: text/markdown\r\n\r\n# Ciao\r\n--XYZ--')
    expect(driveName('  Bando\nPMI  ')).toBe('Bando PMI')
    expect(driveName('')).toBe('Senza titolo')
  })
})

// Google e il sito del bando finti: ogni chiamata finisce in `calls`
type Call = { url: string, method: string, body: string }

function fakeWeb(calls: Call[]) {
  let folders = 0
  return vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    const body = init?.body instanceof Buffer ? init.body.toString('latin1') : String(init?.body ?? '')
    calls.push({ url, method: init?.method ?? 'GET', body })
    if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'tok', expires_in: 3600 })
    if (url.startsWith('https://www.googleapis.com/drive/v3/files')) {
      folders++
      return Response.json({ id: `cartella-${folders}`, webViewLink: `https://drive.google.com/drive/folders/cartella-${folders}` })
    }
    if (url.startsWith('https://www.googleapis.com/upload/drive/v3/files')) return Response.json({ id: 'file', webViewLink: 'https://drive.google.com/file' })
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

  it('crea la cartella col bando e i suoi PDF, una volta sola', async () => {
    await ingestSources(sql, [source])
    await readPending(sql, reader)
    const [grant] = await listEvaluatedGrants(sql)
    vi.stubGlobal('fetch', fakeWeb(calls))

    const result = await createGrantFolder(sql, grant!.id)
    expect(result).toEqual({ url: 'https://drive.google.com/drive/folders/cartella-1', files: 2, missing: 1 })

    const folder = calls.find(c => c.url.startsWith('https://www.googleapis.com/drive/v3/files'))!
    expect(JSON.parse(folder.body)).toEqual({ name: 'Voucher bando A', mimeType: 'application/vnd.google-apps.folder', parents: ['cartella-bandi'] })
    const uploads = calls.filter(c => c.url.startsWith('https://www.googleapis.com/upload'))
    expect(uploads.map(u => /"name":"([^"]+)"/.exec(u.body)?.[1])).toEqual(['bando-voucher-bando-a.md', 'avviso.pdf'])
    expect(uploads[0]!.body).toContain('titolo: "Voucher bando A"')

    // Salvata sul bando, che diventa interessante; un secondo clic non ne crea un'altra
    expect((await listEvaluatedGrants(sql))[0]).toMatchObject({ driveUrl: result.url, liked: true })
    calls.length = 0
    expect((await createGrantFolder(sql, grant!.id)).url).toBe(result.url)
    expect(calls).toEqual([])
  })

  it('senza configurazione non chiama Google', async () => {
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON', '')
    await expect(createGrantFolder(sql, '00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({ statusCode: 503 })
  })
})
