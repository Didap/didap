<script setup lang="ts">
import { isVideoSrc } from '#shared/product'

// Media/Immagine del Figma: immagine a riempimento se c'è `src`,
// altrimenti riquadro colorato con la label "Immagine" (se `label`).
// Un `src` .mp4/.webm è un video in loop muto, fermo sul `poster`
// per chi ha chiesto meno movimento. Le proporzioni le decide chi
// lo usa, via class. Con `srcMobile` sotto il breakpoint sm parte la
// versione da telefono, con il suo `posterMobile`.
export interface MediaSlotData {
  src?: string
  poster?: string
  srcMobile?: string
  posterMobile?: string
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

const MOBILE = '(max-width: 639px)'

// Il server non sa quanto è largo lo schermo: il poster da telefono
// arriva dopo il mount, il video lo sceglie già il browser dai <source>
const poster = ref(props.media?.poster)

// Il video non si scarica finché non sta per entrare nello schermo
// (preload none, fino ad allora si vede il poster) e si ferma quando
// esce: una pagina con molti slot non li scarica tutti insieme.
// Il server può non scrivere l'attributo `muted`, e senza il browser
// blocca l'autoplay: prima di partire si rimette muto.
const video = useTemplateRef<HTMLVideoElement>('video')
let observer: IntersectionObserver | null = null
onMounted(() => {
  const el = video.value
  if (!el) return
  if (props.media?.posterMobile && window.matchMedia(MOBILE).matches) {
    poster.value = props.media.posterMobile
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.muted = true
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) el.play().catch(() => {})
      else el.pause()
    },
    { rootMargin: '200px 0px' },
  )
  observer.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <video
    v-if="isVideoSrc(media?.src)"
    ref="video"
    :src="media!.srcMobile ? undefined : media!.src"
    :poster="poster"
    :aria-label="media!.alt"
    :role="media!.alt ? 'img' : undefined"
    :aria-hidden="media!.alt ? undefined : 'true'"
    class="block object-cover"
    :class="bg"
    preload="none"
    muted
    loop
    playsinline
    disablepictureinpicture
  >
    <template v-if="media!.srcMobile">
      <source
        :src="media!.srcMobile"
        :media="MOBILE"
      >
      <source
        :src="media!.src"
      >
    </template>
  </video>
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
