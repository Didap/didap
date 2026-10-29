<script setup lang="ts">
import type { AnimationItem } from 'lottie-web'

// La splash della prima visita: il Lottie in public/splash (1920x1080,
// 6 s, fondo trasparente). Didi entra dall'alto, cade dentro la D e
// forma il logotipo. Lo script in testa alla pagina decide prima del
// primo disegno se mostrarla (classe `splash` su <html>): una volta
// sola per browser, mai con meno movimento.

const { t } = useI18n()

const KEY = 'didap-splash'
useHead({
  script: [{
    key: 'didap-splash',
    tagPosition: 'head',
    innerHTML: `try{if(!localStorage.getItem('${KEY}')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('splash')}catch(e){}`,
  }],
})

const player = ref<HTMLElement>()
const visible = ref(true)
const leaving = ref(false)
let anim: AnimationItem | null = null
let finishing = false

function finish() {
  if (finishing) return
  finishing = true
  anim?.pause()
  try {
    localStorage.setItem(KEY, '1')
  }
  catch {}
  leaving.value = true
  setTimeout(() => {
    document.documentElement.classList.remove('splash')
    visible.value = false
  }, 450)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') finish()
}

onMounted(async () => {
  if (!document.documentElement.classList.contains('splash')) {
    visible.value = false
    return
  }
  window.addEventListener('keydown', onKey)
  // La build solo SVG, senza espressioni
  const { default: lottie } = await import('lottie-web/build/player/lottie_light')
  if (finishing || !player.value) return

  anim = lottie.loadAnimation({
    container: player.value,
    renderer: 'svg',
    loop: false,
    autoplay: true,
    path: '/splash/didap-intro.json',
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
  })
  // Il logo resta fermo un attimo prima che la pagina compaia
  anim.addEventListener('complete', () => setTimeout(finish, 600))
  anim.addEventListener('data_failed', finish)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  anim?.destroy()
})
</script>

<template>
  <div
    v-if="visible"
    class="splash-screen fixed inset-0 z-100 overflow-hidden bg-paper"
    :class="leaving ? 'opacity-0' : ''"
  >
    <div
      ref="player"
      class="size-full"
      aria-hidden="true"
    />
    <button
      type="button"
      class="
        absolute right-5 bottom-5 rounded-full px-4 py-2 text-label opacity-60
        transition-opacity
        hover:opacity-100
        focus-visible:outline-2 focus-visible:outline-ink
        md:right-10 md:bottom-10
      "
      @click="finish"
    >
      {{ t('splash.skip') }}
    </button>
  </div>
</template>

<style>
/* Senza la classe (già vista, meno movimento, niente JavaScript) non c'è */
.splash-screen {
  display: none;
  transition: opacity 0.45s ease;
}

html.splash .splash-screen {
  display: block;
}

html.splash body {
  overflow: hidden;
}
</style>
