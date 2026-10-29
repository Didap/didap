<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import { CONTACT_EMAIL, CONTACT_WHATSAPP, PROJECT_TYPES, mailtoHref, whatsappHref } from '#shared/contact'
import { untypeset } from '#shared/typeset'

// Didi lascia la nav: passato lo schermo e qualcosa di pagina salta in
// basso a destra con un arco, chiede cosa serve e porta al contatto
// diretto, WhatsApp se c'è il numero e sempre la mail già scritta.
// "Torna al tuo posto" la fa rotolare fuori a destra e ricadere nella
// nav dall'alto (AppHeader). Congedata, non torna fino alla prossima
// visita. Con meno movimento compare e se ne va senza volare.

// Le voci del modulo e in più due chiacchiere
const TOPICS = [...PROJECT_TYPES, 'chat'] as const
type Topic = (typeof TOPICS)[number]
const topicLabel = (k: Topic) => t(k === 'chat' ? 'didi.chat' : `contact.form.option_${k}`)

const { t } = useI18n()
const didi = useDidi()
const { openContact } = useContactDialog()
const route = useRoute()
const routeBaseName = useRouteBaseName()

const KEY = 'didap-didi'
// Quanto si scorre prima che arrivi, in altezze di schermo
const TRIGGER = 1.2

const shown = ref(false)
const open = ref(false)
const topic = ref<Topic | null>(null)
const busy = ref(false)

const dock = ref<HTMLElement>()
const flyX = ref<HTMLElement>()
const flyY = ref<HTMLElement>()
const toggler = ref<HTMLButtonElement>()

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Il testo tradotto passa da typeset(): nei link va con gli spazi normali
const message = computed(() => (topic.value ? untypeset(t(`didi.message.${topic.value}`)) : ''))
const mailto = computed(() =>
  mailtoHref(CONTACT_EMAIL, untypeset(t('didi.subject', { topic: topicLabel(topic.value!) })), message.value),
)
const whatsapp = computed(() => (CONTACT_WHATSAPP ? whatsappHref(CONTACT_WHATSAPP, message.value) : ''))

async function arrive() {
  busy.value = true
  const from = document.querySelector('[data-didi-home]')?.getBoundingClientRect()
  shown.value = true
  didi.value = 'away'
  await nextTick()
  if (from?.width && flyX.value && flyY.value && !still()) {
    // Il salto: in orizzontale va quasi costante, in verticale prima
    // sale un poco e poi cade, così disegna un arco
    const to = flyY.value.getBoundingClientRect()
    const dx = from.left + from.width / 2 - (to.left + to.width / 2)
    const dy = from.top + from.height / 2 - (to.top + to.height / 2)
    const s = from.width / to.width
    const duration = 1050
    flyX.value.animate(
      [{ transform: `translateX(${dx}px)` }, { transform: 'none' }],
      { duration, easing: 'cubic-bezier(0.4, 0, 0.6, 1)' },
    )
    await flyY.value.animate(
      [
        { transform: `translateY(${dy}px) scale(${s})`, easing: 'cubic-bezier(0.25, 0.6, 0.45, 1)' },
        { transform: `translateY(${dy - 20}px) scale(${s * 1.1}) rotate(-12deg)`, offset: 0.25, easing: 'cubic-bezier(0.55, 0, 0.85, 0.45)' },
        { transform: 'rotate(8deg)' },
      ],
      { duration },
    ).finished
    // L'atterraggio: si schiaccia e si raddrizza
    await flyY.value.animate(
      [
        { transform: 'rotate(8deg) scale(1.12, 0.86)' },
        { transform: 'scale(0.96, 1.04)', offset: 0.5 },
        { transform: 'none' },
      ],
      { duration: 380, easing: 'ease-out' },
    ).finished
  }
  open.value = true
  busy.value = false
}

async function goHome() {
  if (busy.value) return
  busy.value = true
  try {
    sessionStorage.setItem(KEY, '1')
  }
  catch {}
  // Chi era con la tastiera dentro la nuvoletta riparte dalla nav
  const focused = dock.value?.contains(document.activeElement)
  if (dock.value && flyY.value && !still()) {
    // Rotola fuori a destra: un passo indietro e via, sempre più veloce.
    // È tonda, quindi gira quanto strada fa
    const distance = window.innerWidth - dock.value.getBoundingClientRect().left + 24
    const size = flyY.value.offsetWidth
    const turn = (px: number) => `rotate(${(px / (Math.PI * size)) * 360}deg)`
    const step = { offset: 0.2, easing: 'cubic-bezier(0.5, 0, 0.8, 0.4)' }
    const opts: KeyframeAnimationOptions = { duration: 650, fill: 'forwards' }
    flyY.value.animate(
      [{ transform: 'none', easing: 'ease-out' }, { ...step, transform: turn(-12) }, { transform: turn(distance) }],
      opts,
    )
    await dock.value.animate(
      [{ transform: 'none', easing: 'ease-out' }, { ...step, transform: 'translateX(-12px)' }, { transform: `translateX(${distance}px)` }],
      opts,
    ).finished
  }
  shown.value = false
  open.value = false
  topic.value = null
  didi.value = 'back'
  busy.value = false
  if (!focused) return
  await nextTick()
  document.querySelector<HTMLElement>('[data-didi-link]')?.focus()
}

function toggle() {
  if (!busy.value) open.value = !open.value
}

// Il modulo parte con la voce già scelta
function openForm() {
  open.value = false
  openContact('', topic.value === 'chat' ? '' : topic.value ?? '')
}

function fold() {
  if (!open.value) return
  open.value = false
  toggler.value?.focus()
}

function onScroll() {
  if (window.scrollY < window.innerHeight * TRIGGER) return
  // Non sopra la splash e non sulla pagina del modulo, che è già il contatto
  if (document.documentElement.classList.contains('splash') || routeBaseName(route) === 'contact') return
  window.removeEventListener('scroll', onScroll)
  arrive()
}

onMounted(() => {
  try {
    if (sessionStorage.getItem(KEY)) return
  }
  catch {}
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  // Uscendo dal layout (verso /admin) Didi torna al suo posto
  if (didi.value === 'away') didi.value = 'home'
})
</script>

<template>
  <aside
    v-if="shown"
    ref="dock"
    class="
      fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-45 flex
      flex-col items-end gap-4
      md:right-10 md:bottom-[max(2.5rem,env(safe-area-inset-bottom))]
    "
    :aria-label="t('didi.label')"
    @keydown.esc="fold"
  >
    <Transition
      enter-active-class="transition duration-300 ease-vintage"
      enter-from-class="translate-y-2 scale-90 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-2 scale-95 opacity-0"
    >
      <div
        v-if="open"
        id="didi-bubble"
        class="
          relative w-[min(22rem,calc(100vw-2rem))] origin-bottom-right
          rounded-3xl border-[1.5px] border-ink bg-paper-light p-5
          shadow-[0_12px_32px_-12px_rgb(22_20_18/0.35)]
        "
      >
        <div aria-live="polite">
          <template v-if="!topic">
            <p class="pr-8 text-body-medium">
              {{ t('didi.hello') }}
            </p>
            <ul class="mt-4 flex flex-wrap gap-2">
              <li
                v-for="k in TOPICS"
                :key="k"
              >
                <button
                  type="button"
                  class="
                    rounded-full border-[1.5px] border-ink px-4 py-2 text-label
                    transition-colors
                    hover:bg-ink hover:text-paper-light
                    focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-ink
                  "
                  @click="topic = k"
                >
                  {{ topicLabel(k) }}
                </button>
              </li>
            </ul>
          </template>
          <template v-else>
            <p class="pr-8 text-body-medium">
              {{ t(topic === 'grant' ? 'didi.reply_grant' : 'didi.reply') }}
            </p>
            <div class="mt-4 flex flex-col items-start gap-3">
              <DidapButton
                v-if="whatsapp"
                :href="whatsapp"
              >
                {{ t('didi.whatsapp') }}
              </DidapButton>
              <a
                v-if="whatsapp"
                :href="mailto"
                class="
                  text-body underline underline-offset-4 transition-colors
                  hover:text-green
                "
              >{{ t('didi.email') }}</a>
              <DidapButton
                v-else
                :href="mailto"
              >
                {{ t('didi.email') }}
              </DidapButton>
              <p class="text-body">
                <button
                  type="button"
                  class="
                    underline underline-offset-4 transition-colors
                    hover:text-green
                  "
                  @click="openForm"
                >
                  {{ t('didi.form') }}
                </button>
              </p>
              <button
                type="button"
                class="
                  text-label opacity-60 transition-opacity
                  hover:opacity-100
                "
                @click="topic = null"
              >
                {{ t('didi.change') }}
              </button>
            </div>
          </template>
        </div>

        <button
          type="button"
          class="
            absolute top-4 right-4 flex size-8 items-center justify-center
            rounded-full transition-colors
            hover:bg-ink hover:text-paper-light
            focus-visible:outline-2 focus-visible:outline-ink
          "
          :aria-label="t('didi.dismiss')"
          :title="t('didi.dismiss')"
          @click="goHome"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 5l10 10M15 5 5 15"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
        </button>

        <span
          class="
            absolute right-6 bottom-[-9px] size-4 rotate-45 border-r-[1.5px]
            border-b-[1.5px] border-ink bg-paper-light
            md:right-8
          "
          aria-hidden="true"
        />
      </div>
    </Transition>

    <button
      ref="toggler"
      type="button"
      class="
        group -m-1 rounded-full p-1
        focus-visible:outline-2 focus-visible:outline-ink
      "
      :aria-expanded="open"
      aria-controls="didi-bubble"
      :aria-label="open ? t('didi.close') : t('didi.open')"
      @click="toggle"
    >
      <span
        ref="flyX"
        class="block"
      >
        <span
          ref="flyY"
          class="
            block w-14
            md:w-16
          "
        >
          <img
            src="/brand/didi-testa.svg"
            alt=""
            width="218"
            height="200"
            class="
              w-full drop-shadow-[0_6px_10px_rgb(22_20_18/0.22)]
              transition-transform duration-300 ease-vintage
              group-hover:-rotate-8
            "
          >
        </span>
      </span>
    </button>
  </aside>
</template>
