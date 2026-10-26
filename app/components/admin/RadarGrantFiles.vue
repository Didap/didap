<script setup lang="ts">
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import AdminIcon from '~/components/admin/AdminIcon.vue'
import FileIcon from '~/components/admin/FileIcon.vue'
import { canPreview, fileKind, formatBytes, useGrantFiles, type FileKind, type TreeFolder } from '~/composables/useGrantFiles'
import { adminErrorText } from '~/utils/adminErrors'
import { formatDateTime } from '~/utils/format'
import { entryNameSchema, type EntryKind, type FileEntry, type FolderEntry } from '#shared/grant-files'
import type { EvaluatedGrant, FolderStart } from '#shared/radar'

// Scheda "File" di un bando, come una cartella del Finder: la cartella si
// crea una volta (col bando e i suoi PDF) e si riprova se il riempimento non
// è finito; poi si naviga, si carica, si rinomina, si sposta e si elimina.
const props = defineProps<{ grant: EvaluatedGrant, configured: boolean }>()
// La cartella si riempie in background: la pagina segna il bando e lo
// ricarica finché non è pronta
const emit = defineEmits<{ folder: [id: string, start: FolderStart] }>()

const { notify } = useAdminToast()
const starting = ref(false)

async function createGrantFolder() {
  const id = props.grant.id
  starting.value = true
  try {
    emit('folder', id, await $fetch<FolderStart>(`/api/admin/radar/grants/${id}/folder`, { method: 'POST' }))
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    starting.value = false
  }
}

const {
  folderId,
  listing,
  loading,
  uploads,
  load,
  openFolder: enterFolder,
  reset,
  createFolder,
  rename,
  move,
  remove,
  folderTree,
  upload,
  dismissUploads,
  contentUrl,
} = useGrantFiles(() => props.grant.id)

// L'elenco c'è quando la cartella esiste (anche mentre si riempie)
const showList = computed(() => props.configured && props.grant.hasFolder)

type Row = { kind: 'folder', entry: FolderEntry } | { kind: 'file', entry: FileEntry }

const rows = computed<Row[]>(() => listing.value
  ? [
      ...listing.value.folders.map(entry => ({ kind: 'folder' as const, entry })),
      ...listing.value.files.map(entry => ({ kind: 'file' as const, entry })),
    ]
  : [])
const rowKey = (r: Row) => `${r.kind}:${r.entry.id}`
const rowIcon = (r: Row): FileKind => r.kind === 'folder' ? 'folder' : fileKind(r.entry)
const rowMeta = (r: Row) => r.kind === 'folder'
  ? `${r.entry.fileCount} file · ${formatDateTime(r.entry.createdAt)}`
  : [formatBytes(r.entry.bytes), formatDateTime(r.entry.createdAt), r.entry.uploadedBy ?? 'radar']
      .filter(Boolean).join(' · ')

const path = computed(() => listing.value?.path ?? [])
const here = computed(() => path.value.at(-1)?.name ?? '')

// Apri: la cartella ci entra, PDF e immagini in anteprima, il resto si scarica
const preview = ref<FileEntry | null>(null)
const previewOpen = computed({
  get: () => !!preview.value,
  set: (v) => {
    if (!v) preview.value = null
  },
})

// Cambiando cartella una rinomina lasciata a metà si chiude
function openFolder(id: string | null) {
  renaming.value = null
  return enterFolder(id)
}

function openRow(r: Row) {
  if (renaming.value?.id === r.entry.id) return
  if (r.kind === 'folder') openFolder(r.entry.id)
  else if (canPreview(r.entry)) preview.value = r.entry
  else download(r.entry)
}

function download(f: FileEntry) {
  const a = document.createElement('a')
  a.href = contentUrl(f, true)
  a.download = f.name
  a.click()
}

// Nuova cartella: nasce con un nome provvisorio, già in modifica
async function newFolder() {
  const grant = props.grant.id
  const made = await createFolder('Nuova cartella')
  if (made && props.grant.id === grant) startRename({ kind: 'folder', entry: made })
}

// Carica: dal selettore o trascinando file dal computer
const picker = useTemplateRef<HTMLInputElement>('picker')

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  if (files.length) upload(files)
}

// Rinomina nella riga: Invio salva, Esc annulla, uscire dal campo salva
const renaming = ref<{ kind: EntryKind, id: string } | null>(null)
const renameText = ref('')
let renameInput: HTMLInputElement | null = null
const setRenameInput = (el: unknown) => {
  renameInput = el as HTMLInputElement | null
}

function focusRename() {
  nextTick(() => {
    if (!renameInput) return
    renameInput.focus()
    // Il nome senza l'estensione, come nel Finder
    const dot = renaming.value?.kind === 'file' ? renameInput.value.lastIndexOf('.') : -1
    renameInput.setSelectionRange(0, dot > 0 ? dot : renameInput.value.length)
  })
}

function startRename(r: Row) {
  renaming.value = { kind: r.kind, id: r.entry.id }
  renameText.value = r.entry.name
  focusRename()
}

function cancelRename() {
  renaming.value = null
}

async function saveRename() {
  const target = renaming.value
  if (!target) return
  const row = rows.value.find(r => r.kind === target.kind && r.entry.id === target.id)
  const parsed = entryNameSchema.safeParse(renameText.value)
  if (!parsed.success) {
    notify('error', parsed.error.issues[0]?.message ?? 'Nome non valido')
    return
  }
  renaming.value = null
  if (!row || parsed.data === row.entry.name) return
  // Subito il nome nuovo; se il server dice no, l'elenco ricaricato lo rimette
  row.entry.name = parsed.data
  await rename(target.kind, target.id, parsed.data)
}

// Il menu ridà il fuoco al suo bottone: non se si sta rinominando o se si è
// aperta una finestra
function onMenuCloseFocus(e: Event) {
  if (renaming.value) {
    e.preventDefault()
    focusRename()
  }
  else if (confirmRow.value || preview.value || moving.value) {
    e.preventDefault()
  }
}

// Sposta in...: una finestra con le cartelle del bando, chieste quando si
// apre (più comoda di un sottomenu nella colonna stretta)
const moving = ref<Row | null>(null)
const movingOpen = computed({
  get: () => !!moving.value,
  set: (v) => {
    if (!v) moving.value = null
  },
})
const tree = ref<TreeFolder[] | null>(null)
let treeSeq = 0

async function openMove(r: Row) {
  const seq = ++treeSeq
  moving.value = r
  tree.value = null
  try {
    const list = await folderTree()
    // Per id: moving.value è il proxy reattivo, r l'oggetto della riga
    const same = moving.value?.kind === r.kind && moving.value.entry.id === r.entry.id
    if (seq === treeSeq && same) tree.value = list
  }
  catch (err) {
    if (seq !== treeSeq) return
    notify('error', adminErrorText(err))
    moving.value = null
  }
}

function pickTarget(t: TreeFolder) {
  const r = moving.value
  if (!r || !canMoveTo(r, t)) return
  moving.value = null
  moveRow(r.kind, r.entry.id, t.id, t.name)
}

// Non dove sta già, e una cartella non dentro sé stessa o le sue sottocartelle
function canMoveTo(r: Row, t: TreeFolder): boolean {
  if (t.id === folderId.value) return false
  if (r.kind === 'file' || !tree.value) return true
  const list = tree.value
  const at = list.findIndex(f => f.id === r.entry.id)
  if (at < 0) return true
  const end = list.findIndex((f, i) => i > at && f.depth <= list[at]!.depth)
  const inside = list.slice(at, end < 0 ? list.length : end)
  return !inside.some(f => f.id === t.id)
}

async function moveRow(kind: EntryKind, id: string, target: string | null, name: string) {
  if (await move(kind, id, target)) notify('ok', `Spostato in ${name}`)
}

// Trascinare: una riga su una cartella o su un elemento del percorso la
// sposta; file dal computer sulla scheda li caricano qui. Il tipo dei dati
// distingue le due cose ('Files' solo per quelli dal computer).
const ENTRY_DRAG = 'application/x-didap-entry'
const dragged = ref<{ kind: EntryKind, id: string } | null>(null)
const dropTarget = ref<string | null>(null)

function onRowDragStart(e: DragEvent, r: Row) {
  if (!e.dataTransfer || renaming.value?.id === r.entry.id) return
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData(ENTRY_DRAG, r.entry.id)
  dragged.value = { kind: r.kind, id: r.entry.id }
}

function onRowDragEnd() {
  dragged.value = null
  dropTarget.value = null
}

function canDrop(target: string | null): boolean {
  const d = dragged.value
  return !!d && target !== folderId.value && !(d.kind === 'folder' && d.id === target)
}

function onTargetOver(e: DragEvent, target: string | null, key: string) {
  if (!e.dataTransfer?.types.includes(ENTRY_DRAG) || !canDrop(target)) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dropTarget.value = key
}

function onTargetLeave(key: string) {
  if (dropTarget.value === key) dropTarget.value = null
}

function onTargetDrop(e: DragEvent, target: string | null, name: string) {
  const d = dragged.value
  if (!d || !canDrop(target)) return
  e.preventDefault()
  dragged.value = null
  dropTarget.value = null
  moveRow(d.kind, d.id, target, name)
}

const fileOver = ref(false)
let fileDepth = 0
const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')

function onZoneEnter(e: DragEvent) {
  if (!hasFiles(e)) return
  fileDepth++
  fileOver.value = true
}

function onZoneLeave(e: DragEvent) {
  if (!hasFiles(e)) return
  fileDepth = Math.max(0, fileDepth - 1)
  if (!fileDepth) fileOver.value = false
}

function onZoneOver(e: DragEvent) {
  if (!hasFiles(e)) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
}

function onZoneDrop(e: DragEvent) {
  if (!hasFiles(e)) return
  e.preventDefault()
  fileDepth = 0
  fileOver.value = false
  // Le cartelle trascinate dal computer non si caricano
  const items = [...(e.dataTransfer?.items ?? [])].filter(i => i.kind === 'file')
  const dirs = items.filter(i => i.webkitGetAsEntry()?.isDirectory).length
  const files = items
    .filter(i => !i.webkitGetAsEntry()?.isDirectory)
    .map(i => i.getAsFile())
    .filter((f): f is File => !!f)
  if (dirs) notify('error', 'Le cartelle non si caricano: trascina i file')
  if (files.length) upload(files)
}

// Elimina, dopo la conferma
const confirmRow = ref<Row | null>(null)
const confirmOpen = computed({
  get: () => !!confirmRow.value,
  set: (v) => {
    if (!v) confirmRow.value = null
  },
})
const deleting = ref(false)
const confirmTitle = computed(() => {
  const r = confirmRow.value
  if (!r) return ''
  if (r.kind === 'file') return 'Elimina il file?'
  return r.entry.fileCount ? `Elimina la cartella e i suoi ${r.entry.fileCount} file?` : 'Elimina la cartella?'
})

async function confirmDelete() {
  const r = confirmRow.value
  if (!r) return
  deleting.value = true
  try {
    if (await remove(r.kind, r.entry.id)) notify('ok', r.kind === 'folder' ? 'Cartella eliminata' : 'File eliminato')
  }
  finally {
    deleting.value = false
    confirmRow.value = null
  }
}

onMounted(() => {
  if (showList.value) load()
})
// Un altro bando: si riparte dalla principale, senza finestre aperte
watch(() => props.grant.id, () => {
  reset()
  renaming.value = null
  preview.value = null
  confirmRow.value = null
  moving.value = null
})
// Altro bando, cartella appena creata o riempimento finito: elenco da rifare
// (più sorgenti: il bando ricaricato dalla pagina ogni pochi secondi, se
// non cambia niente di questo, non rifà l'elenco)
watch([() => props.grant.id, showList, () => props.grant.folderFilling], () => {
  if (showList.value) load()
})
// La riga in rinomina non c'è più nell'elenco (eliminata, spostata, altra
// cartella): il campo si chiude
watch(rows, (list) => {
  const r = renaming.value
  if (r && !list.some(x => x.kind === r.kind && x.entry.id === r.id)) renaming.value = null
})

const UPLOAD_STATE = { waiting: 'In attesa', uploading: 'Carico...', done: 'Caricato' } as const

const itemClass = `
  flex cursor-default items-center gap-2 rounded-lg px-3 py-1.5 outline-none
  select-none
  data-disabled:opacity-40
  data-highlighted:bg-ink/6
`
</script>

<template>
  <div
    class="relative flex flex-col gap-3 text-sm"
    @dragenter="showList && onZoneEnter($event)"
    @dragleave="showList && onZoneLeave($event)"
    @dragover="showList && onZoneOver($event)"
    @drop="showList && onZoneDrop($event)"
  >
    <p
      v-if="!configured"
      class="text-red"
    >
      Cloudinary non configurato
    </p>

    <template v-else>
      <p
        v-if="!grant.hasFolder"
        class="opacity-70"
      >
        Una cartella per il bando: dentro il bando, i suoi PDF e i file che aggiungete.
      </p>
      <button
        v-if="!grant.folderFilled && !grant.folderFilling"
        type="button"
        class="
          inline-flex w-fit items-center rounded-full bg-ink px-4 py-2
          font-medium text-paper-light
          hover:bg-green
          disabled:opacity-40
        "
        :disabled="starting"
        title="Crea la cartella del bando, col bando e i suoi PDF"
        @click="createGrantFolder"
      >
        {{ grant.hasFolder ? 'Riprova a prendere i file dal bando' : 'Crea cartella del bando' }}
      </button>
      <button
        v-else-if="grant.folderFilling"
        type="button"
        class="
          inline-flex w-fit items-center rounded-full border border-ink/20 px-4
          py-2
        "
        disabled
      >
        Preparo la cartella...
      </button>
      <!-- La nota dell'ultimo riempimento: in rosso se è finito con un errore -->
      <p
        v-if="grant.folderNote && !showList"
        class="text-xs"
        :class="grant.folderFailed ? 'text-red' : 'opacity-60'"
      >
        {{ grant.folderNote }}
      </p>
    </template>

    <template v-if="showList">
      <!-- Barra: percorso, nuova cartella, carica -->
      <div class="flex flex-col gap-2">
        <nav aria-label="Percorso nella cartella">
          <ol class="flex flex-wrap items-center gap-x-1 gap-y-0.5">
            <li
              v-for="(c, i) in path"
              :key="c.id ?? 'root'"
              class="flex min-w-0 items-center gap-1"
            >
              <span
                v-if="i > 0"
                class="opacity-40"
                aria-hidden="true"
              >/</span>
              <button
                type="button"
                class="
                  max-w-48 truncate rounded-md px-1.5 py-0.5
                  hover:bg-ink/6
                "
                :class="[
                  i === path.length - 1 ? 'font-medium' : 'opacity-70',
                  dropTarget === `crumb:${c.id}` ? `
                    bg-green/15 ring-1 ring-green
                  ` : '',
                ]"
                :title="c.name"
                :aria-current="i === path.length - 1 ? 'page' : undefined"
                @click="openFolder(c.id)"
                @dragover="onTargetOver($event, c.id, `crumb:${c.id}`)"
                @dragleave="onTargetLeave(`crumb:${c.id}`)"
                @drop="onTargetDrop($event, c.id, c.name)"
              >
                {{ c.name }}
              </button>
            </li>
          </ol>
        </nav>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="
              inline-flex items-center rounded-full border border-ink/20 px-3
              py-1.5
              hover:border-ink
            "
            @click="newFolder"
          >
            Nuova cartella
          </button>
          <button
            type="button"
            class="
              inline-flex items-center rounded-full bg-ink px-3 py-1.5
              font-medium text-paper-light
              hover:bg-green
            "
            @click="picker?.click()"
          >
            Carica
          </button>
          <input
            ref="picker"
            type="file"
            multiple
            class="hidden"
            @change="onPick"
          >
        </div>
        <p
          v-if="grant.folderNote"
          class="text-xs"
          :class="grant.folderFailed ? 'text-red' : 'opacity-60'"
        >
          {{ grant.folderNote }}
        </p>
      </div>

      <!-- Caricamenti in corso: una riga per file -->
      <ul
        v-if="uploads.length"
        class="flex flex-col gap-1 rounded-xl bg-ink/4 p-2"
        aria-live="polite"
      >
        <li
          v-for="u in uploads"
          :key="u.key"
          class="flex items-center gap-2 text-xs"
        >
          <span class="min-w-0 flex-1 truncate">{{ u.name }}</span>
          <span
            class="shrink-0"
            :class="u.state === 'error' ? 'text-red' : 'opacity-60'"
          >
            {{ u.state === 'error' ? u.error : UPLOAD_STATE[u.state] }}
          </span>
        </li>
        <li
          v-if="uploads.some(u => u.state === 'error')"
          class="flex justify-end"
        >
          <button
            type="button"
            class="
              rounded-full px-2 py-0.5 text-xs
              hover:bg-ink/6
            "
            @click="dismissUploads"
          >
            Chiudi
          </button>
        </li>
      </ul>

      <!-- Elenco della cartella aperta -->
      <div
        class="relative min-h-32 rounded-xl"
        :class="fileOver ? 'bg-green/5 ring-2 ring-green' : ''"
      >
        <p
          v-if="!listing && loading"
          class="p-2 opacity-60"
        >
          Carico la cartella...
        </p>
        <p
          v-else-if="listing && !rows.length"
          class="p-2 opacity-60"
        >
          Cartella vuota. Trascina qui i file o usa Carica.
        </p>
        <ul
          v-else
          class="flex flex-col"
        >
          <li
            v-for="r in rows"
            :key="rowKey(r)"
            tabindex="0"
            class="
              flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none
              hover:bg-ink/4
              focus-visible:ring-2 focus-visible:ring-green
            "
            :class="[
              dropTarget === rowKey(r) ? 'bg-green/15 ring-1 ring-green' : '',
              dragged?.id === r.entry.id ? 'opacity-50' : '',
            ]"
            :draggable="renaming?.id !== r.entry.id"
            :aria-label="`${r.kind === 'folder' ? 'Cartella' : 'File'} ${r.entry.name}`"
            @dblclick="openRow(r)"
            @keydown.enter.self="openRow(r)"
            @dragstart="onRowDragStart($event, r)"
            @dragend="onRowDragEnd"
            @dragover="r.kind === 'folder' && onTargetOver($event, r.entry.id, rowKey(r))"
            @dragleave="onTargetLeave(rowKey(r))"
            @drop="r.kind === 'folder' && onTargetDrop($event, r.entry.id, r.entry.name)"
          >
            <FileIcon :kind="rowIcon(r)" />
            <div class="flex min-w-0 flex-1 flex-col">
              <input
                v-if="renaming?.id === r.entry.id"
                :ref="setRenameInput"
                v-model="renameText"
                type="text"
                class="
                  w-full rounded-md border border-ink/30 bg-white px-1.5 py-0.5
                "
                aria-label="Nuovo nome"
                @keydown.enter.prevent="saveRename"
                @keydown.esc.stop.prevent="cancelRename"
                @blur="saveRename"
              >
              <span
                v-else
                class="truncate"
                :title="r.entry.name"
              >{{ r.entry.name }}</span>
              <span class="truncate text-xs opacity-60">{{ rowMeta(r) }}</span>
            </div>

            <DropdownMenuRoot :modal="false">
              <DropdownMenuTrigger
                class="
                  shrink-0 rounded-full p-1 opacity-60
                  hover:bg-ink/8 hover:opacity-100
                  data-[state=open]:bg-ink/8 data-[state=open]:opacity-100
                "
                :aria-label="`Azioni per ${r.entry.name}`"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <circle
                    cx="3.5"
                    cy="8"
                    r="1.3"
                    fill="currentColor"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="1.3"
                    fill="currentColor"
                  />
                  <circle
                    cx="12.5"
                    cy="8"
                    r="1.3"
                    fill="currentColor"
                  />
                </svg>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent
                  align="end"
                  :side-offset="4"
                  class="
                    z-50 min-w-44 rounded-xl border border-ink/10 bg-white p-1
                    text-sm shadow-lg
                  "
                  @close-auto-focus="onMenuCloseFocus"
                >
                  <DropdownMenuItem
                    :class="itemClass"
                    @select="openRow(r)"
                  >
                    Apri
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    v-if="r.kind === 'file'"
                    :class="itemClass"
                    @select="download(r.entry)"
                  >
                    Scarica
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    :class="itemClass"
                    @select="startRename(r)"
                  >
                    Rinomina
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    :class="itemClass"
                    @select="openMove(r)"
                  >
                    Sposta in...
                  </DropdownMenuItem>
                  <DropdownMenuSeparator class="my-1 h-px bg-ink/10" />
                  <DropdownMenuItem
                    :class="[itemClass, 'text-red']"
                    @select="confirmRow = r"
                  >
                    Elimina
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenuRoot>
          </li>
        </ul>

        <!-- Riquadro mentre si trascinano file dal computer -->
        <div
          v-if="fileOver"
          class="
            pointer-events-none absolute inset-0 flex items-center
            justify-center rounded-xl bg-paper/80 p-4 text-center font-medium
            text-green
          "
        >
          Rilascia per caricare in {{ here }}
        </div>
      </div>
    </template>

    <AlertDialogRoot v-model:open="confirmOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-ink/40" />
        <AlertDialogContent
          class="
            fixed top-1/2 left-1/2 z-50 w-[calc(100%-3rem)] max-w-md
            -translate-1/2 rounded-2xl bg-white p-6
          "
        >
          <AlertDialogTitle class="text-xl font-bold">
            {{ confirmTitle }}
          </AlertDialogTitle>
          <AlertDialogDescription class="mt-2 wrap-break-word opacity-70">
            "{{ confirmRow?.entry.name }}" non si potrà recuperare.
          </AlertDialogDescription>
          <div class="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialogCancel
              class="
                rounded-full px-4 py-2 text-sm
                hover:bg-ink/5
              "
            >
              Annulla
            </AlertDialogCancel>
            <button
              type="button"
              class="
                rounded-full bg-red px-4 py-2 text-sm font-medium text-white
                disabled:opacity-50
              "
              :disabled="deleting"
              @click="confirmDelete"
            >
              Sì, elimina
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <!-- Sposta in...: la principale e tutte le cartelle, rientrate per livello -->
    <DialogRoot v-model:open="movingOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-ink/40" />
        <DialogContent
          class="
            fixed top-1/2 left-1/2 z-50 flex max-h-[80vh] w-[calc(100%-3rem)]
            max-w-sm -translate-1/2 flex-col rounded-2xl bg-white p-4
          "
        >
          <DialogTitle class="truncate px-2 text-lg font-bold">
            Sposta "{{ moving?.entry.name }}"
          </DialogTitle>
          <DialogDescription class="px-2 text-sm opacity-60">
            Scegli la cartella
          </DialogDescription>
          <p
            v-if="!tree"
            class="p-2 text-sm opacity-60"
          >
            Carico le cartelle...
          </p>
          <ul
            v-else
            class="mt-3 flex min-h-0 flex-col overflow-y-auto text-sm"
          >
            <li
              v-for="t in tree"
              :key="t.id ?? 'root'"
            >
              <button
                type="button"
                class="
                  flex w-full items-center gap-2 rounded-lg py-1.5 pr-2
                  text-left
                  hover:bg-ink/6
                  disabled:opacity-40
                  disabled:hover:bg-transparent
                "
                :style="{ paddingLeft: `${0.5 + t.depth * 1}rem` }"
                :disabled="!moving || !canMoveTo(moving, t)"
                @click="pickTarget(t)"
              >
                <FileIcon kind="folder" />
                <span class="truncate">{{ t.name }}</span>
              </button>
            </li>
          </ul>
          <div class="mt-3 flex justify-end">
            <DialogClose
              class="
                rounded-full px-4 py-2 text-sm
                hover:bg-ink/5
              "
            >
              Annulla
            </DialogClose>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Anteprima: PDF e immagini, dall'API content -->
    <DialogRoot v-model:open="previewOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-ink/60" />
        <DialogContent
          class="
            fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl
            bg-white
            md:inset-10
          "
        >
          <header class="
            flex items-center gap-3 border-b border-ink/10 px-4 py-3
          ">
            <DialogTitle class="min-w-0 flex-1 truncate font-medium">
              {{ preview?.name }}
            </DialogTitle>
            <DialogDescription class="sr-only">
              Anteprima del file
            </DialogDescription>
            <a
              v-if="preview"
              :href="contentUrl(preview, true)"
              :download="preview.name"
              class="
                rounded-full border border-ink/20 px-3 py-1.5 text-sm
                hover:border-ink
              "
            >
              Scarica
            </a>
            <DialogClose
              class="
                rounded-full p-1.5
                hover:bg-ink/6
              "
              aria-label="Chiudi l'anteprima"
            >
              <AdminIcon name="close" />
            </DialogClose>
          </header>
          <template v-if="preview">
            <iframe
              v-if="preview.mime === 'application/pdf'"
              :src="contentUrl(preview)"
              :title="preview.name"
              class="min-h-0 w-full flex-1"
            />
            <div
              v-else
              class="
                flex min-h-0 flex-1 items-center justify-center bg-ink/4 p-4
              "
            >
              <img
                :src="contentUrl(preview)"
                :alt="preview.name"
                class="max-h-full max-w-full object-contain"
              >
            </div>
          </template>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
