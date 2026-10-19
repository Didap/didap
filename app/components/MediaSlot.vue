<script setup lang="ts">
import { isVideoSrc } from '#shared/product'

// Media/Immagine del Figma: immagine a riempimento se c'è `src`,
// altrimenti riquadro colorato con la label "Immagine" (se `label`).
// Un `src` .mp4/.webm è un video in loop muto, fermo sul `poster`
// per chi ha chiesto meno movimento. Le proporzioni le decide chi
// lo usa, via class.
export interface MediaSlotData {
  src?: string
  poster?: string
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

// Il server può non scrivere l'attributo `muted`, e senza il browser
// blocca l'autoplay: dopo il mount si riparte da muti.
const video = useTemplateRef<HTMLVideoElement>('video')
onMounted(() => {
  const el = video.value
  if (!el) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.pause()
    return
  }
  el.muted = true
  el.play().catch(() => {})
})
</script>

<template>
  <video
    v-if="isVideoSrc(media?.src)"
    ref="video"
    :src="media!.src"
    :poster="media!.poster"
    :aria-label="media!.alt"
    :role="media!.alt ? 'img' : undefined"
    :aria-hidden="media!.alt ? undefined : 'true'"
    class="block object-cover"
    :class="bg"
    autoplay
    muted
    loop
    playsinline
    disablepictureinpicture
  />
  <img
    v-else-if="media?.src"
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
