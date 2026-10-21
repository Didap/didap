import { createSign } from 'node:crypto'

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
const FOLDER_MIME = 'application/vnd.google-apps.folder'

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
// Caricamenti in parallelo a freddo: una sola richiesta di token
let pending: Promise<string> | null = null

function accessToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return Promise.resolve(token.value)
  pending ??= requestToken().finally(() => {
    pending = null
  })
  return pending
}

async function requestToken(): Promise<string> {
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

// Una chiamata autenticata; gli errori di Google con il loro testo
async function driveFetch(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${await accessToken()}` },
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) throw new DriveError(res.status, `Google Drive ha risposto ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res
}

class DriveError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

// I nomi su Drive possono contenere quasi tutto: niente a capo, lunghezza ragionevole
export const driveName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, 150) || 'Senza titolo'

export const driveFolderUrl = (id: string) => `https://drive.google.com/drive/folders/${id}`

// L'id della cartella creata dentro `parentId`
export async function createDriveFolder(name: string, parentId: string): Promise<string> {
  try {
    const res = await driveFetch(`${API}?supportsAllDrives=true&fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: driveName(name), mimeType: FOLDER_MIME, parents: [parentId] }),
    })
    return ((await res.json()) as { id: string }).id
  }
  catch (err) {
    // Un 404 qui è quasi sempre la cartella "Bandi" non condivisa con l'account
    if (err instanceof DriveError && err.status === 404) {
      throw new Error(`Cartella "Bandi" non trovata o non condivisa con l'account di servizio. ${(err as Error).message}`)
    }
    throw err
  }
}

// Nomi dei file già in una cartella (fino a 1000, ne bastano molti meno)
export async function listDriveNames(folderId: string): Promise<Set<string>> {
  const q = encodeURIComponent(`'${folderId.replace(/['\\]/g, '\\$&')}' in parents and trashed = false`)
  const res = await driveFetch(`${API}?q=${q}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000&fields=files(name)`, {})
  const { files } = (await res.json()) as { files: { name: string }[] }
  return new Set(files.map(f => f.name))
}

// Caricamento "resumable", valido a ogni dimensione: si apre la sessione
// coi metadati, poi si manda il file all'indirizzo che Google restituisce
export async function uploadDriveFile(name: string, mime: string, data: Buffer, parentId: string): Promise<void> {
  const session = await driveFetch(`${UPLOAD}?uploadType=resumable&supportsAllDrives=true&fields=id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mime,
      'X-Upload-Content-Length': String(data.length),
    },
    body: JSON.stringify({ name: driveName(name), parents: [parentId] }),
  })
  const location = session.headers.get('location')
  if (!location) throw new Error('Google Drive non ha aperto la sessione di caricamento')
  // Vista sullo stesso buffer, senza copiare PDF da decine di MB
  await driveFetch(location, {
    method: 'PUT',
    headers: { 'Content-Type': mime },
    body: new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength),
  })
}
