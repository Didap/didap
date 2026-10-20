<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'

// Anteprima dal vivo del PDF del preventivo: lo stesso file che riceve il
// cliente, disegnato con pdf.js. A ogni `version` nuova si riscarica e le
// pagine nuove sostituiscono le vecchie solo quando sono pronte: niente
// sfarfallio e la posizione di lettura resta dov'era.
const props = defineProps<{ src: string, version: number }>()

const pages = ref<HTMLDivElement | null>(null)
const failed = ref(false)
const loading = ref(true)
let run = 0
let renderedWidth = 0

async function render() {
  const current = ++run
  loading.value = true
  try {
    const pdfjs = await import('pdfjs-dist')
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default

    const data = await $fetch<ArrayBuffer>(props.src, { responseType: 'arrayBuffer', query: { v: props.version } })
    const task = pdfjs.getDocument({ data: new Uint8Array(data) })
    const canvases: HTMLCanvasElement[] = []
    try {
      const doc = await task.promise
      const host = pages.value
      if (!host || current !== run) return
      // Larghezza del contenitore, in pixel reali dello schermo
      const width = host.clientWidth
      renderedWidth = width
      const ratio = window.devicePixelRatio || 1
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n)
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: (width / base.width) * ratio })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.className = 'block w-full rounded-sm bg-white shadow-[0_1px_3px_rgb(0_0_0/0.12)]'
        canvas.setAttribute('aria-label', `Pagina ${n} di ${doc.numPages}`)
        await page.render({ canvas, viewport }).promise
        canvases.push(canvas)
        if (current !== run) return
      }
    }
    finally {
      await task.destroy()
    }
    if (current !== run) return
    pages.value?.replaceChildren(...canvases)
    failed.value = false
  }
  catch (err) {
    if (current === run) {
      console.error('[anteprima]', err)
      failed.value = true
    }
  }
  finally {
    if (current === run) loading.value = false
  }
}

onMounted(render)
watch(() => props.version, render)

// Cambia la larghezza del pannello: si ridisegna, senza rincorrere ogni pixel
let resizeTimer: ReturnType<typeof setTimeout> | undefined
useResizeObserver(pages, () => {
  if (!pages.value || Math.abs(pages.value.clientWidth - renderedWidth) < 2) return
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(render, 250)
})
</script>

<template>
  <div class="relative">
    <div
      ref="pages"
      class="flex flex-col gap-4"
    />
    <p
      v-if="failed"
      class="rounded-xl bg-white p-6 text-sm text-red"
    >
      Anteprima non disponibile: il PDF non si è generato. Riprova tra un momento.
    </p>
    <span
      v-if="loading"
      class="
        absolute top-2 right-2 rounded-full bg-ink/80 px-2.5 py-1 text-xs
        text-paper-light
      "
    >Aggiorno…</span>
  </div>
</template>
