import { adminErrorText } from '~/utils/adminErrors'
import { INLINE_MIMES, MAX_FILE_BYTES, MAX_FILE_MB, treeFolders, type EntryKind, type FileEntry, type FolderEntry, type FolderListing, type TreeFolder, type TreeRow } from '#shared/grant-files'

// Cartella di un bando vista dal pannello: la cartella aperta, le operazioni
// sugli elementi e i caricamenti, uno per richiesta (ogni riga ha il suo
// stato e un errore ferma solo quel file)

// Tipi che il server manda nel browser (gli altri si scaricano)
export const canPreview = (f: FileEntry) => INLINE_MIMES.has(f.mime)

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

export type { TreeFolder }

export type Upload = {
  key: number
  name: string
  state: 'waiting' | 'uploading' | 'done' | 'error'
  error: string
}

// Caricamenti in parallelo
const UPLOAD_WORKERS = 2

let nextUpload = 0

// Una istanza per bando: la scheda del bando la ricrea quando si passa a un
// altro (:key), così niente risposte del bando di prima
export function useGrantFiles(grantId: string) {
  const { notify } = useAdminToast()
  const base = `/api/admin/radar/grants/${grantId}/files`

  const folderId = ref<string | null>(null)
  const listing = ref<FolderListing | null>(null)
  const loading = ref(false)
  const uploads = ref<Upload[]>([])

  // Solo l'ultima richiesta conta: si cambia cartella mentre carica
  let loadSeq = 0
  async function load() {
    const seq = ++loadSeq
    loading.value = true
    try {
      const res = await $fetch<FolderListing>(base, { query: folderId.value ? { folder: folderId.value } : {} })
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

  // Le scritture: true se è andata, altrimenti l'errore nell'avviso. Poi
  // l'elenco si ricarica (qualcun altro può averlo cambiato).
  async function write(run: () => Promise<unknown>): Promise<boolean> {
    let ok = true
    try {
      await run()
    }
    catch (err) {
      notify('error', adminErrorText(err))
      ok = false
    }
    await load()
    return ok
  }

  // La cartella nuova; null se non è andata
  async function createFolder(name: string): Promise<FolderEntry | null> {
    let made: FolderEntry | null = null
    await write(async () => {
      made = await $fetch<FolderEntry>(`${base}/folders`, { method: 'POST', body: { parentId: folderId.value, name } })
    })
    return made
  }

  const patch = (kind: EntryKind, id: string, body: { name: string } | { folderId: string | null }) =>
    write(() => $fetch(`${base}/entries/${kind}/${id}`, { method: 'PATCH', body }))

  const rename = (kind: EntryKind, id: string, name: string) => patch(kind, id, { name })
  const move = (kind: EntryKind, id: string, target: string | null) => patch(kind, id, { folderId: target })

  const remove = (kind: EntryKind, id: string) =>
    write(() => $fetch(`${base}/entries/${kind}/${id}`, { method: 'DELETE' }))

  // Tutte le cartelle del bando, in ordine come in un albero: una richiesta,
  // fatta solo quando serve ("Sposta in..."). La principale ha il nome del
  // bando, dal percorso dell'elenco aperto.
  async function folderTree(): Promise<TreeFolder[]> {
    const rows = await $fetch<TreeRow[]>(`${base}/tree`)
    return treeFolders(rows, listing.value?.path[0]?.name ?? 'Cartella del bando')
  }

  // Nella cartella aperta; oltre MAX_FILE_BYTES non partono. Le righe finite spariscono,
  // quelle andate male restano finché non si chiudono.
  async function upload(files: File[]) {
    const target = folderId.value
    const big = files.filter(f => f.size > MAX_FILE_BYTES)
    if (big.length) {
      notify('error', big.length === 1
        ? `${big[0]!.name} supera i ${MAX_FILE_MB} MB`
        : `${big.map(f => f.name).join(', ')} superano i ${MAX_FILE_MB} MB`)
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
          await $fetch(`${base}/upload`, { method: 'POST', body, query: target ? { folder: target } : {} })
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
    await load()
  }

  function dismissUploads() {
    uploads.value = uploads.value.filter(u => u.state !== 'error')
  }

  const contentUrl = (f: FileEntry, download = false) =>
    `${base}/content/${f.id}${download ? '?download=1' : ''}`

  return {
    folderId,
    listing,
    loading,
    uploads,
    load,
    openFolder,
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
