<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { SLOT_DRAG_TYPE } from '~/composables/useSlotSwap'

// Area immagine: si carica cliccando, trascinando file dal computer o
// incollando (Ctrl+V) mentre il puntatore è sopra. Con `slotDrag` si può
// anche trascinare su un altro slot per scambiarli.
const model = defineModel<string>({ default: '' })
const props = defineProps<{
  aspect?: string
  fit?: 'cover' | 'contain'
  emptyLabel?: string
  slotDrag?: boolean
  swapTarget?: boolean
}>()
const emit = defineEmits<{
  'extra-files': [files: File[]]
  'slot-drag-start': []
  'slot-drag-end': []
  'slot-drop': []
}>()

const { upload, uploading, error, accept } = useAssetUpload()
const input = useTemplateRef<HTMLInputElement>('input')
const box = useTemplateRef<HTMLDivElement>('box')
const over = ref<'file' | 'slot' | null>(null)
const hovered = ref(false)
const draggingSelf = ref(false)

async function take(file: File | undefined) {
  if (!file) return
  const url = await upload(file)
  if (url) model.value = url
}

const isImage = (f: File) => f.type.startsWith('image/')

function onDragOver(e: DragEvent) {
  const types = e.dataTransfer?.types ?? []
  if (types.includes('Files')) over.value = 'file'
  else if (types.includes(SLOT_DRAG_TYPE) && props.swapTarget) over.value = 'slot'
  else return
  e.preventDefault()
}

function onDrop(e: DragEvent) {
  const kind = over.value
  over.value = null
  if (kind === 'slot') {
    e.preventDefault()
    emit('slot-drop')
    return
  }
  const files = [...(e.dataTransfer?.files ?? [])].filter(isImage)
  if (!files.length) return
  e.preventDefault()
  take(files[0])
  if (files.length > 1) emit('extra-files', files.slice(1))
}

function onPick(e: Event) {
  const files = [...((e.target as HTMLInputElement).files ?? [])]
  take(files[0])
  if (files.length > 1) emit('extra-files', files.slice(1))
  if (input.value) input.value.value = ''
}

function onDragStart(e: DragEvent) {
  if (!props.slotDrag || !e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData(SLOT_DRAG_TYPE, '1')
  draggingSelf.value = true
  emit('slot-drag-start')
}
function onDragEnd() {
  draggingSelf.value = false
  emit('slot-drag-end')
}

// Incolla un'immagine dagli appunti nello slot sotto il puntatore
useEventListener('paste', (e: ClipboardEvent) => {
  const focused = box.value?.contains(document.activeElement)
  if (!hovered.value && !focused) return
  const file = [...(e.clipboardData?.files ?? [])].find(isImage)
  if (!file) return
  e.preventDefault()
  take(file)
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      ref="box"
      class="
        group relative flex w-full items-center justify-center overflow-hidden
        rounded-xl border-2 transition
      "
      :class="[
        props.aspect ?? 'aspect-video',
        over === 'file' ? 'border-solid border-green ring-4 ring-green/20'
        : over === 'slot' ? 'border-solid border-banana ring-4 ring-banana/30'
          : swapTarget ? 'border-dashed border-banana'
            : 'border-dashed border-ink/15',
        draggingSelf ? 'opacity-40' : '',
        slotDrag ? `
          cursor-grab
          active:cursor-grabbing
        ` : '',
      ]"
      :draggable="slotDrag && !uploading"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      @dragenter="onDragOver"
      @dragover="onDragOver"
      @dragleave="over = null"
      @drop="onDrop"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
    >
      <img
        v-if="model"
        :src="model"
        alt=""
        draggable="false"
        class="pointer-events-none absolute inset-0 size-full"
        :class="props.fit === 'contain' ? 'object-contain p-3' : 'object-cover'"
      >
      <slot
        v-else
        name="empty"
      />

      <!-- Azioni -->
      <div
        class="
          absolute inset-0 flex flex-col items-center justify-center gap-2
          bg-ink/0 opacity-0 transition
          group-focus-within:bg-ink/55 group-focus-within:opacity-100
          group-hover:bg-ink/55 group-hover:opacity-100
        "
        :class="{ 'bg-ink/55 opacity-100': uploading || over }"
      >
        <span
          v-if="uploading"
          class="rounded-full bg-white px-4 py-2 text-sm font-medium"
        >Carico…</span>
        <span
          v-else-if="over === 'file'"
          class="rounded-full bg-white px-4 py-2 text-sm font-medium"
        >Rilascia per caricare</span>
        <span
          v-else-if="over === 'slot'"
          class="rounded-full bg-banana px-4 py-2 text-sm font-medium"
        >Rilascia per scambiare</span>
        <template v-else>
          <div class="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              class="
                rounded-full bg-white px-4 py-2 text-sm font-medium
                hover:bg-cream
              "
              @click="input?.click()"
            >
              {{ model ? 'Sostituisci' : (props.emptyLabel ?? 'Carica immagine') }}
            </button>
            <button
              v-if="model"
              type="button"
              class="
                rounded-full bg-white px-4 py-2 text-sm font-medium
                hover:bg-cream
              "
              @click="model = ''"
            >
              Rimuovi
            </button>
          </div>
          <span class="
            hidden text-xs text-white/80
            sm:block
          ">
            oppure trascina un file o incolla con Ctrl+V{{ slotDrag ? ' · trascina per scambiare' : '' }}
          </span>
        </template>
      </div>
      <input
        ref="input"
        type="file"
        :accept="accept"
        multiple
        class="sr-only"
        tabindex="-1"
        @change="onPick"
      >
    </div>
    <p
      v-if="error"
      class="text-sm text-red"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
