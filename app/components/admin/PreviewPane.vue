<script setup lang="ts">
import { useDebounceFn, useElementSize } from '@vueuse/core'
import type { ProductOverride } from '#shared/product'

// Anteprima live: la scheda prodotto vera in un iframe (?preview=1),
// alla quale si manda la bozza non salvata a ogni modifica.
const props = defineProps<{
  slug: string
  locale: 'it' | 'en'
  draft: ProductOverride | null
}>()

const emit = defineEmits<{ select: [section: string] }>()

const device = ref<'desktop' | 'mobile'>('desktop')
const WIDTH = { desktop: 1440, mobile: 390 }

const frame = useTemplateRef<HTMLIFrameElement>('frame')
const box = useTemplateRef<HTMLDivElement>('box')
const { width: boxWidth, height: boxHeight } = useElementSize(box)

const scale = computed(() =>
  boxWidth.value ? Math.min(1, boxWidth.value / WIDTH[device.value]) : 1,
)
const src = computed(
  () => `${props.locale === 'it' ? '' : '/en'}/work/${props.slug}?preview=1`,
)
const pageUrl = computed(() => src.value.replace('?preview=1', ''))

const post = (msg: unknown) =>
  frame.value?.contentWindow?.postMessage(msg, window.location.origin)

const sendDraft = () => {
  if (!props.draft) return
  post({
    type: 'didap:preview',
    slug: props.slug,
    locale: props.locale,
    data: JSON.parse(JSON.stringify(props.draft)),
  })
}
const sendDraftSoon = useDebounceFn(sendDraft, 120)

watch(() => props.draft, sendDraftSoon, { deep: true })

function onMessage(e: MessageEvent) {
  if (e.origin !== window.location.origin) return
  if (e.source !== frame.value?.contentWindow) return
  if (e.data?.type === 'didap:preview-ready') sendDraft()
  else if (e.data?.type === 'didap:select' && typeof e.data.section === 'string') {
    emit('select', e.data.section)
  }
}
onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => window.removeEventListener('message', onMessage))

function scrollTo(section: string) {
  post({ type: 'didap:scroll', section })
}

function reload() {
  frame.value?.contentWindow?.location.reload()
}

defineExpose({ scrollTo, reload })
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <div
        class="flex rounded-full bg-ink/5 p-1"
        role="tablist"
        aria-label="Dispositivo"
      >
        <button
          v-for="d in (['desktop', 'mobile'] as const)"
          :key="d"
          type="button"
          role="tab"
          :aria-selected="device === d"
          class="rounded-full px-3 py-1 text-sm transition"
          :class="device === d ? 'bg-white font-medium shadow-sm' : `
            opacity-60
            hover:opacity-100
          `"
          @click="device = d"
        >
          {{ d === 'desktop' ? 'Desktop' : 'Mobile' }}
        </button>
      </div>
      <a
        :href="pageUrl"
        target="_blank"
        class="
          text-sm underline opacity-60
          hover:opacity-100
        "
      >Apri in una nuova scheda ↗</a>
    </div>
    <p class="-mt-1 text-xs opacity-50">
      Clicca una parte della pagina per modificarla.
    </p>

    <div
      ref="box"
      class="
        relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-ink/10
        bg-white
      "
    >
      <iframe
        ref="frame"
        :key="src"
        :src="src"
        title="Anteprima della pagina prodotto"
        class="absolute top-0 border-0 bg-cream"
        :style="{
          width: `${WIDTH[device]}px`,
          height: `${boxHeight / scale}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          left: device === 'mobile' ? `${Math.max(0, (boxWidth - WIDTH.mobile * scale) / 2)}px` : '0',
        }"
      />
    </div>
  </div>
</template>
