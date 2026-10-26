import { adminErrorText } from '~/utils/adminErrors'
import { MAX_FILE_BYTES, type EntryKind, type FileEntry, type FolderEntry, type FolderListing } from '#shared/grant-files'

// Cartella di un bando vista dal pannello: la cartella aperta, le operazioni
// sugli elementi e i caricamenti, uno per richiesta (ogni riga ha il suo
// stato e un errore ferma solo quel file)

// Tipi che il server manda nel browser (gli altri si scaricano)
const PREVIEW = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'])
export const canPreview = (f: FileEntry) => PREVIEW.has(f.mime)

export type FileKind = 'folder' | 'pdf' | 'image' | 'doc' | 'sheet' | 'other'

const DOC_EXT = /\.(docx?|odt|rtf|txt|md|pages)$/i
const SHEET_EXT = /\.(xlsx?|ods|csv|numbers)$/i

// Icona di un file: dal tipo e, se il tipo è generico, dall'estensione
export function fileKind(f: FileEntry): FileKind {
  const m = f.mime
  if (m === 'application/pdf' || /\.pdf$/i.test(f.name)) return 'pdf'
  if (m.startsWith('image/')) return 'image'
  if (/spreadsheet|excel|csv/.test(m) || SHEET_EXT.test(f.name)) return 'sheet'
  if (/wordprocessing|msword|opendocument\.text|rtf|^text\//.test(m) || DOC_EXT.test(f.name)) return 'doc'
  return 'other'
}

const decimal = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })

// 1536 -> "1,5 KB"
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${decimal.format(n / 1024)} KB`
  return `${decimal.format(n / 1024 / 1024)} MB`
}

// Una cartella nell'elenco di "Sposta in...": depth 0 è la principale
export type TreeFolder = { id: string | null, name: string, depth: number }

export type Upload = {
  key: number
  name: string
  state: 'waiting' | 'uploading' | 'done' | 'error'
  error: string
}

// Caricamenti in parallelo
const UPLOAD_WORKERS = 2

let nextUpload = 0

export function useGrantFiles(grantId: () => string) {
  const { notify } = useAdminToast()
  const base = (id = grantId()) => `/api/admin/radar/grants/${id}/files`

  const folderId = ref<string | null>(null)
  const listing = ref<FolderListing | null>(null)
  const loading = ref(false)
  const uploads = ref<Upload[]>([])

  // Solo l'ultima richiesta conta: si cambia cartella o bando mentre carica
  let loadSeq = 0
  async function load() {
    const seq = ++loadSeq
    loading.value = true
    try {
      const res = await $fetch<FolderListing>(base(), { query: folderId.value ? { folder: folderId.value } : {} })
      if (seq === loadSeq) listing.value = res
    }
    catch (err) {
      if (seq !== loadSeq) return
      // La cartella aperta non c'è più (eliminata o spostata altrove): si torna su
      if ((err as { statusCode?: number }).statusCode === 404 && folderId.value) {
        folderId.value = null
        return load()
      }
      notify('error', adminErrorText(err))
    }
    finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  function openFolder(id: string | null) {
    folderId.value = id
    return load()
  }

  // Un altro bando: si riparte dalla principale
  function reset() {
    folderId.value = null
    listing.value = null
    uploads.value = []
  }

  // Le scritture: true se è andata, altrimenti l'errore nell'avviso e
  // l'elenco ricaricato (qualcun altro può averlo cambiato)
  async function write(run: () => Promise<unknown>): Promise<boolean> {
    try {
      await run()
      return true
    }
    catch (err) {
      notify('error', adminErrorText(err))
      await load()
      return false
    }
  }

  async function createFolder(name: string): Promise<FolderEntry | null> {
    try {
      const made = await $fetch<FolderEntry>(`${base()}/folders`, { method: 'POST', body: { parentId: folderId.value, name } })
      await load()
      return made
    }
    catch (err) {
      notify('error', adminErrorText(err))
      await load()
      return null
    }
  }

  async function patch(kind: EntryKind, id: string, body: { name: string } | { folderId: string | null }) {
    const ok = await write(() => $fetch(`${base()}/entries/${kind}/${id}`, { method: 'PATCH', body }))
    if (ok) await load()
    return ok
  }

  const rename = (kind: EntryKind, id: string, name: string) => patch(kind, id, { name })
  const move = (kind: EntryKind, id: string, target: string | null) => patch(kind, id, { folderId: target })

  async function remove(kind: EntryKind, id: string) {
    const ok = await write(() => $fetch(`${base()}/entries/${kind}/${id}`, { method: 'DELETE' }))
    if (ok) await load()
    return ok
  }

  // Tutte le cartelle del bando, in ordine come in un albero: un elenco per
  // cartella, chiesto solo quando serve (menu "Sposta in...")
  async function folderTree(): Promise<TreeFolder[]> {
    const url = base()
    const branch = async (f: FolderEntry, depth: number): Promise<TreeFolder[]> => {
      const l = await $fetch<FolderListing>(url, { query: { folder: f.id } })
      const kids = await Promise.all(l.folders.map(c => branch(c, depth + 1)))
      return [{ id: f.id, name: f.name, depth }, ...kids.flat()]
    }
    const root = await $fetch<FolderListing>(url)
    const kids = await Promise.all(root.folders.map(f => branch(f, 1)))
    return [{ id: null, name: root.path[0]?.name ?? 'Cartella del bando', depth: 0 }, ...kids.flat()]
  }

  // Nella cartella aperta; oltre 10 MB non partono. Le righe finite spariscono,
  // quelle andate male restano finché non si chiudono.
  async function upload(files: File[]) {
    const grant = grantId()
    const target = folderId.value
    const big = files.filter(f => f.size > MAX_FILE_BYTES)
    if (big.length) {
      notify('error', big.length === 1
        ? `${big[0]!.name} supera i 10 MB`
        : `${big.map(f => f.name).join(', ')} superano i 10 MB`)
    }
    const jobs = files
      .filter(f => f.size <= MAX_FILE_BYTES)
      .map(file => ({ file, row: reactive<Upload>({ key: ++nextUpload, name: file.name, state: 'waiting', error: '' }) }))
    if (!jobs.length) return
    uploads.value.push(...jobs.map(j => j.row))

    let next = 0
    const worker = async () => {
      while (next < jobs.length) {
        const { file, row } = jobs[next++]!
        row.state = 'uploading'
        try {
          const body = new FormData()
          body.append('file', file, file.name)
          await $fetch(`${base(grant)}/upload`, { method: 'POST', body, query: target ? { folder: target } : {} })
          row.state = 'done'
        }
        catch (err) {
          row.state = 'error'
          row.error = adminErrorText(err)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(UPLOAD_WORKERS, jobs.length) }, worker))

    const failed = jobs.filter(j => j.row.state === 'error')
    const done = jobs.length - failed.length
    if (failed.length === 1) notify('error', `${failed[0]!.row.name}: ${failed[0]!.row.error}`)
    else if (failed.length) notify('error', `${failed.length} file non caricati`)
    // Senza coprire l'avviso dei file troppo grandi
    else if (!big.length) notify('ok', done === 1 ? 'File caricato' : `${done} file caricati`)
    uploads.value = uploads.value.filter(u => u.state !== 'done')
    // Nel frattempo si può essere passati a un altro bando
    if (grantId() === grant) await load()
  }

  function dismissUploads() {
    uploads.value = uploads.value.filter(u => u.state !== 'error')
  }

  const contentUrl = (f: FileEntry, download = false) =>
    `${base()}/content/${f.id}${download ? '?download=1' : ''}`

  return {
    folderId,
    listing,
    loading,
    uploads,
    load,
    openFolder,
    reset,
    createFolder,
    rename,
    move,
    remove,
    folderTree,
    upload,
    dismissUploads,
    contentUrl,
  }
}
