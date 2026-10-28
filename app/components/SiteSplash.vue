<script setup lang="ts">
import testaSvg from '../../public/brand/didi-testa.svg?raw'
import contrattoSvg from '../../public/brand/logo-contratto.svg?raw'
import estesoSvg from '../../public/brand/logo-esteso.svg?raw'

// La splash della prima visita (sorgente HyperFrames in media/splash):
// la D aspetta, Didi cade accanto, rimbalza, si guarda intorno, salta
// dentro la D e il logo si completa. Lo script in testa alla pagina
// decide prima del primo disegno se mostrarla (classe `splash` su
// <html>): una volta sola per browser, mai con meno movimento.
// Il palco è il 1920x1080 della composizione, scalato sullo schermo.

const { t } = useI18n()

const KEY = 'didap-splash'
useHead({
  script: [{
    key: 'didap-splash',
    tagPosition: 'head',
    innerHTML: `try{if(!localStorage.getItem('${KEY}')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('splash')}catch(e){}`,
  }],
})

const PATH = /<g transform="([^"]+)"><path d="([^"]+)" fill="([^"]+)"\/><\/g>/g
const paths = (svg: string) => [...svg.matchAll(PATH)].map(([, transform, d, fill]) => ({ transform, d, fill }))

// Nel logo esteso: i, d, a, p, la sagoma della D con la scimmia, il muso
const LOGO_IDS = ['sp-i', 'sp-d', 'sp-a', 'sp-p', 'sp-dbody', 'sp-dface']
const logo = paths(estesoSvg)
  .map((p, i) => `<g id="${LOGO_IDS[i]}"><g transform="${p.transform}"><path d="${p.d}" fill="${p.fill}"/></g></g>`)
  .join('')
const dPlain = paths(contrattoSvg)[0]!.d
const testa = testaSvg.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '')

const visible = ref(true)
const leaving = ref(false)
let tl: ReturnType<typeof import('gsap').gsap.timeline> | null = null
let finishing = false

function finish() {
  if (finishing) return
  finishing = true
  tl?.progress(1).pause()
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
  const { gsap } = await import('gsap')

  const frame = document.querySelector<HTMLElement>('#sp-frame')!
  const fit = () => frame.style.setProperty('--s', String(Math.min(innerWidth / 1300, innerHeight / 900, 1)))
  fit()
  window.addEventListener('resize', fit)

  const S = 2
  const LOGO_X = 400.62
  const LOGO_Y = 380
  const bb = document.querySelector<SVGGElement>('#sp-dbody')!.getBBox()
  const dx = LOGO_X + bb.x * S
  const dy = LOGO_Y + bb.y * S
  const dw = bb.width * S
  const dh = bb.height * S
  const TUFT = 19.0697 / 200
  const dTop = dy + dh * TUFT
  const dBottom = dy + dh

  Object.assign(document.querySelector<SVGElement>('#sp-dplain')!.style, {
    left: `${dx}px`, top: `${dTop}px`, width: `${dw}px`, height: `${dBottom - dTop}px`,
  })
  const H = (dBottom - dTop) * 0.8
  const W = (H * 218.06) / 200
  const landX = dx - dw * 0.42 - W
  Object.assign(document.querySelector<SVGElement>('#sp-monkey')!.style, {
    left: `${landX}px`, top: `${dBottom - H}px`, width: `${W}px`, height: `${H}px`,
  })
  const intoD = dx + dw / 2 - W / 2 - landX
  const centerShift = 960 - (dx + dw / 2)
  const dOrigin = `${dx + dw / 2 - LOGO_X}px ${dBottom - LOGO_Y}px`
  const bottom = { transformOrigin: '50% 100%' }
  const m = '#sp-monkey'

  tl = gsap.timeline({ onComplete: () => setTimeout(finish, 500) })
  tl.set('#sp-stage', { x: centerShift }, 0)
  tl.fromTo('#sp-dplain', { scaleY: 0.4, scaleX: 1.2, opacity: 0, ...bottom },
    { scaleY: 1, scaleX: 1, opacity: 1, duration: 0.55, ease: 'back.out(2.2)' }, 0.05)
  tl.fromTo(m, { y: -(dBottom + 80), rotation: -28, scaleX: 0.92, scaleY: 1.12, opacity: 1, ...bottom },
    { y: 0, rotation: 0, duration: 0.46, ease: 'power2.in' }, 0.4)
  tl.to(m, { scaleY: 0.64, scaleX: 1.26, duration: 0.09, ease: 'power1.out' }, 0.86)
  tl.to(m, { scaleY: 1.1, scaleX: 0.92, duration: 0.12, ease: 'power2.out' }, 0.95)
  tl.to(m, { y: -dh * 0.75, duration: 0.34, ease: 'power2.out' }, 0.95)
  tl.to(m, { scaleY: 1, scaleX: 1, rotation: 8, duration: 0.22, ease: 'sine.inOut' }, 1.07)
  tl.to(m, { y: 0, rotation: 0, duration: 0.3, ease: 'power2.in' }, 1.29)
  tl.to(m, { scaleY: 0.8, scaleX: 1.14, duration: 0.08, ease: 'power1.out' }, 1.59)
  tl.to(m, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, 1.67)
  tl.to(m, { rotation: -13, x: -14, scaleX: 0.93, duration: 0.32, ease: 'sine.inOut' }, 2.3)
  tl.to(m, { rotation: 11, x: 12, scaleX: 0.93, duration: 0.42, ease: 'sine.inOut' }, 2.8)
  tl.to(m, { rotation: 0, x: 0, scaleX: 1, duration: 0.3, ease: 'sine.inOut' }, 3.35)
  tl.to(m, { scaleY: 0.76, scaleX: 1.16, duration: 0.16, ease: 'power2.in' }, 3.7)
  tl.to(m, { y: -dh * 1.05, scaleY: 1.14, scaleX: 0.9, rotation: 14, duration: 0.34, ease: 'power2.out' }, 3.86)
  tl.to(m, { x: intoD, duration: 0.6, ease: 'sine.inOut' }, 3.86)
  tl.to(m, { y: 0, scaleY: 1.06, scaleX: 0.95, rotation: 0, duration: 0.26, ease: 'power2.in' }, 4.2)
  tl.set(`${m}, #sp-dplain`, { opacity: 0 }, 4.46)
  tl.set('#sp-dbody, #sp-dface', { opacity: 1 }, 4.46)
  tl.fromTo('#sp-logo', { scaleY: 1, scaleX: 1, transformOrigin: dOrigin },
    { scaleY: 0.84, scaleX: 1.1, duration: 0.09, ease: 'power2.out' }, 4.46)
  tl.to('#sp-logo', { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' }, 4.55)
  tl.to('#sp-stage', { x: 0, duration: 0.8, ease: 'power3.inOut' }, 5.1)
  tl.fromTo('#sp-i, #sp-d, #sp-a, #sp-p', { y: 26, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.8)', stagger: 0.07 }, 5.35)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  tl?.kill()
})
</script>

<template>
  <div
    v-if="visible"
    class="splash-screen fixed inset-0 z-100 overflow-hidden bg-paper"
    :class="leaving ? 'opacity-0' : ''"
  >
    <div
      id="sp-frame"
      aria-hidden="true"
    >
      <div id="sp-stage">
        <svg
          id="sp-monkey"
          viewBox="0 0 218.06 200"
          v-html="testa"
        />
        <svg
          id="sp-dplain"
          viewBox="0 0 182.16 180.93"
          preserveAspectRatio="none"
        ><path
          :d="dPlain"
          fill="#161412"
        /></svg>
        <svg
          id="sp-logo"
          viewBox="0 0 559.38 160"
          v-html="logo"
        />
      </div>
    </div>
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

#sp-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1920px;
  height: 1080px;
  transform: translate(-50%, -50%) scale(var(--s, 0));
}

#sp-stage {
  position: absolute;
  inset: 0;
}

#sp-monkey,
#sp-dplain,
#sp-logo {
  position: absolute;
  display: block;
  overflow: visible;
}

#sp-monkey,
#sp-dplain,
#sp-logo > g {
  opacity: 0;
}

#sp-monkey {
  z-index: 1;
}

#sp-dplain {
  z-index: 2;
}

#sp-logo {
  z-index: 3;
  top: 380px;
  left: 400.62px;
  width: 1118.76px;
  height: 320px;
}
</style>
