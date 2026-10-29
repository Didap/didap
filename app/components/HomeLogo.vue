<script setup lang="ts">
import type { AnimationItem } from 'lottie-web'

// Il logo dell'apertura della home: a ogni visita Didi ci cade dentro,
// col Lottie della splash (public/splash, 1920x1080). Lì il logo finito
// sta in 265.05, 364.76 e misura 1396.75 x 400: il player è steso intorno
// all'immagine ferma in modo che quel riquadro coincida con lei, e a
// fine corsa torna l'immagine. Fuori dal riquadro non si taglia nulla:
// Didi cade dall'alto dello schermo. Lo script in testa nasconde
// l'immagine prima del primo disegno; con meno movimento, o se il Lottie
// non arriva in tempo, resta lei.

const SRC = '/splash/didap-intro.json'
const CLASS = 'home-intro'

// Lo script decide prima del primo disegno, e solo se l'animazione
// partirà chiede subito il Lottie: chi ha chiesto meno movimento non lo
// scarica
useHead({
  script: [{
    key: CLASS,
    tagPosition: 'head',
    innerHTML: `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('${CLASS}');var l=document.createElement('link');l.rel='preload';l.as='fetch';l.crossOrigin='anonymous';l.href='${SRC}';document.head.appendChild(l)}}catch(e){}`,
  }],
})

const player = ref<HTMLElement>()
// Il player entra con una dissolvenza: la D non scatta al primo fotogramma
const shown = ref(false)
let anim: AnimationItem | null = null
// Ogni corsa ha il suo numero: un caricamento in ritardo non riparte
let run = 0

function end() {
  run++
  anim?.destroy()
  anim = null
  shown.value = false
  document.documentElement.classList.remove(CLASS)
}

async function play() {
  end()
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const id = run
  document.documentElement.classList.add(CLASS)
  // Con una rete lenta non si resta senza logo
  setTimeout(() => id === run && !anim && end(), 3000)
  try {
    const [{ default: lottie }, animationData] = await Promise.all([
      import('lottie-web/build/player/lottie_light'),
      fetch(SRC).then(r => r.json()),
    ])
    if (id !== run || !player.value) return
    anim = lottie.loadAnimation({
      container: player.value,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    })
    // Il player taglia al riquadro del Lottie: Didi arriva da fuori
    player.value.querySelector('[clip-path]')?.removeAttribute('clip-path')
    anim.addEventListener('complete', end)
    // Parte a pagina ferma, dopo il primo disegno: così i primi
    // fotogrammi non si perdono nel caricamento
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    if (id !== run) return
    shown.value = true
    anim.play()
  }
  catch {
    if (id === run) end()
  }
}

onMounted(play)
onBeforeUnmount(end)
</script>

<template>
  <h1 class="relative">
    <img
      src="/brand/logo-esteso.svg"
      alt="Didap"
      width="1278"
      height="367"
      class="logo-still block h-auto w-full"
    >
    <div
      ref="player"
      class="logo-player"
      :class="{ 'is-shown': shown }"
      aria-hidden="true"
    />
  </h1>
</template>

<style scoped>
html.home-intro .logo-still {
  visibility: hidden;
}

/* Il fotogramma intero intorno al logo: 1920/1396.75 in larghezza,
   1080/400 in altezza */
.logo-player {
  position: absolute;
  top: -91.19%;
  left: -18.976%;
  width: 137.462%;
  height: 270%;
  pointer-events: none;
  opacity: 0;
  transform: translateY(14px) scale(0.97);
  transition:
    opacity 0.5s ease-out,
    transform 0.7s var(--ease-vintage);
}

.logo-player.is-shown {
  opacity: 1;
  transform: none;
}

.logo-player :deep(svg) {
  overflow: visible;
}
</style>
