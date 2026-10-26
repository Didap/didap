import { createHash } from 'node:crypto'
import type { FileStore } from './file-store'

// Cloudinary senza SDK, solo REST firmate. Tutti i file sono "raw" e di tipo
// "authenticated": nessun URL pubblico, li legge solo il server con una
// richiesta firmata.
//
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

export type CloudinaryConfig = { cloudName: string, apiKey: string, apiSecret: string }

// Oltre un minuto Cloudinary non risponde più: meglio un errore che una
// richiesta appesa
const CLOUDINARY_TIMEOUT_MS = 60_000

export function cloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null
}

// Parametri in ordine alfabetico come chiave=valore uniti da &, il secret in
// coda, SHA-1 esadecimale
export function cloudinarySignature(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  return createHash('sha1').update(toSign + apiSecret).digest('hex')
}

async function failure(res: Response): Promise<Error> {
  const text = await res.text().catch(() => '')
  let message = text.slice(0, 200)
  try {
    message = JSON.parse(text)?.error?.message ?? message
  }
  catch {
    // corpo non JSON: resta il testo
  }
  return new Error(`Cloudinary ha risposto ${res.status}: ${message}`)
}

export function cloudinaryStore(cfg: CloudinaryConfig, fetchImpl: typeof fetch = fetch): FileStore {
  const base = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/raw`
  const now = () => Math.floor(Date.now() / 1000)

  return {
    // Il nome vero sta nel database. Al Blob do un nome senza estensione perché
    // Cloudinary la appende al public id dei file raw e poi non lo si ritrova
    async put(key, data, _filename) {
      const timestamp = now()
      const form = new FormData()
      form.set('file', new Blob([new Uint8Array(data)]), 'file')
      form.set('public_id', key)
      form.set('type', 'authenticated')
      form.set('timestamp', String(timestamp))
      form.set('api_key', cfg.apiKey)
      form.set('signature', cloudinarySignature({ public_id: key, timestamp, type: 'authenticated' }, cfg.apiSecret))
      const res = await fetchImpl(`${base}/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(CLOUDINARY_TIMEOUT_MS) })
      if (!res.ok) throw await failure(res)
    },

    async get(key) {
      const timestamp = now()
      const expiresAt = timestamp + 60
      const query = new URLSearchParams({
        public_id: key,
        type: 'authenticated',
        timestamp: String(timestamp),
        expires_at: String(expiresAt),
        api_key: cfg.apiKey,
        signature: cloudinarySignature({ expires_at: expiresAt, public_id: key, timestamp, type: 'authenticated' }, cfg.apiSecret),
      })
      const res = await fetchImpl(`${base}/download?${query}`, { signal: AbortSignal.timeout(CLOUDINARY_TIMEOUT_MS) })
      if (!res.ok) throw await failure(res)
      return Buffer.from(await res.arrayBuffer())
    },

    async remove(key) {
      const timestamp = now()
      const form = new FormData()
      form.set('public_id', key)
      form.set('type', 'authenticated')
      form.set('invalidate', 'true')
      form.set('timestamp', String(timestamp))
      form.set('api_key', cfg.apiKey)
      form.set('signature', cloudinarySignature({ invalidate: 'true', public_id: key, timestamp, type: 'authenticated' }, cfg.apiSecret))
      const res = await fetchImpl(`${base}/destroy`, { method: 'POST', body: form, signal: AbortSignal.timeout(CLOUDINARY_TIMEOUT_MS) })
      // "not found" arriva con 200 e result: "not found": già cancellato va bene
      if (!res.ok) throw await failure(res)
    },
  }
}
