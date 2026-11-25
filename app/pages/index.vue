<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import DidiTalk from '~/components/DidiTalk.vue'
import HomeBar from '~/components/HomeBar.vue'
import HomeDock from '~/components/HomeDock.vue'
import HomeLogo from '~/components/HomeLogo.vue'
import ScreenLegal from '~/components/ScreenLegal.vue'
import ScreenRail from '~/components/ScreenRail.vue'
import ScreenHero from '~/components/ScreenHero.vue'
import type { ProjectType } from '#shared/contact'

// Home a schermate: una pila di schermate a tutto schermo, ognuna copre
// la precedente salendo dal basso (scroll nativo con lo snap). Apertura
// su carta, poi CityFix, Fanta Rainbow e Helllo con il loro video a
// tutto schermo, poi Cruciverba Lab, poi le porte per le pagine dei
// prodotti e dei clienti e la chiusura rossa con Didi che chiede cosa
// serve. Niente nav né footer: la barra è HomeBar, i link legali stanno
// nella chiusura.
// La splash non serve: la stessa animazione gira nel logo dell'apertura
definePageMeta({ layout: 'screens', splash: false })

const { t } = useI18n()
const localePath = useLocalePath()
// Il modulo della chiusura: un foglio dal basso, con quello già scelto o
// scritto a Didi. Si carica alla prima apertura e poi resta, così
// chiudendosi finisce la sua animazione
const drawer = reactive({ mounted: false, open: false, type: '' as ProjectType | '', message: '' })
function openDrawer(type: ProjectType | '', message: string) {
  Object.assign(drawer, { mounted: true, open: true, type, message })
}

useSeoMeta({
  title: 'Didap',
  description: t('home.seo_description'),
})

// I prodotti a tutto schermo. `light`: il video è chiaro, la barra va
// in ink (anche da telefono, dove il video è verticale). L'unico invito
// porta alla scheda. Il marchio del prodotto (`<slug>-wordmark.svg`) sta
// sopra il video: i video della home non ce l'hanno dentro
type Featured = {
  key: string
  slug: string
  name: string
  light: boolean
}
const featured: Featured[] = [
  { key: 'cityfix', slug: 'cityfix', name: 'CityFix', light: true },
  { key: 'fanta_rainbow', slug: 'fanta-rainbow', name: 'Fanta Rainbow', light: false },
  { key: 'helllo', slug: 'helllo', name: 'Helllo', light: true },
  { key: 'cruciverba_lab', slug: 'cruciverba-lab', name: 'Cruciverba Lab', light: true },
]

// I video della home sono suoi (media/<slug>/home e home-mobile): senza
// il logo, che il sito mette sopra, e con i bordi liberi per la barra,
// la didascalia e l'indice. Le schede prodotto tengono i video `hero`
const hero = (slug: string) => ({
  src: `/covers/${slug}-home.mp4`,
  poster: `/covers/${slug}-home-poster.webp`,
  srcMobile: `/covers/${slug}-home-mobile.mp4`,
  posterMobile: `/covers/${slug}-home-mobile-poster.webp`,
})


// L'ultima schermata porta alle pagine dei prodotti e dei clienti, con
// i nomi di tutti presi dalle loro schede
const workCollection = useProjectCollection('work')
const clientsCollection = useProjectCollection('clients')
const { data: names } = await useAsyncData(
  () => `home-names-${workCollection.value}`,
  async () => {
    const [work, clients] = await Promise.all([
      queryCollection(workCollection.value).order('order', 'ASC').select('title').all(),
      queryCollection(clientsCollection.value).order('order', 'ASC').select('title').all(),
    ])
    return { work: work.map(p => p.title), clients: clients.map(p => p.title) }
  },
  { watch: [workCollection] },
)
const indexes = computed(() => [
  { to: localePath('/work'), label: t('home.more_products'), names: names.value?.work ?? [], tone: 'bg-green text-paper-light hover:bg-ink' },
  { to: localePath('/clients'), label: t('home.more_clients'), names: names.value?.clients ?? [], tone: 'bg-banana text-ink hover:bg-ink hover:text-paper-light' },
])

const root = ref<HTMLElement>()
const clientsHover = ref(false)

// Le schermate, per l'indice a destra e il colore della barra
// `product`: le schermate dei prodotti, con il video (la barra ha una
// sfumatura sua, dello stesso tono) e la descrizione nella barra in basso
// su telefono. `dock`: lì c'è la barra in basso
type Screen = { id: string, label: string, light: boolean, product?: Featured, dock?: boolean }
const screens = computed<Screen[]>(() => [
  { id: 'top', label: 'Didap', light: true },
  ...featured.map((p, i) => ({ id: i === 0 ? HOME_SECTIONS.products : p.slug, label: p.name, light: p.light, product: p, dock: true })),
  // Didi (adesivo) sta sul verde dei prodotti, "Lavoriamo insieme" e
  // l'indice sul giallo dei clienti: testo ink, carta quando i clienti
  // diventano neri sotto il puntatore
  { id: HOME_SECTIONS.projects, label: t('nav.projects'), light: !clientsHover.value, dock: true },
  // Nella chiusura la chat con Didi è già a tutto schermo: niente barra
  { id: HOME_SECTIONS.contact, label: t('nav.contact'), light: false },
])

// La schermata in scena e, con mouse e trackpad, la corsa morbida da
// una all'altra (composables/useScreens)
const { active, motion } = useScreens(root)

// La barra in basso su telefono: Didi e "Hai un progetto?" dove la
// schermata la vuole, la nuvoletta con la descrizione sui prodotti
const dockShown = computed(() => !!screens.value[active.value]?.dock)
const dockProduct = computed(() => screens.value[active.value]?.product)

// La sfumatura della barra, solo sui video
const surface = computed(() => {
  const s = screens.value[active.value]
  if (!s?.product) return undefined
  return s.light ? 'light' : 'dark'
})

const [taglineStart, taglineEnd] = t('home.hero_tagline').split('\n')

// Didi annuisce mentre pensa, anche nella chat della chiusura da telefono
const { thinking: chatThinking } = useDidiChat()

// Da telefono, arrivando alla chiusura da una schermata con la barra in
// basso, Didi non sparisce: quello della barra si nasconde e quello della
// chiusura parte dal suo posto e scivola sotto la chat (FLIP). Da
// desktop la barra non c'è e non succede niente; con meno movimento
// nemmeno
const closingDidi = ref<HTMLImageElement>()
watch(active, (now, before) => {
  if (now !== screens.value.length - 1 || !screens.value[before]?.dock) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const dock = document.querySelector<HTMLElement>('[data-dock-didi]')
  const from = dock?.getBoundingClientRect()
  if (!dock || !from?.width) return
  dock.style.visibility = 'hidden'
  nextTick(() => {
    const el = closingDidi.value
    if (!el) return
    const to = el.getBoundingClientRect()
    el.animate(
      [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` }, { transform: 'none' }],
      { duration: 650, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    ).finished.finally(() => dock.style.removeProperty('visibility'))
  })
}, { flush: 'pre' })
</script>

<template>
  <div
    ref="root"
    :class="{ motion }"
  >
    <HomeBar
      :shown="active > 0"
      :light="screens[active]?.light ?? true"
      :surface="surface"
      :cta="active !== screens.length - 1"
    />

    <HomeDock
      :shown="dockShown"
      :line="dockProduct ? t(`home.products.${dockProduct.key}.desc`) : undefined"
      :to="dockProduct ? localePath(`/work/${dockProduct.slug}`) : undefined"
      :label="dockProduct ? `${t('home.featured_more')}: ${dockProduct.name}` : undefined"
      @form="openDrawer"
    />

    <ScreenRail
      :label="t('home.index')"
      :screens="screens"
      :active="active"
    />

    <!-- Apertura -->
    <section
      id="top"
      data-screen
      class="screen bg-paper text-ink"
      :class="{ 'is-active': active === 0 }"
    >
      <div
        class="
          screen-inner page-x grid h-full grid-rows-[1fr_auto] pt-24
          pb-[max(28px,env(safe-area-inset-bottom))]
        "
      >
        <div class="
          grid place-items-center gap-[clamp(20px,3vw,40px)] self-center
        ">
          <HomeLogo
            class="w-[min(100%,78vw,1100px)]"
          />
          <p
            class="
              reveal text-center font-wide text-[clamp(1.75rem,1rem+3vw,3.5rem)]
              leading-none font-bold tracking-[-0.02em]
            "
            style="--i: 1"
          >
            {{ taglineStart }} <span class="text-red">{{ taglineEnd }}</span>
          </p>
        </div>
        <a
          :href="`#${HOME_SECTIONS.products}`"
          class="
            reveal grid justify-items-center gap-3.5 justify-self-center
            rounded-lg px-3 py-2 text-button
            focus-visible:outline-2 focus-visible:outline-offset-4
            focus-visible:outline-ink
          "
          style="--i: 3"
        >
          <span
            class="
              scroll-cue relative h-[42px] w-[26px] rounded-full border-[1.5px]
              border-current
              pointer-coarse:hidden
            "
            aria-hidden="true"
          />
          <!-- Col dito niente rotella: una freccia che scende -->
          <svg
            width="26"
            height="42"
            viewBox="0 0 26 42"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="
              scroll-arrow hidden
              pointer-coarse:block
            "
          ><path d="M13 6v28M5 26l8 8 8-8" /></svg>
          {{ t('home.scroll_cue') }}
        </a>
      </div>
    </section>

    <!-- I prodotti a tutto schermo -->
    <section
      v-for="(p, i) in featured"
      :id="screens[i + 1]!.id"
      :key="p.key"
      data-screen
      class="screen screen-dims bg-ink text-paper-light"
      :class="{ 'is-active': active === i + 1 }"
      :aria-labelledby="`${p.slug}-name`"
    >
      <ScreenHero
        :media="hero(p.slug)"
        :title="p.name"
        :text="t(`home.products.${p.key}.desc`)"
        :title-id="`${p.slug}-name`"
        :light="p.light"
        :logo="`/covers/${p.slug}-wordmark.svg`"
      >
        <DidapButton
          :to="localePath(`/work/${p.slug}`)"
          :paper="!p.light"
          :ink="p.light"
        >
          {{ t('home.featured_more') }}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          ><path d="M2 7h10M7.5 2.5 12 7l-4.5 4.5" /></svg>
        </DidapButton>
      </ScreenHero>
    </section>

    <!-- Le porte: tutti i prodotti, tutti i clienti -->
    <section
      :id="HOME_SECTIONS.projects"
      data-screen
      class="screen"
      :class="{ 'is-active': active === featured.length + 1 }"
      :aria-label="t('nav.projects')"
    >
      <div
        class="
          screen-inner grid h-full grid-rows-2
          md:grid-cols-2 md:grid-rows-1
        "
      >
        <NuxtLink
          v-for="(d, i) in indexes"
          :key="d.to"
          :to="d.to"
          class="
            group flex min-h-0 flex-col justify-end gap-[clamp(16px,3vh,32px)]
            px-5 pt-[72px] pb-[max(28px,env(safe-area-inset-bottom))]
            transition-colors duration-500
            md:px-10 md:pb-16
            lg:pt-[97px]
            xl:px-20
          "
          :class="[
            d.tone,
            // Su telefono i clienti stanno in fondo: lo spazio per la barra
            // di Didi (HomeDock), se no ne coprirebbe i nomi
            i === 1 ? `max-screens:pb-(--dock-space)` : '',
          ]"
          @mouseenter="clientsHover = i === 1"
          @mouseleave="clientsHover = false"
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            aria-hidden="true"
            class="
              reveal transition-transform duration-300 ease-vintage
              group-hover:translate-x-1.5 group-hover:-translate-y-1.5
            "
            :style="{ '--i': i * 2 }"
          ><path d="M3 11 11 3M4.5 3H11v6.5" /></svg>
          <h2
            class="
              reveal font-wide text-[clamp(2.75rem,1.4rem+5vw,7rem)]
              leading-[0.9] font-bold tracking-[-0.035em]
            "
            :style="{ '--i': i * 2 }"
          >
            {{ d.label }}
          </h2>
          <ul
            class="reveal flex flex-wrap gap-x-5 gap-y-1 text-body opacity-80"
            :style="{ '--i': i * 2 + 1 }"
          >
            <li
              v-for="n in d.names"
              :key="n"
            >
              {{ n }}
            </li>
          </ul>
        </NuxtLink>
      </div>
    </section>

    <!-- Chiusura -->
    <section
      :id="HOME_SECTIONS.contact"
      data-screen
      class="screen bg-red text-paper-light"
      :class="{ 'is-active': active === screens.length - 1 }"
      aria-labelledby="contatti-title"
    >
      <div class="screen-inner page-x grid h-full content-center gap-10 py-24">
        <h2
          id="contatti-title"
          class="sr-only"
        >
          {{ t('home.outro_title') }}
        </h2>
        <!-- Didi chiede cosa serve; il modulo sale dal basso, già compilato.
             Da telefono la chat è quella della nuvoletta in basso
             (DidiChatPanel), sotto "Lavoriamo insieme": la conversazione è
             la stessa (useDidiChat) -->
        <DidiTalk
          class="
            reveal
            max-md:hidden
          "
          style="--i: 0"
          tone="red"
          direct
          :hello="t('chat.ask')"
          @form="openDrawer"
        />
        <div class="
          flex flex-col gap-6
          md:hidden
        ">
          <p
            class="
              reveal font-wide text-[clamp(2.5rem,11vw,3.25rem)] leading-[0.92]
              font-bold tracking-[-0.03em]
            "
            style="--i: 0"
            aria-hidden="true"
          >
            {{ t('nav.cta') }}
          </p>
          <div class="flex flex-col items-start gap-3">
            <!-- La nuvoletta crema con la coda, come in HomeDock: forma e
                 ombra su uno strato loro, la chat sopra -->
            <div
              class="reveal relative w-full text-ink"
              style="--i: 1"
            >
              <div
                class="
                  absolute inset-0 drop-shadow-[0_10px_22px_rgb(22_20_18/0.3)]
                "
                aria-hidden="true"
              >
                <div class="absolute inset-0 rounded-[38px] bg-paper-light" />
                <DidiTail />
              </div>
              <DidiChatPanel
                class="relative max-h-[52svh]"
                @form="openDrawer"
              />
            </div>
            <!-- Didi arriva qui dalla barra in basso (vedi closingDidi): fuori
                 dall'entrata del testo, se no viaggerebbe trasparente -->
            <img
              ref="closingDidi"
              src="/brand/didi-testa-sticker.svg"
              alt=""
              width="240"
              height="222"
              class="
                relative z-1 h-[62px] w-auto origin-bottom
                drop-shadow-[0_6px_14px_rgb(22_20_18/0.35)]
              "
              :class="chatThinking ? 'dock-speaking' : ''"
            >
          </div>
        </div>
        <ScreenLegal />
      </div>
    </section>

    <LazyContactDrawer
      v-if="drawer.mounted"
      v-model:open="drawer.open"
      :project-type="drawer.type"
      :message="drawer.message"
    />
  </div>
</template>

<style scoped>
/* L'invito a scorrere: la rotella del mouse che scende */
.scroll-cue::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  width: 4px;
  height: 8px;
  margin-left: -2px;
  border-radius: 2px;
  background: var(--color-red);
  animation: wheel 1.8s var(--ease-vintage) infinite;
}

@keyframes wheel {
  0% { opacity: 0; transform: translateY(0); }
  20% { opacity: 1; }
  70% { opacity: 0; transform: translateY(14px); }
  100% { opacity: 0; }
}

/* Su touch la freccia scende piano, con lo stesso passo della rotella */
.scroll-arrow {
  animation: arrow 1.8s var(--ease-vintage) infinite;
}

@keyframes arrow {
  0%, 100% { transform: translateY(-3px); }
  50% { transform: translateY(3px); }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-cue::after,
  .scroll-arrow {
    animation: none;
    opacity: 1;
  }
}
</style>
