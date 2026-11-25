<script setup lang="ts">
import { useElementSize, useEventListener, useResizeObserver } from '@vueuse/core'
import DidapButton from '~/components/DidapButton.vue'
import { projectTypeFromQuery, type ProjectType } from '#shared/contact'

// La barra in basso della home su telefono (sotto gli 860px, dove non
// c'è l'indice a destra): Didi in basso a sinistra e, sulle schermate
// dei prodotti, la nuvoletta con la descrizione del prodotto, che si
// scrive lettera per lettera mentre Didi annuisce. Sta sopra Didi, a
// tutta larghezza nello spazio sotto il video; tutta la nuvoletta porta
// alla scheda, e lo dice il pulsantino verde con la freccia. Il nome non
// serve: sta nel logo del video. Con meno movimento la frase compare
// intera. Fuori dalle schermate in cui serve (`shown` falso) scende via.
// Agli screen reader la frase la legge la schermata (ScreenHero): qui
// conta il link, con `label` ("Scopri di più: CityFix").
//
// Toccare Didi, o l'invito "Scrivici" accanto a lui, apre nella
// nuvoletta la chat della chiusura rossa (useDidiChat, come DidiTalk):
// Didi chiede, il cliente scrive, Didi capisce di cosa si tratta e propone WhatsApp, la mail già scritta o
// il modulo (evento `form`, con la voce e il messaggio). Si richiude
// toccando di nuovo Didi, con la ✕, con Esc o toccando fuori.
const props = defineProps<{
  shown: boolean
  line?: string
  to?: string
  label?: string
}>()
const emit = defineEmits<{ form: [type: ProjectType | '', message: string] }>()

const { t } = useI18n()

// La descrizione del prodotto, lettera per lettera
const typed = ref(0)
const speaking = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

// Una lettera ogni 22ms: una frase di cento lettere in poco più di due secondi
const STEP = 22

function speak(text: string) {
  clearInterval(timer)
  speaking.value = false
  if (!text || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typed.value = text.length
    return
  }
  typed.value = 0
  speaking.value = true
  timer = setInterval(() => {
    typed.value++
    if (typed.value >= text.length) {
      clearInterval(timer)
      speaking.value = false
    }
  }, STEP)
}

onMounted(() => {
  watch(() => [props.line, props.shown] as const, ([line, shown]) => {
    if (shown && line) speak(line)
  }, { immediate: true })
})
onBeforeUnmount(() => clearInterval(timer))

// La frase intera c'è sempre, una lettera per elemento, e la parte non
// ancora detta è trasparente: la nuvoletta ha subito la sua misura e
// gli a capo sono quelli finali dalla prima lettera. Con la frase in due
// pezzi (detto e trasparente) text-wrap: pretty andava a capo in un
// altro punto e a frase finita le righe saltavano
const letters = computed(() => Array.from(props.line ?? ''))

// La chat
const chat = ref(false)
const { said, topic, thinking, ai, sent, failed, messages, ask, reset } = useDidiChat()
const { mailto: mailtoFor, whatsapp: whatsappFor } = useDidiContact()
const draft = ref('')
const input = ref<HTMLTextAreaElement>()

// Il campo parte da una riga, alta quanto il pulsante di invio, e
// cresce con il testo fino a qualche riga. Vuoto resta su una riga:
// il segnaposto non va a capo, a 14px ci sta intero anche su un telefono
// da 375px e, dove non ci sta, sfuma prima del pulsante invece di finirci
// sotto (i puntini nei campi a più righe Safari non li mette)
const placeholder = computed(() => t('chat.placeholder'))
const { width: inputWidth } = useElementSize(input)
const MAX_INPUT = 160

function fit() {
  const el = input.value
  if (!el) return
  el.style.height = 'auto'
  const h = el.value ? el.scrollHeight : 0
  el.style.height = h ? `${Math.min(h, MAX_INPUT)}px` : ''
  el.style.overflowY = h > MAX_INPUT ? 'auto' : 'hidden'
}

watch([draft, inputWidth, input], () => nextTick(fit))

// La conversazione: Didi a sinistra, il cliente a destra. Comincia con
// la domanda di Didi; con le frasi già scritte (senza AI) Didi risponde
// sull'argomento, e se l'idea non è partita propone il modulo
type Bubble = { role: 'user' | 'assistant', content: string }
const thread = computed<Bubble[]>(() => {
  const list: Bubble[] = [{ role: 'assistant', content: t('chat.ask') }, ...messages.value]
  if (!ai.value && topic.value && !thinking.value) list.push({ role: 'assistant', content: t(`chat.reply.${topic.value}`) })
  if (failed.value) list.push({ role: 'assistant', content: t('chat.send_failed') })
  return list
})

// A ogni messaggio nuovo la conversazione scende all'ultimo
const threadEl = ref<HTMLElement>()
watch([() => thread.value.length, thinking], () => nextTick(() => {
  const el = threadEl.value
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
}))
const mailto = computed(() => (topic.value ? mailtoFor(topic.value, said.value) : ''))
const whatsapp = computed(() => (said.value ? whatsappFor(said.value) : ''))

// La nuvoletta c'è: con la chat o con la descrizione
const bubble = computed(() => chat.value || (props.shown && !!props.line && !!props.to))

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

// La coda, disegnata sulle linee del design. Nel sistema della coda
// (origine in basso a sinistra della nuvoletta, 4px più su: la coda
// entra nella nuvoletta e chiude la giunzione) il bordo sinistro parte
// quasi sopra Didi, scende gonfiandosi appena verso destra e rientra
// nella punta, staccata davanti alla bocca. Il bordo destro dalla punta
// sale prima piano, poi ripido, poi di nuovo piano, e si raccorda
// tangente al fondo della nuvoletta, lontano dalla pillola
const TAIL = 'M60 0V4C72 4 80 7 85 14C92 24 93 38 76 54C92 48 110 34 122 22C132 12 150 4 190 4V0Z'

function toggle() {
  chat.value = !chat.value
  if (chat.value) nextTick(() => input.value?.focus())
}

function close() {
  chat.value = false
}

function send() {
  const text = draft.value.trim()
  if (!text || thinking.value) return
  draft.value = ''
  ask(text)
}

function restart() {
  reset()
  nextTick(() => input.value?.focus())
}

// Quello già scritto a Didi passa al modulo; prima della risposta anche
// il testo nel campo non ancora inviato
function openForm() {
  emit('form', projectTypeFromQuery(topic.value), said.value || draft.value.trim())
  chat.value = false
}

// Uscita dalle schermate dei prodotti: la chat si chiude con la barra
watch(() => props.shown, (shown) => {
  if (!shown) chat.value = false
})

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
        min-[860px]:hidden
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
      min-[860px]:hidden
    "
    :class="shown || chat ? '' : 'invisible translate-y-full opacity-0'"
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
          :aria-expanded="chat"
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
         insieme, con un'unica ombra che segue il contorno di tutte e due
         (drop-shadow), e la coda entra di qualche pixel nella nuvoletta,
         così fra le due non resta nessuna riga. Cambiando prodotto la
         nuvoletta resta e riscrive solo la frase; fra descrizione e chat
         cambia solo quello che c'è dentro -->
    <Transition
      enter-from-class="opacity-0 translate-y-2 scale-95"
      leave-to-class="opacity-0 translate-y-2 scale-95"
      enter-active-class="transition duration-300 ease-vintage"
      leave-active-class="transition duration-200"
    >
      <div
        v-if="bubble"
        class="
          pointer-events-auto relative w-full origin-bottom-left rounded-[38px]
          bg-paper-light text-ink drop-shadow-[0_10px_22px_rgb(22_20_18/0.3)]
          transition-[height] duration-350 ease-vintage
          motion-reduce:transition-none
        "
        :style="height ? { height: `${height}px` } : undefined"
      >
        <!-- Il fondo è della forma, che resta: al tocco su Didi cambia
             subito il contenuto, il nuovo entra piano e la forma cresce o
             si restringe fino alla sua misura. Lo strato taglia quello
             che esce mentre la forma corre, ancorato in basso: la chat
             sale da Didi -->
        <div class="
          flex h-full flex-col justify-end overflow-hidden rounded-[38px]
        ">
          <div
            ref="content"
            class="shrink-0"
          >
            <Transition
          enter-from-class="opacity-0 translate-y-1"
          enter-active-class="transition duration-200 ease-vintage"
        >
          <!-- La chat: in alto chi parla e la chiusura, poi la
               conversazione, che scorre dentro, e in fondo il campo -->
          <div
            v-if="chat"
            id="dock-chat"
            key="chat"
            role="dialog"
            :aria-label="t('didi.open')"
            class="
              relative flex max-h-[calc(100dvh-140px)] flex-col rounded-[38px]
              px-4 pt-3 pb-4
            "
          >
            <div class="flex shrink-0 items-center justify-between pl-2">
              <p class="font-wide text-[15px] font-bold tracking-[-0.01em]">
                Didi
              </p>
              <button
                type="button"
                class="
                  flex size-9 items-center justify-center rounded-full
                  transition-colors
                  hover:bg-ink hover:text-paper-light
                  focus-visible:outline-2 focus-visible:outline-ink
                "
                :aria-label="t('didi.close')"
                @click="close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                ><path
                  d="M5 5l10 10M15 5 5 15"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                /></svg>
              </button>
            </div>

            <ol
              ref="threadEl"
              class="
                mt-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto
                overscroll-contain
              "
              aria-live="polite"
            >
              <li
                v-for="(m, i) in thread"
                :key="i"
                class="
                  dock-bubble max-w-[85%] rounded-[20px] px-4 py-2.5
                  text-[15px]/snug wrap-break-word
                "
                :class="m.role === 'user'
                  ? 'self-end rounded-br-md bg-green text-paper-light'
                  : 'self-start rounded-bl-md bg-ink/6 text-ink'"
              >
                <span class="sr-only">{{ m.role === 'user' ? t('chat.you') : 'Didi' }}: </span>{{ m.content }}
              </li>
              <li
                v-if="thinking"
                class="
                  dock-bubble flex self-start rounded-[20px] rounded-bl-md
                  bg-ink/6 px-4 py-3.5
                "
                role="status"
                :aria-label="t('chat.thinking')"
              >
                <span class="dock-dots flex items-center gap-1.5">
                  <span
                    v-for="n in 3"
                    :key="n"
                    class="size-2 rounded-full bg-current"
                  />
                </span>
              </li>
            </ol>

            <form
              v-if="!sent"
              class="mt-3 shrink-0"
              @submit.prevent="send"
            >
              <div
                class="
                  flex items-end gap-1 rounded-[30px] border-[1.5px] border-ink
                  py-1.5 pr-1.5 pl-4 transition-colors
                  focus-within:border-green
                "
              >
                <textarea
                  ref="input"
                  v-model="draft"
                  rows="1"
                  maxlength="2000"
                  :aria-label="t('chat.input')"
                  :placeholder="placeholder"
                  class="
                    min-h-11 min-w-0 flex-1 resize-none overflow-hidden
                    bg-transparent py-2.5 text-base/6 outline-none
                    placeholder:text-[14px] placeholder:text-ink/40
                    placeholder-shown:mask-[linear-gradient(to_right,#000_calc(100%-12px),transparent)]
                    placeholder-shown:whitespace-nowrap
                  "
                  @keydown.enter.exact.prevent="send"
                />
                <button
                  type="submit"
                  class="
                    flex size-11 shrink-0 items-center justify-center
                    rounded-full border-[1.5px] border-ink bg-ink
                    text-paper-light transition-colors
                    hover:border-green hover:bg-green
                    focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-ink
                    disabled:border-ink/20 disabled:bg-transparent
                    disabled:text-ink/35
                  "
                  :disabled="!draft.trim() || thinking"
                  :aria-label="t('chat.send')"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    aria-hidden="true"
                  ><path d="M7 12V2M2.5 6.5 7 2l4.5 4.5" /></svg>
                </button>
              </div>
            </form>

            <!-- Le strade per sentirci, dopo la risposta -->
            <div
              v-if="topic && (!ai || failed || sent)"
              class="
                mt-3 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 pl-2
              "
            >
              <template v-if="!sent">
              <DidapButton
                v-if="whatsapp"
                :href="whatsapp"
              >
                {{ t('didi.whatsapp') }}
              </DidapButton>
              <DidapButton :href="mailto">
                {{ t('didi.email') }}
              </DidapButton>
              <button
                type="button"
                class="
                  border-b-[1.5px] border-current py-2.5 text-button
                  transition-opacity
                  hover:opacity-70
                "
                @click="openForm"
              >
                {{ t('chat.form') }}
              </button>
              </template>
              <button
                type="button"
                class="
                  text-label opacity-70 transition-opacity
                  hover:opacity-100
                "
                @click="restart"
              >
                {{ t('chat.restart') }}
              </button>
            </div>
          </div>

          <!-- La descrizione del prodotto: tutta la nuvoletta porta alla
               scheda. Lo dice il pulsantino verde con la freccia, flottante
               dopo la frase: si affianca a destra dell'ultima riga -->
          <NuxtLink
            v-else
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
            <span aria-hidden="true"><span
              v-for="(c, i) in letters"
              :key="i"
              :class="i < typed ? '' : 'opacity-0'"
            >{{ c }}</span></span>
            <span
              class="
                float-right mt-1 ml-3 flex size-10 items-center justify-center
                rounded-full bg-green text-paper-light
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
            </Transition>
          </div>
        </div>

        <!-- La coda da fumetto (la forma è TAIL, sopra) -->
        <svg
          width="400"
          height="80"
          viewBox="0 0 400 80"
          class="
            pointer-events-none absolute top-full left-0 -mt-1 overflow-visible
          "
          aria-hidden="true"
        >
          <path
            :d="TAIL"
            class="fill-paper-light"
          />
        </svg>
      </div>
    </Transition>
  </div>
</template>
