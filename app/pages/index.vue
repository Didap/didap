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
// porta alla scheda. `logo`: il marchio del prodotto, che sta
// sopra il video (i video della home non ce l'hanno dentro)
type Featured = {
  key: string
  slug: string
  name: string
  light: boolean
  logo: string
}
const featured: Featured[] = [
  { key: 'cityfix', slug: 'cityfix', name: 'CityFix', light: true, logo: '/covers/cityfix-wordmark.svg' },
  { key: 'fanta_rainbow', slug: 'fanta-rainbow', name: 'Fanta Rainbow', light: false, logo: '/covers/fanta-rainbow-wordmark.svg' },
  { key: 'helllo', slug: 'helllo', name: 'Helllo', light: true, logo: '/covers/helllo-wordmark.svg' },
  { key: 'cruciverba_lab', slug: 'cruciverba-lab', name: 'Cruciverba Lab', light: true, logo: '/covers/cruciverba-lab-wordmark.svg' },
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
type Screen = { id: string, label: string, light: boolean, video?: boolean }
const screens = computed<Screen[]>(() => [
  { id: 'top', label: 'Didap', light: true },
  // Sui video la barra ha una sfumatura sua (`video`), dello stesso tono
  ...featured.map((p, i) => ({ id: i === 0 ? HOME_SECTIONS.products : p.slug, label: p.name, light: p.light, video: true })),
  // Didi (adesivo) sta sul verde dei prodotti, "Lavoriamo insieme" e
  // l'indice sul giallo dei clienti: testo ink, carta quando i clienti
  // diventano neri sotto il puntatore
  { id: HOME_SECTIONS.projects, label: t('nav.projects'), light: !clientsHover.value },
  { id: HOME_SECTIONS.contact, label: t('nav.contact'), light: false },
])

// La schermata in scena e, con mouse e trackpad, la corsa morbida da
// una all'altra (composables/useScreens)
const { active, motion } = useScreens(root)

// La barra in basso su telefono: Didi e "Hai un progetto?" su tutte
// le schermate dopo l'apertura, tranne la chiusura rossa, dove la chat
// con Didi è già a tutto schermo. La nuvoletta con la descrizione solo
// sui prodotti
const dockShown = computed(() => active.value > 0 && active.value < screens.value.length - 1)
const dockProduct = computed(() => featured[active.value - 1])

// La sfumatura della barra, solo sui video
const surface = computed(() => {
  const s = screens.value[active.value]
  if (!s?.video) return undefined
  return s.light ? 'light' : 'dark'
})

const [taglineStart, taglineEnd] = t('home.hero_tagline').split('\n')
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
        :light="screens[i + 1]!.light"
        :logo="p.logo"
      >
        <DidapButton
          :to="localePath(`/work/${p.slug}`)"
          :paper="!screens[i + 1]!.light"
          :ink="screens[i + 1]!.light"
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
            i === 1 ? `
              max-[859px]:pb-[calc(max(16px,env(safe-area-inset-bottom))+88px)]
            ` : '',
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
        <!-- Didi chiede cosa serve; il modulo sale dal basso, già compilato -->
        <DidiTalk
          class="reveal"
          style="--i: 0"
          tone="red"
          direct
          :hello="t('chat.ask')"
          @form="openDrawer"
        />
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
