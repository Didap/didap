<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import ImageDrop from '~/components/admin/ImageDrop.vue'
import AdminSwitch from '~/components/admin/AdminSwitch.vue'
import { PRODUCT_COLORS } from '#shared/product'
import type { MediaSlot } from '#shared/product'

// Uno slot immagine: file caricato oppure segnaposto colorato.
// L'anteprima ha le stesse proporzioni dello slot nella pagina.
// Trascinandolo su un altro slot i due si scambiano.
const model = defineModel<MediaSlot>({ required: true })
defineProps<{ title: string; aspect: string }>()
const emit = defineEmits<{ 'extra-files': [files: File[]] }>()

const swap = useSlotSwap(
  () => model.value,
  (v) => (model.value = v),
)

const COLORS: Record<(typeof PRODUCT_COLORS)[number], { label: string; bg: string }> = {
  ink: { label: 'Nero', bg: 'bg-ink' },
  red: { label: 'Rosso', bg: 'bg-red' },
  green: { label: 'Verde', bg: 'bg-green' },
  banana: { label: 'Giallo', bg: 'bg-banana' },
}

const src = computed({
  get: () => model.value.src ?? '',
  set: (v: string) => (model.value = { ...model.value, src: v || undefined }),
})
const color = computed({
  get: () => model.value.color ?? 'ink',
  set: (v: (typeof PRODUCT_COLORS)[number]) => (model.value = { ...model.value, color: v }),
})
const label = computed({
  get: () => model.value.label !== false,
  set: (v: boolean) => (model.value = { ...model.value, label: v }),
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-3">
    <span class="text-sm font-medium">{{ title }}</span>
    <ImageDrop
      v-model="src"
      :aspect="aspect"
      slot-drag
      :swap-target="swap.canDrop.value"
      @slot-drag-start="swap.start"
      @slot-drag-end="swap.end"
      @slot-drop="swap.drop"
      @extra-files="emit('extra-files', $event)"
    >
      <template #empty>
        <div
          class="absolute inset-0 flex items-center justify-center"
          :class="COLORS[color].bg"
        >
          <span
            v-if="label"
            class="text-label text-cream"
          >Immagine</span>
        </div>
      </template>
    </ImageDrop>

    <input
      v-if="model.src"
      :value="model.alt ?? ''"
      type="text"
      maxlength="300"
      placeholder="Descrivi l'immagine (per chi non la vede)"
      class="admin-input text-sm"
      @input="model = { ...model, alt: ($event.target as HTMLInputElement).value }"
    >
    <div
      v-else
      class="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      <RadioGroupRoot
        v-model="color"
        orientation="horizontal"
        class="flex gap-1.5"
        aria-label="Colore del segnaposto"
      >
        <RadioGroupItem
          v-for="(c, key) in COLORS"
          :key="key"
          :value="key"
          class="
            size-6 rounded-full ring-offset-2 ring-offset-white transition
            hover:ring-2 hover:ring-ink/30
            data-[state=checked]:ring-2 data-[state=checked]:ring-ink
          "
          :class="c.bg"
          :aria-label="c.label"
          :title="c.label"
        />
      </RadioGroupRoot>
      <AdminSwitch
        v-model="label"
        label="Scritta"
      />
    </div>
  </div>
</template>
