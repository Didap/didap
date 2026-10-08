<script setup lang="ts">
// Media/Immagine del Figma: immagine a riempimento se c'è `src`,
// altrimenti riquadro colorato con la label "Immagine" (se `label`).
// Le proporzioni le decide chi lo usa, via class.
export interface MediaSlotData {
  src?: string
  alt?: string
  color?: 'ink' | 'red' | 'green' | 'banana'
  label?: boolean
}

const props = defineProps<{
  media?: MediaSlotData
}>()

const { t } = useI18n()

const bg = computed(
  () =>
    ({
      ink: 'bg-ink',
      red: 'bg-red',
      green: 'bg-green',
      banana: 'bg-banana',
    })[props.media?.color ?? 'ink'],
)
</script>

<template>
  <img
    v-if="media?.src"
    :src="media.src"
    :alt="media.alt ?? ''"
    class="block object-cover"
  >
  <div
    v-else
    class="flex items-center justify-center"
    :class="bg"
    aria-hidden="true"
  >
    <span
      v-if="media?.label !== false"
      class="text-label text-cream"
    >
      {{ t('product.placeholder_image') }}
    </span>
  </div>
</template>
