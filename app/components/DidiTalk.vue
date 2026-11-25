<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import DidapButton from '~/components/DidapButton.vue'
import { projectTypeFromQuery, type ProjectType } from '#shared/contact'
import { DIDI_TOPICS, type DidiTopic } from '#shared/didi'
import { untypeset } from '#shared/typeset'

// Didi che parla: la testa grande a sinistra, la nuvoletta in alto a
// destra con la coda verso la bocca, sotto la nuvoletta il campo per
// scriverle (su telefono sotto Didi). Le proporzioni sono quelle del
// disegno, in unità della larghezza della scena (cqw): la nuvoletta
// larga quasi tre volte Didi, il campo sotto, rientrato dalla coda. Da quello che
// scrive il cliente capisce di cosa si tratta (useDidiChat) e propone la
// strada più corta per sentirci: WhatsApp se c'è il numero, la mail già
// scritta, il modulo (evento `form`, con la voce e il messaggio: chi la
// usa decide dove aprirlo). `hello` è la nuvoletta a chat vuota,
// `suggestions` le voci pronte sotto il campo. `tone="red"` per la
// chiusura rossa della home: bottoni carta. `direct`: sotto il campo
// "Oppure contattaci direttamente", che apre il modulo senza la risposta.
const props = defineProps<{ hello: string, suggestions?: boolean, tone?: 'paper' | 'red', direct?: boolean }>()
const emit = defineEmits<{ form: [type: ProjectType | '', message: string] }>()

const { t } = useI18n()
const { said, topic, thinking, ai, sent, failed, messages, ask, reset } = useDidiChat()

const draft = ref('')
const input = ref<HTMLTextAreaElement>()
const red = computed(() => props.tone === 'red')

const { label: topicLabel, mailto: mailtoFor, whatsapp: whatsappFor } = useDidiContact()

// Prima che il cliente scriva, nella nuvoletta c'è la domanda di Didi,
// grande. Poi la conversazione: Didi a sinistra, il cliente a destra,
// che scorre dentro la nuvoletta (la forma resta, con la coda verso la
// bocca). Con le frasi già scritte (senza AI) Didi risponde
// sull'argomento, e se l'idea non è partita propone il modulo
const line = computed(() => props.hello)
type Bubble = { role: 'user' | 'assistant', content: string }
const started = computed(() => messages.value.length > 0)
const thread = computed<Bubble[]>(() => {
  const list: Bubble[] = [{ role: 'assistant', content: props.hello }, ...messages.value]
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

// Più è lunga, più è piccola: deve stare nella nuvoletta. Su telefono
// misure fisse, la nuvoletta è larga quanto lo schermo
const size = computed(() => {
  const n = line.value.length
  if (n < 40) return 'text-[1.5rem] md:text-[max(1.5rem,4.4cqw)]'
  if (n < 80) return 'text-base md:text-[max(1.25rem,3.2cqw)]'
  return 'text-base md:text-[max(1rem,2.4cqw)]'
})

const mailto = computed(() => (topic.value ? mailtoFor(topic.value, said.value) : ''))
const whatsapp = computed(() => (said.value ? whatsappFor(said.value) : ''))

function send() {
  const text = draft.value.trim()
  if (!text || thinking.value) return
  draft.value = ''
  ask(text)
}

// Le voci pronte: scrivono per il cliente la frase di DidiGuide
function pick(k: DidiTopic) {
  ask(untypeset(t(`didi.message.${k}`)))
}

function restart() {
  reset()
  nextTick(() => input.value?.focus())
}

// Quello già scritto a Didi passa al modulo; prima della risposta anche
// il testo nel campo non ancora inviato
function openForm() {
  emit('form', projectTypeFromQuery(topic.value), said.value || draft.value.trim())
}

// Il campo cresce con il testo, fino a qualche riga. Vuoto si misura con
// il placeholder, che su telefono va su due righe e non deve tagliarsi:
// su una copia nascosta, perché scriverlo nel campo vero ne cancellerebbe
// la cronologia di annulla. Si rimisura anche quando cambia la larghezza
// e quando arriva il font
const placeholder = computed(() => t('chat.placeholder'))
const { width } = useElementSize(input)

function measure(el: HTMLTextAreaElement) {
  if (el.value) {
    el.style.height = 'auto'
    return el.scrollHeight
  }
  const ghost = el.cloneNode() as HTMLTextAreaElement
  ghost.value = el.placeholder
  Object.assign(ghost.style, { position: 'absolute', visibility: 'hidden', height: 'auto', width: `${el.offsetWidth}px` })
  el.after(ghost)
  const h = ghost.scrollHeight
  ghost.remove()
  return h
}

function fit() {
  const el = input.value
  if (!el) return
  const h = measure(el)
  el.style.height = `${Math.min(h, 180)}px`
  el.style.overflowY = h > 180 ? 'auto' : 'hidden'
}

watch([draft, width, placeholder], () => nextTick(fit))
onMounted(() => {
  fit()
  document.fonts?.ready.then(fit)
})
</script>

<template>
  <!-- La scena in proporzione: misure in cqw, la larghezza della scena -->
  <div class="
    didi-scene @container grid w-[min(100%,1400px,calc((100svh-280px)*2.2))]
    grid-cols-[minmax(0,25.2fr)_minmax(0,74.8fr)]
  ">
    <!-- La nuvoletta, con la coda verso la bocca di Didi. Su telefono sta
         sopra Didi, larga quanto la scena e alta quanto il testo -->
    <div
      class="
        relative col-span-full row-1 grid grid-cols-[minmax(0,1fr)]
        place-items-start rounded-[28px] bg-ink p-5 text-paper-light
        md:col-2 md:aspect-1010/410 md:place-items-center md:rounded-[20%/50%]
        md:px-[11%] md:py-[9%]
      "
      :class="started ? 'md:min-h-0 md:grid-rows-[minmax(0,1fr)] md:py-[6%]' : ''"
      aria-live="polite"
    >
      <!-- La conversazione: scorre dentro la forma della nuvoletta, e in
           alto i messaggi vecchi sfumano invece di tagliarsi -->
      <ol
        v-if="started"
        ref="threadEl"
        class="
          flex max-h-[50svh] w-full flex-col gap-2 self-stretch overflow-y-auto
          overscroll-contain
          mask-[linear-gradient(to_bottom,transparent,#000_28px)] pt-6
          md:h-full md:max-h-none
        "
      >
        <li
          v-for="(m, i) in thread"
          :key="i"
          class="
            talk-bubble max-w-[85%] rounded-[20px] px-4 py-2.5 text-base/snug
            wrap-break-word
            md:text-[max(1rem,1.45cqw)]/snug
          "
          :class="m.role === 'user'
            ? 'self-end rounded-br-md bg-green text-paper-light'
            : 'self-start rounded-bl-md bg-paper-light/12 text-paper-light'"
        >
          <span class="sr-only">{{ m.role === 'user' ? t('chat.you') : 'Didi' }}: </span>{{ m.content }}
        </li>
        <li
          v-if="thinking"
          class="
            talk-bubble flex self-start rounded-[20px] rounded-bl-md
            bg-paper-light/12 px-4 py-3.5
          "
          role="status"
          :aria-label="t('chat.thinking')"
        >
          <span class="dots flex items-center gap-1.5">
            <span
              v-for="n in 3"
              :key="n"
              class="size-2 rounded-full bg-current"
            />
          </span>
        </li>
      </ol>
      <p
        v-else
        :key="line"
        class="
          said font-wide leading-[1.02] font-bold tracking-[-0.02em]
          wrap-break-word
        "
        :class="size"
      >
        {{ line }}
      </p>
      <!-- Su telefono la coda scende dal bordo sotto fino alla bocca, sul
           lato destro della testa al 70%: 12px di stacco più il 70% di Didi,
           alta il 24.5% della scena -->
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        class="
          absolute top-[calc(100%-2px)] left-[26.7cqw] h-[calc(14px+17.1cqw)]
          w-[16cqw] text-ink
          md:hidden
        "
        aria-hidden="true"
      ><path
        d="M30 0 100 0 0 100Z"
        fill="currentColor"
      /></svg>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        class="
          absolute top-[80.5%] left-[4%] hidden h-[45%] w-[20.8%] text-ink
          md:block
        "
        aria-hidden="true"
      ><path
        d="M42.9 0 100 27 0 100Z"
        fill="currentColor"
      /></svg>
    </div>

    <img
      src="/brand/didi-testa.svg"
      alt=""
      width="218"
      height="200"
      class="
        didi col-1 row-2 mt-3 w-[106%] max-w-none self-start
        md:row-[1/span_2] md:mt-[20.7cqw]
      "
      :class="{ 'is-thinking': thinking, 'is-talking': topic }"
    >

    <!-- Quello che il cliente scrive a Didi; quando l'idea è partita
         resta solo "Ricomincia" -->
    <form
      v-if="!sent"
      class="
        col-span-full row-3 mt-6 flex flex-col gap-3
        md:col-2 md:row-2 md:mt-[5.2cqw] md:pr-[5.2cqw] md:pl-[14.1cqw]
      "
      @submit.prevent="send"
    >
      <div
        class="
          flex items-end gap-3 rounded-[30px] border-[1.5px] bg-paper-light
          py-1.5 pr-1.5 pl-6 text-ink transition-colors
          focus-within:border-green
        "
        :class="red ? 'border-transparent' : 'border-ink'"
      >
        <textarea
          ref="input"
          v-model="draft"
          rows="1"
          maxlength="2000"
          :aria-label="t('chat.input')"
          :placeholder="placeholder"
          class="
            min-h-11 min-w-0 flex-1 resize-none overflow-hidden bg-transparent
            py-[7px] text-body outline-none
            placeholder:text-ink/40
          "
          @keydown.enter.exact.prevent="send"
        />
        <button
          type="submit"
          class="
            flex size-11 shrink-0 items-center justify-center rounded-full
            border-[1.5px] border-ink bg-ink text-paper-light transition-colors
            hover:border-green hover:bg-green
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-ink
            disabled:border-ink/20 disabled:bg-transparent disabled:text-ink/35
          "
          :disabled="!draft.trim() || thinking"
          :aria-label="t('chat.send')"
          :title="t('chat.send')"
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
      <ul
        v-if="suggestions && !said"
        class="flex flex-wrap gap-2"
      >
        <li
          v-for="k in DIDI_TOPICS"
          :key="k"
        >
          <button
            type="button"
            class="
              rounded-full border-[1.5px] border-current/40 px-4 py-2 text-label
              transition-colors
              hover:border-ink hover:bg-ink hover:text-paper-light
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-current
            "
            @click="pick(k)"
          >
            {{ topicLabel(k) }}
          </button>
        </li>
      </ul>
      <!-- Chi non vuole parlare con Didi va dritto al modulo; dopo la
           risposta lo apre "Compila il modulo" -->
      <button
        v-if="direct && (!topic || ai)"
        type="button"
        class="
          mt-1 self-start rounded-sm text-left text-body underline
          decoration-[1.5px] underline-offset-4 opacity-80 transition-opacity
          hover:opacity-100
          focus-visible:outline-2 focus-visible:outline-offset-4
          focus-visible:outline-current
          md:pl-6
        "
        @click="openForm"
      >
        {{ t('chat.direct') }}
      </button>
    </form>

    <!-- Le strade per sentirci, dopo la risposta: con le frasi già
         scritte, se l'invio non è riuscito o quando l'idea è partita -->
    <div
      v-if="topic && (!ai || failed || sent)"
      class="
        col-span-full row-4 mt-4 flex flex-wrap items-center gap-x-7 gap-y-4
        md:col-2 md:row-3 md:pl-[14.1cqw]
      "
    >
      <template v-if="!sent">
      <DidapButton
        v-if="whatsapp"
        :href="whatsapp"
        :paper="red"
      >
        {{ t('didi.whatsapp') }}
      </DidapButton>
      <DidapButton
        :href="mailto"
        :paper="red"
      >
        {{ t('didi.email') }}
      </DidapButton>
      <button
        type="button"
        class="
          border-b-[1.5px] border-current py-2.5 text-button transition-opacity
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
</template>

<style scoped>
/* Didi pensa dondolando, risponde con un saltello; la risposta entra
   dal basso. Con meno movimento sta ferma */
@media (prefers-reduced-motion: no-preference) {
  .didi {
    transform-origin: 50% 100%;
  }

  .didi.is-thinking {
    animation: didi-think 0.9s ease-in-out infinite;
  }

  .didi.is-talking {
    animation: didi-hop 0.5s var(--ease-vintage);
  }

  .said,
  .talk-bubble {
    animation: said-in 0.45s var(--ease-vintage);
  }

  .dots span {
    animation: dot 1s ease-in-out infinite;
  }

  .dots span:nth-child(2) { animation-delay: 0.15s; }
  .dots span:nth-child(3) { animation-delay: 0.3s; }
}

@keyframes didi-think {
  0%, 100% { transform: rotate(-4deg); }
  50% { transform: rotate(4deg); }
}

@keyframes didi-hop {
  0% { transform: none; }
  35% { transform: translateY(-8%) scale(0.97, 1.04); }
  70% { transform: translateY(0) scale(1.04, 0.96); }
  100% { transform: none; }
}

@keyframes said-in {
  from { opacity: 0; transform: translateY(10px); }
}

@keyframes dot {
  0%, 100% { opacity: 0.35; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-4px); }
}
</style>
