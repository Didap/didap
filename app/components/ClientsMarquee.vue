<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { PopoverAnchor, PopoverArrow, PopoverContent, PopoverRoot } from 'reka-ui'
import ClientLogo from '~/components/ClientLogo.vue'
import { typeset } from '#shared/typeset'

// Il carosello dei clienti in home, l'unico posto del sito dove stanno:
// i loghi scorrono piano da soli. Col mouse sopra un logo si apre la sua
// dialog (cosa abbiamo fatto per lui, e il suo sito) e il carosello si
// ferma finché resta aperta. Col dito e con la tastiera la apre un tocco
// o Invio. Una dialog sola per tutti i loghi: si aggancia a quello aperto
// (PopoverAnchor `reference`). I loghi sono tutti dello stesso colore,
// quello del testo, senza fondo: public/logos ha la loro sagoma (alfa),
// tutte alte uguali e col peso già pareggiato, e qui fa da maschera.
// Senza `logo` nella scheda c'è il nome.
// Da telefono e con meno movimento i loghi stanno fermi in una griglia.
export type MarqueeClient = {
  slug: string
  title: string
  role?: string
  did?: string
  summary: string
  logo?: string
  url?: string
}

const props = defineProps<{
  clients: MarqueeClient[]
  // La schermata è in scena: fuori scena il carosello non gira e la
  // dialog si chiude
  active: boolean
}>()

const { t } = useI18n()

// Secondi per logo: il nastro va piano, si fa in tempo a leggerli
const SECONDS_PER_LOGO = 10

// Il nastro deve essere più largo della colonna, se no tra un giro e
// l'altro resterebbe un buco: con pochi clienti la lista si ripete
const MIN_ITEMS = 8
const lap = computed(() => {
  const list = props.clients
  if (!list.length) return []
  const times = Math.ceil(MIN_ITEMS / list.length)
  return Array.from({ length: times }, () => list).flat()
})

// Da telefono (sotto il breakpoint `screens`) niente dialog: il logo
// toccato lo racconta Didi nella sua nuvoletta in basso (HomeDock), e
// chi usa il carosello lo sa con `pick`. Un altro tocco sullo stesso
// logo lo lascia
const phone = useMediaQuery('(width < 53.75rem)')

// Il cliente scelto, il suo logo e come lo si è scelto (col mouse la
// dialog si chiude uscendo, con un tocco o Invio resta finché non la si
// chiude)
const current = ref<MarqueeClient>()
const anchor = ref<HTMLElement>()
// Il logo aperto: lo stesso cliente compare più volte nel nastro
const currentKey = ref('')
const pinned = ref(false)
const open = computed({
  get: () => !!current.value && !phone.value,
  set: (v) => {
    if (!v) close()
  },
})
const emit = defineEmits<{ pick: [client: MarqueeClient | undefined] }>()
watch([current, phone], ([c, p]) => emit('pick', p ? c : undefined))
watch(phone, close)

// Aperta con un tocco o Invio, il focus entra nella dialog; col mouse
// resta dov'è. Senza far scorrere la pagina: il focus del browser la
// porterebbe alla dialog, e la home a schermate scivolerebbe via
function onOpenFocus(e: Event) {
  e.preventDefault()
  if (!pinned.value) return
  nextTick(() => document.querySelector<HTMLElement>('.client-card')?.focus({ preventScroll: true }))
}

let leaveTimer: ReturnType<typeof setTimeout> | undefined
const stay = () => clearTimeout(leaveTimer)

function show(client: MarqueeClient, el: HTMLElement, pin: boolean) {
  stay()
  current.value = client
  anchor.value = el
  currentKey.value = el.dataset.key ?? ''
  pinned.value = pin
}

function close() {
  stay()
  current.value = undefined
  currentKey.value = ''
  pinned.value = false
}

// Fra il logo e la dialog c'è un piccolo vuoto: uscendo si aspetta un
// attimo, così il puntatore fa in tempo ad arrivarci
function leave() {
  if (pinned.value) return
  stay()
  leaveTimer = setTimeout(close, 160)
}

function onEnter(e: PointerEvent, client: MarqueeClient) {
  if (e.pointerType !== 'mouse') return
  show(client, e.currentTarget as HTMLElement, false)
}

function onClick(e: MouseEvent, client: MarqueeClient) {
  const el = e.currentTarget as HTMLElement
  if (pinned.value && currentKey.value === el.dataset.key) close()
  else show(client, el, true)
}

// I clic sui loghi li gestisce onClick: per la dialog non sono "fuori"
const track = ref<HTMLElement>()
function onOutside(e: Event) {
  if (track.value?.contains(e.target as Node)) e.preventDefault()
}

watch(() => props.active, (a) => {
  if (!a) close()
})

onBeforeUnmount(stay)
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverAnchor :reference="anchor" />
    <div
      ref="track"
      role="region"
      :aria-label="t('home.more_clients')"
      :class="{ 'has-current': !!current }"
    >
    <div
      class="marquee relative overflow-hidden py-4"
      :class="{ 'is-paused': open || !active }"
    >
      <div
        class="marquee-track flex w-max"
        :style="{ '--duration': `${lap.length * SECONDS_PER_LOGO}s` }"
      >
        <!-- Due giri uguali, il secondo solo per l'occhio: lo scorrimento
             torna all'inizio quando il primo è uscito tutto -->
        <ul
          v-for="copy in 2"
          :key="copy"
          class="flex shrink-0 items-center"
          :aria-hidden="copy === 2 ? 'true' : undefined"
        >
          <!-- Lo spazio fra i loghi è a destra di ognuno, non un gap: così
               anche fra un giro e l'altro è lo stesso -->
          <li
            v-for="(c, i) in lap"
            :key="`${c.slug}-${i}`"
            class="shrink-0"
            :aria-hidden="copy === 1 && i >= clients.length ? 'true' : undefined"
          >
            <button
              type="button"
              class="
                client-logo grid cursor-pointer place-items-center rounded-2xl
                px-[clamp(16px,2.4vw,44px)] font-wide
                text-[clamp(1.5rem,1rem+1.8vw,2.75rem)] leading-none font-bold
                tracking-[-0.03em] whitespace-nowrap transition-[opacity,scale]
                duration-300 ease-vintage
                [--logo-h:clamp(96px,min(16vw,22vh),200px)]
                hover:scale-105
                focus-visible:outline-2 focus-visible:-outline-offset-2
                focus-visible:outline-ink
              "
              :class="{ 'is-current': currentKey === `${copy}-${i}` }"
              :data-key="`${copy}-${i}`"
              :tabindex="copy === 2 || i >= clients.length ? -1 : undefined"
              aria-haspopup="dialog"
              :aria-expanded="currentKey === `${copy}-${i}`"
              @pointerenter="onEnter($event, c)"
              @pointerleave="leave"
              @click="onClick($event, c)"
            >
              <ClientLogo
                :logo="c.logo"
                :title="c.title"
              />
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Da telefono, e con meno movimento, i loghi stanno fermi in una
         griglia: due per riga col dito, l'ultimo in mezzo. Più grandi
         del nastro e facili da toccare, riempiono la schermata -->
    <ul
      class="
        clients-grid page-x flex-wrap justify-center
        gap-y-[clamp(20px,5vh,48px)]
      "
    >
      <li
        v-for="(c, i) in clients"
        :key="c.slug"
        class="
          flex justify-center
          max-screens:basis-1/2
        "
      >
        <button
          type="button"
          class="
            client-logo grid cursor-pointer place-items-center rounded-2xl p-2
            font-wide text-2xl leading-none font-bold tracking-[-0.03em]
            transition-opacity duration-300 [--logo-h:clamp(64px,21vw,110px)]
            focus-visible:outline-2 focus-visible:outline-ink
            screens:px-[clamp(16px,2.4vw,44px)]
            screens:[--logo-h:clamp(96px,min(12vw,18vh),160px)]
          "
          :class="{ 'is-current': currentKey === `g-${i}` }"
          :data-key="`g-${i}`"
          aria-haspopup="dialog"
          :aria-expanded="currentKey === `g-${i}`"
          @pointerenter="onEnter($event, c)"
          @pointerleave="leave"
          @click="onClick($event, c)"
        >
          <ClientLogo
            :logo="c.logo"
            :title="c.title"
          />
        </button>
      </li>
    </ul>
    </div>

    <PopoverContent
      v-if="current"
      tabindex="-1"
      side="bottom"
      :side-offset="2"
      :collision-padding="8"
      class="
        client-card z-40 w-[min(500px,calc(100vw-32px))] rounded-[28px]
        bg-paper-light px-6 py-5 text-ink
        drop-shadow-[0_10px_22px_rgb(22_20_18/0.3)]
        focus-visible:outline-none
      "
      @open-auto-focus="onOpenFocus"
      @interact-outside="onOutside"
      @pointerenter="stay"
      @pointerleave="leave"
    >
      <p
        v-if="current.role"
        class="text-label text-green"
      >
        {{ current.role }}
      </p>
      <h3 class="
        mt-1.5 font-wide text-[1.375rem] leading-[1.05] font-bold
        tracking-[-0.02em]
      ">
        {{ typeset(current.title) }}
      </h3>
      <p class="mt-2.5 text-[0.9375rem] leading-[1.45]">
        <span
          v-for="(part, i) in boldParts(typeset(current.did ?? current.summary))"
          :key="i"
          :class="{ 'font-semibold': part.bold }"
        >{{ part.text }}</span>
      </p>
      <a
        v-if="current.url"
        :href="current.url"
        target="_blank"
        rel="noopener"
        class="
          mt-3 inline-flex items-center gap-2 text-button text-green
          underline-offset-4
          hover:underline
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-ink
        "
      >
        {{ t('common.visit') }}
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        ><path d="M3 11 11 3M4.5 3H11v6.5" /></svg>
      </a>
      <PopoverArrow
        class="fill-paper-light"
        :width="22"
        :height="11"
      />
    </PopoverContent>
  </PopoverRoot>
</template>

<style scoped>
/* I bordi del nastro sfumano nel giallo invece di tagliare i loghi,
   uguali ai due lati: la schermata è in asse. Abbastanza larghi che i
   loghi si spengano passando sotto l'indice delle schermate (ScreenRail) */
.marquee {
  mask-image: linear-gradient(90deg, transparent 3%, #000 16%, #000 84%, transparent 97%);
}

.marquee-track {
  animation: marquee var(--duration, 32s) linear infinite;
}

.marquee.is-paused .marquee-track {
  animation-play-state: paused;
}

/* Gli altri loghi si fanno da parte mentre uno ha la dialog aperta */
.has-current .client-logo:not(.is-current) {
  opacity: 0.4;
}

/* Il nastro o la griglia: la griglia da telefono e con meno movimento */
.clients-grid {
  display: none;
}

@media (width < 53.75rem) {
  .marquee {
    display: none;
  }

  .clients-grid {
    display: flex;
  }
}

@keyframes marquee {
  to { transform: translateX(-50%); }
}

.client-card[data-state='open'] {
  animation: card-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: var(--reka-popover-content-transform-origin);
}

@keyframes card-in {
  from {
    opacity: 0;
    scale: 0.85;
  }
}

/* Con meno movimento il nastro lascia il posto alla griglia */
@media (prefers-reduced-motion: reduce) {
  .marquee {
    display: none;
  }

  .clients-grid {
    display: flex;
  }

  .client-card[data-state='open'] {
    animation: none;
  }
}
</style>
