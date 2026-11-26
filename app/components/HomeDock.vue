<script setup lang="ts">
import { useEventListener, useResizeObserver } from '@vueuse/core'
import type { ProjectType } from '#shared/contact'
import DidiChatPanel from '~/components/DidiChatPanel.vue'

// La barra in basso della home su telefono (sotto gli 860px, dove non
// c'è l'indice a destra): Didi in basso a sinistra e, sulle schermate
// dei prodotti, la nuvoletta con la descrizione del prodotto, che si
// scrive lettera per lettera mentre Didi annuisce. Sta sopra Didi, a
// tutta larghezza nello spazio sotto il video; tutta la nuvoletta porta
// alla scheda, e lo dice il pulsantino verde con la freccia. Il nome non
// serve: sta nel logo del video. Con meno movimento la frase compare
// intera. Fuori dalle schermate in cui serve (`shown` falso) scende via.
// Agli screen reader la frase la legge la schermata (ScreenHero): qui
// conta il link, con `label` ("Scopri di più: CityFix"). Senza `to` la
// nuvoletta dice solo la frase (i clienti), senza link né freccia, con un
// titolo sopra (`title`) se c'è. Nella frase `**così**` è in grassetto
// (boldParts): titolo e grassetti si scrivono con il resto.
//
// Toccare Didi, o l'invito "Scrivici" accanto a lui, apre nella
// nuvoletta la chat con Didi (DidiChatPanel), la stessa della chiusura:
// evento `form` per il modulo. Si richiude toccando di nuovo Didi, con la
// ✕, con Esc o toccando fuori.
const props = defineProps<{
  shown: boolean
  title?: string
  line?: string
  to?: string
  label?: string
}>()
const emit = defineEmits<{ form: [type: ProjectType | '', message: string] }>()

const { t } = useI18n()
const { thinking } = useDidiChat()

// La frase intera c'è sempre, una lettera per elemento: la nuvoletta ha
// subito la sua misura e gli a capo sono quelli finali dalla prima
// lettera (text-wrap: pretty, con la frase in due pezzi, andava a capo
// altrove). Ogni lettera compare col suo ritardo (`.dock-letter` in
// main.css): niente timer, il componente non si ridisegna. Didi annuisce
// finché la frase si scrive
const STEP = 22
// Le lettere del titolo, poi quelle della frase: il ritardo continua
const titleLetters = computed(() => Array.from(props.title ?? ''))
const letters = computed(() => {
  const offset = titleLetters.value.length
  return boldParts(props.line ?? '')
    .flatMap(p => Array.from(p.text, c => ({ c, bold: p.bold })))
    .map((l, i) => ({ ...l, d: (offset + i) * STEP }))
})
const speaking = ref(false)
let quiet: ReturnType<typeof setTimeout> | undefined
watch(() => [props.title, props.line, props.shown] as const, ([, line, shown]) => {
  clearTimeout(quiet)
  speaking.value = !!(shown && line) && !matchMedia('(prefers-reduced-motion: reduce)').matches
  if (speaking.value) quiet = setTimeout(() => (speaking.value = false), (titleLetters.value.length + letters.value.length) * STEP)
}, { flush: 'post' })
onBeforeUnmount(() => clearTimeout(quiet))

// La chat
const chat = ref(false)
const panel = ref<InstanceType<typeof DidiChatPanel>>()

// La nuvoletta c'è: con la chat o con la frase
const bubble = computed(() => chat.value || (props.shown && !!props.line))

// L'altezza della nuvoletta segue il contenuto con una transizione:
// fra descrizione e chat cresce e si restringe piano invece di saltare.
// Prima della prima misura resta automatica
const content = ref<HTMLElement>()
const height = ref<number>()
useResizeObserver(content, ([entry]) => {
  if (entry) height.value = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
})
watch(bubble, (on) => {
  if (!on) height.value = undefined
})

function toggle() {
  chat.value = !chat.value
  if (chat.value) nextTick(() => panel.value?.focus())
}

function close() {
  chat.value = false
}

function openForm(type: ProjectType | '', message: string) {
  emit('form', type, message)
  chat.value = false
}

// Uscita dalle schermate dei prodotti: la chat si chiude con la barra
watch(() => props.shown, (shown) => {
  if (!shown) chat.value = false
})

// Tornando dalla chiusura, Didi viene da lì (index.vue): la barra
// ricompare al suo posto senza scivolare dal basso, e Didi parte da
// `from` e scivola qui (FLIP). Finito il viaggio la barra torna a
// entrare e uscire scivolando
const jump = ref(false)
const didiImg = ref<HTMLImageElement>()
function arriveFrom(from: DOMRect) {
  jump.value = true
  return nextTick().then(() => {
    const el = didiImg.value
    if (!el) return
    const to = el.getBoundingClientRect()
    return el.animate(
      [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` }, { transform: 'none' }],
      { duration: 650, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    ).finished.catch(() => {})
  }).finally(() => {
    jump.value = false
  })
}
defineExpose({ arriveFrom })

if (import.meta.client) {
  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && chat.value) close()
  })
}
</script>

<template>
  <!-- Con la chat aperta il video si scurisce; toccarlo la chiude -->
  <Transition
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-200"
  >
    <div
      v-if="chat"
      class="
        fixed inset-0 z-40 bg-ink/45
        screens:hidden
      "
      aria-hidden="true"
      @click="close"
    />
  </Transition>

  <div
    class="
      pointer-events-none fixed inset-x-0 bottom-0 z-40 page-x flex max-w-none
      flex-col-reverse items-start gap-3
      pb-[max(16px,env(safe-area-inset-bottom))]
      transition-[opacity,translate,visibility] duration-500
      screens:hidden
    "
    :class="[
      shown || chat ? '' : 'invisible translate-y-full opacity-0',
      jump ? 'transition-none' : '',
    ]"
  >
    <!-- La riga di Didi: lui a sinistra, a destra l'invito a scrivergli,
         sempre visibile; sparisce solo con la chat aperta -->
    <div
      class="relative z-1 flex w-full items-end justify-between gap-3"
    >
      <button
        type="button"
        class="
          pointer-events-auto -m-1 shrink-0 rounded-full p-1
          focus-visible:outline-2 focus-visible:outline-paper-light
        "
        :aria-expanded="chat"
        :aria-controls="chat ? 'dock-chat' : undefined"
        :aria-label="chat ? t('didi.close') : t('didi.open')"
        @click="toggle"
      >
        <img
          src="/brand/didi-testa-sticker.svg"
          alt=""
          width="240"
          height="222"
          ref="didiImg"
          data-dock-didi
          class="
            h-[62px] w-auto origin-bottom
            drop-shadow-[0_6px_14px_rgb(22_20_18/0.35)] transition-transform
            duration-200
            active:scale-95
          "
          :class="speaking || thinking ? 'dock-speaking' : ''"
        >
      </button>

      <Transition
        enter-from-class="opacity-0 translate-x-2"
        leave-to-class="opacity-0"
        enter-active-class="transition duration-400 ease-vintage"
        leave-active-class="transition duration-150"
      >
        <button
          v-if="!chat"
          type="button"
          class="
            group pointer-events-auto flex items-center gap-3 rounded-full
            bg-red py-1.5 pr-1.5 pl-5 text-left text-paper-light
            shadow-[0_8px_22px_rgb(22_20_18/0.4)]
            transition-[background-color,scale] duration-200
            hover:bg-ink
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-paper-light
            active:scale-95
          "
          aria-controls="dock-chat"
          aria-expanded="false"
          @click="toggle"
        >
          <!-- Rosso come la chiusura, dove si scrive a Didi; il cerchio con
               la freccia come l'invio della chat: si tocca -->
          <span class="grid leading-tight">
            <span class="text-[12px] opacity-85">{{ t('home.dock_ask') }}</span>
            <span class="text-button">{{ t('home.dock_cta') }}</span>
          </span>
          <span
            class="
              flex size-10 shrink-0 items-center justify-center rounded-full
              bg-paper-light text-red transition-colors duration-200
              group-hover:text-ink
            "
            aria-hidden="true"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            ><path d="M2 7h10M7.5 2.5 12 7l-4.5 4.5" /></svg>
          </span>
        </button>
      </Transition>
    </div>

    <!-- La nuvoletta e la sua coda sono una forma sola: entrano ed escono
         insieme, con un'unica ombra che segue il contorno di tutte e due.
         La forma e l'ombra stanno su uno strato loro, che non cambia
         mentre la frase si scrive: il drop-shadow non si ricalcola a ogni
         lettera. Cambiando prodotto la nuvoletta resta e riscrive solo la
         frase; fra descrizione e chat cambia solo quello che c'è dentro -->
    <Transition
      enter-from-class="bubble-from"
      leave-to-class="bubble-from"
      enter-active-class="bubble-in"
      leave-active-class="bubble-out"
    >
      <div
        v-if="bubble"
        class="
          bubble-origin pointer-events-auto relative w-full text-ink
          transition-[height] duration-350 ease-vintage
          motion-reduce:transition-none
        "
        :style="height ? { height: `${height}px` } : undefined"
      >
        <div
          class="absolute inset-0 drop-shadow-[0_10px_22px_rgb(22_20_18/0.3)]"
          aria-hidden="true"
        >
          <div class="absolute inset-0 rounded-[38px] bg-paper-light" />
          <DidiTail />
        </div>
        <!-- Al tocco su Didi cambia subito il contenuto, il nuovo entra
             piano e la forma cresce o si restringe fino alla sua misura.
             Lo strato taglia quello che esce mentre la forma corre,
             ancorato in basso: la chat sale da Didi -->
        <div class="
          relative flex h-full flex-col justify-end overflow-hidden
          rounded-[38px]
        ">
          <div
            ref="content"
            class="shrink-0"
          >
            <Transition
              enter-from-class="opacity-0 translate-y-1"
              enter-active-class="transition duration-200 ease-vintage"
            >
              <DidiChatPanel
                v-if="chat"
                id="dock-chat"
                ref="panel"
                key="chat"
                role="dialog"
                :aria-label="t('didi.open')"
                closable
                class="max-h-[calc(100dvh-140px)]"
                @close="close"
                @form="openForm"
              />

              <!-- La descrizione del prodotto: tutta la nuvoletta porta alla
                   scheda. Lo dice il pulsantino verde con la freccia,
                   flottante dopo la frase: si affianca a destra dell'ultima
                   riga -->
              <NuxtLink
                v-else-if="to"
                key="product"
                :to="to!"
                :aria-label="label"
                class="
                  group flow-root rounded-[38px] px-5 pt-4 pb-5
                  text-[clamp(1.0625rem,4.4vw,1.1875rem)]/[1.35] wrap-break-word
                  focus-visible:outline-2 focus-visible:outline-offset-2
                  focus-visible:outline-paper-light
                "
              >
                <span
                  :key="line"
                  aria-hidden="true"
                ><span
                  v-for="(l, i) in letters"
                  :key="i"
                  class="dock-letter"
                  :class="{ 'font-semibold': l.bold }"
                  :style="{ '--d': `${l.d}ms` }"
                >{{ l.c }}</span></span>
                <span
                  class="
                    float-right mt-1 ml-3 flex size-10 items-center
                    justify-center rounded-full bg-green text-paper-light
                    transition-[background-color,scale] duration-200
                    group-hover:bg-ink
                    group-active:scale-90
                  "
                  aria-hidden="true"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  ><path d="M3.5 10.5 10.5 3.5M5 3.5h5.5V9" /></svg>
                </span>
              </NuxtLink>

              <!-- Solo la frase, senza link: la legge la schermata -->
              <p
                v-else
                key="say"
                aria-hidden="true"
                class="
                  rounded-[38px] px-5 pt-4 pb-5
                  text-[clamp(1.0625rem,4.4vw,1.1875rem)]/[1.35] wrap-break-word
                "
              >
                <span :key="`${title}|${line}`">
                  <span
                    v-if="title"
                    class="
                      mb-1 block font-wide text-[1.375rem] leading-[1.1]
                      font-bold tracking-[-0.02em]
                    "
                  ><span
                    v-for="(c, i) in titleLetters"
                    :key="i"
                    class="dock-letter"
                    :style="{ '--d': `${i * STEP}ms` }"
                  >{{ c }}</span></span>
                  <span
                    v-for="(l, i) in letters"
                    :key="i"
                    class="dock-letter"
                    :class="{ 'font-semibold': l.bold }"
                    :style="{ '--d': `${l.d}ms` }"
                  >{{ l.c }}</span>
                </span>
              </p>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
