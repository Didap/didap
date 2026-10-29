<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import DidiTalk from '~/components/DidiTalk.vue'
import HomeBar from '~/components/HomeBar.vue'
import HomeLogo from '~/components/HomeLogo.vue'
import ScreenLegal from '~/components/ScreenLegal.vue'
import ScreenRail from '~/components/ScreenRail.vue'
import MediaSlot from '~/components/MediaSlot.vue'

// Home a schermate: una pila di schermate a tutto schermo, ognuna copre
// la precedente salendo dal basso (scroll nativo con lo snap). Apertura
// su carta, poi CityFix, Fanta Rainbow e Helllo con il loro video a
// tutto schermo, poi Cruciverba Lab, poi le porte per le pagine dei
// prodotti e dei clienti e la chiusura rossa con Didi che chiede cosa
// serve. Niente nav né footer: la barra è HomeBar, i link legali stanno
// nella chiusura.
definePageMeta({ nav: 'screens' })

const { t } = useI18n()
const localePath = useLocalePath()
const { openContact } = useContactDialog()

useSeoMeta({
  title: 'Didap',
  description: t('home.seo_description'),
})

// I prodotti a tutto schermo. `light`: il video in alto è chiaro, la
// barra va in ink. L'unico invito porta alla scheda
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

const hero = (slug: string) => ({
  src: `/covers/${slug}-hero.mp4`,
  poster: `/covers/${slug}-hero-poster.webp`,
  srcMobile: `/covers/${slug}-hero-mobile.mp4`,
  posterMobile: `/covers/${slug}-hero-mobile-poster.webp`,
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
const screens = computed(() => [
  { id: 'top', label: 'Didap', light: true },
  ...featured.map((p, i) => ({ id: i === 0 ? HOME_SECTIONS.products : p.slug, label: p.name, light: p.light })),
  // Didi sta sul verde dei prodotti (sempre con l'alone), "Lavoriamo
  // insieme" e l'indice sul giallo dei clienti: testo ink, carta quando
  // i clienti diventano neri sotto il puntatore
  { id: HOME_SECTIONS.projects, label: t('nav.projects'), light: !clientsHover.value, glow: true },
  { id: HOME_SECTIONS.contact, label: t('nav.contact'), light: false },
])

// La schermata in scena e, con mouse e trackpad, la corsa morbida da
// una all'altra (composables/useScreens)
const { active, motion } = useScreens(root)

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
      :glow="screens[active]?.glow"
      :cta="active !== screens.length - 1"
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
      class="screen z-0 bg-paper text-ink"
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
          text-center
        ">
          <HomeLogo
            class="w-[min(100%,78vw,1100px)]"
          />
          <p
            class="
              reveal font-wide text-[clamp(1.75rem,1rem+3vw,3.5rem)]
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
            "
            aria-hidden="true"
          />
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
      :style="{ zIndex: i + 1 }"
      :aria-labelledby="`${p.slug}-name`"
    >
      <div class="screen-inner h-full">
        <img
          :src="hero(p.slug).posterMobile"
          alt=""
          class="screen-backdrop"
        >
        <MediaSlot
          :media="hero(p.slug)"
          class="screen-video screen-hero absolute inset-0 size-full"
        />
        <div
          v-if="!p.light"
          class="
            pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b
            from-ink/55 to-transparent
          "
        />
        <div
          class="screen-veil"
          aria-hidden="true"
        >
          <i
            v-for="n in 7"
            :key="n"
          />
        </div>
        <div
          class="
            absolute inset-x-0 bottom-0 z-2 page-x grid max-w-none items-end
            gap-x-12 gap-y-6
            pb-[max(clamp(28px,5vh,64px),env(safe-area-inset-bottom))]
            min-[860px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]
          "
        >
          <div class="
            grid min-w-0 gap-[18px] [text-shadow:0_1px_18px_rgb(22_20_18/0.4)]
          ">
            <h2
              :id="`${p.slug}-name`"
              class="
                reveal font-wide text-[clamp(2.25rem,1.4rem+2.6vw,4rem)]
                leading-[0.92] font-bold tracking-[-0.03em]
              "
              style="--i: 0"
            >
              {{ p.name }}
            </h2>
            <p
              class="reveal text-base/normal text-paper-light/88"
              style="--i: 1"
            >
              {{ t(`home.products.${p.key}.desc`) }}
            </p>
          </div>
          <div
            class="
              reveal flex flex-wrap items-center gap-x-[22px] gap-y-3.5
              min-[860px]:justify-end
            "
            style="--i: 2"
          >
            <DidapButton
              :to="localePath(`/work/${p.slug}`)"
              paper
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
          </div>
        </div>
      </div>
    </section>

    <!-- Le porte: tutti i prodotti, tutti i clienti -->
    <section
      :id="HOME_SECTIONS.projects"
      data-screen
      class="screen"
      :class="{ 'is-active': active === featured.length + 1 }"
      :style="{ zIndex: featured.length + 1 }"
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
          :class="d.tone"
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
      :style="{ zIndex: featured.length + 2 }"
      aria-labelledby="contatti-title"
    >
      <div class="screen-inner page-x grid h-full content-center gap-10 py-24">
        <h2
          id="contatti-title"
          class="sr-only"
        >
          {{ t('home.outro_title') }}
        </h2>
        <!-- Didi chiede cosa serve; il modulo si apre sopra, già compilato -->
        <DidiTalk
          class="reveal"
          style="--i: 0"
          tone="red"
          :hello="t('chat.ask')"
          @form="(type, message) => openContact('', type, message)"
        />
        <ScreenLegal />
      </div>
    </section>
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

@media (prefers-reduced-motion: reduce) {
  .scroll-cue::after {
    animation: none;
    opacity: 1;
  }
}
</style>
