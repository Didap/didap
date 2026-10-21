import { createSign, randomBytes } from 'node:crypto'

// Google Drive con un account di servizio, senza SDK: un JWT firmato si
// scambia con un token, poi le API REST. L'account di servizio non ha
// spazio suo: scrive in una cartella di un Drive condiviso di Google
// Workspace, di cui è membro (ruolo "Gestore contenuti").
//
// GOOGLE_SERVICE_ACCOUNT_JSON: la chiave JSON dell'account (anche in base64)
// RADAR_DRIVE_FOLDER_ID: la cartella "Bandi" dentro il Drive condiviso

type ServiceAccount = { client_email: string, private_key: string }

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const SCOPE = 'https://www.googleapis.com/auth/drive'
export const FOLDER_MIME = 'application/vnd.google-apps.folder'

export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
  const text = raw?.trim()
  if (!text) return null
  try {
    const json = JSON.parse(text.startsWith('{') ? text : Buffer.from(text, 'base64').toString('utf-8'))
    return json.client_email && json.private_key ? json : null
  }
  catch {
    return null
  }
}

const serviceAccount = () => parseServiceAccount(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
export const driveFolderId = () => process.env.RADAR_DRIVE_FOLDER_ID?.trim() ?? ''
export const hasDrive = () => !!serviceAccount() && !!driveFolderId()

const base64url = (data: string | Buffer) => Buffer.from(data).toString('base64url')

// Il JWT dell'account di servizio (RS256), valido un'ora
export function serviceJwt(account: ServiceAccount, now = Date.now()): string {
  const iat = Math.floor(now / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  return `${header}.${claims}.${base64url(signer.sign(account.private_key))}`
}

let token: { value: string, expires: number } | null = null

async function accessToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value
  const account = serviceAccount()
  if (!account) throw new Error('Google Drive non configurato (GOOGLE_SERVICE_ACCOUNT_JSON)')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: serviceJwt(account) }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Google ha rifiutato l'account di servizio (${res.status}): ${(await res.text()).slice(0, 300)}`)
  const body = await res.json() as { access_token: string, expires_in: number }
  token = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 }
  return token.value
}

async function driveCall<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${await accessToken()}` },
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300)
    throw new Error(res.status === 404
      ? `Cartella di Drive non trovata o non condivisa con l'account di servizio: ${detail}`
      : `Google Drive ha risposto ${res.status}: ${detail}`)
  }
  return res.json() as Promise<T>
}

// I nomi su Drive possono contenere quasi tutto: niente a capo, lunghezza ragionevole
export const driveName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, 150) || 'Senza titolo'

export type DriveFile = { id: string, webViewLink: string }

export function createDriveFolder(name: string, parentId: string): Promise<DriveFile> {
  return driveCall<DriveFile>(`${API}?supportsAllDrives=true&fields=id,webViewLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: driveName(name), mimeType: FOLDER_MIME, parents: [parentId] }),
  })
}

// Corpo multipart/related: metadati JSON e contenuto del file
export function multipartBody(metadata: object, mime: string, data: Buffer, boundary = randomBytes(12).toString('hex')) {
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
    + `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`
  return {
    contentType: `multipart/related; boundary=${boundary}`,
    body: Buffer.concat([Buffer.from(head), data, Buffer.from(`\r\n--${boundary}--`)]),
  }
}

export function uploadDriveFile(name: string, mime: string, data: Buffer, parentId: string): Promise<DriveFile> {
  const { contentType, body } = multipartBody({ name: driveName(name), parents: [parentId] }, mime, data)
  return driveCall<DriveFile>(`${UPLOAD}?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  })
}
