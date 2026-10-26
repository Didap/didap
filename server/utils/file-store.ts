import { randomUUID } from 'node:crypto'
import { createError } from 'h3'
import { cloudinaryConfig, cloudinaryStore } from './cloudinary'

// Dove stanno i file della cartella di un bando. Oggi Cloudinary, ma il resto
// del codice parla solo con questa interfaccia (e nei test con una in memoria).
export type FileStore = {
  put(key: string, data: Buffer, filename: string): Promise<void>
  get(key: string): Promise<Buffer>
  remove(key: string): Promise<void>
}

// Chiave casuale: il nome vero del file sta nel database, non qui
export const grantFileKey = (grantId: string) => `didap/bandi/${grantId}/${randomUUID()}`

export function useFileStore(): FileStore | null {
  const cfg = cloudinaryConfig()
  return cfg ? cloudinaryStore(cfg) : null
}

export function requireFileStore(): FileStore {
  const store = useFileStore()
  if (!store) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Cloudinary non configurato (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
    })
  }
  return store
}
