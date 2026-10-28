import type { FileStore } from '../../server/utils/file-store'

// File store in memoria per i test; failPut e failRemove simulano un guasto
export function memoryStore(opts: { failPut?: boolean, failRemove?: boolean } = {}): FileStore & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>()
  return {
    files,
    async put(key, data) {
      if (opts.failPut) throw new Error('put non riuscito')
      files.set(key, data)
    },
    async get(key) {
      const data = files.get(key)
      if (!data) throw new Error('file non trovato')
      return data
    },
    async remove(key) {
      if (opts.failRemove) throw new Error('remove non riuscito')
      files.delete(key)
    },
  }
}
