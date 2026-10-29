<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import HomeBar from '~/components/HomeBar.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import StatusPill from '~/components/StatusPill.vue'
import { CONTACT_EMAIL } from '#shared/contact'
import type { ProductStatus } from '#shared/product'

// Home a schermate: una pila di schermate a tutto schermo, ognuna copre
// la precedente salendo dal basso (scroll nativo con lo snap). Apertura
// su carta, poi CityFix, Fanta Rainbow e Helllo con il loro video a
// tutto schermo, poi le card degli altri progetti (una riga di prodotti,
// una di clienti, e "Tutti i progetti") e la chiusura rossa. Niente nav
// né footer: la barra è HomeBar, i link legali stanno nella chiusura.
definePageMeta({ nav: 'home' })

const { t } = useI18n()
const localePath = useLocalePath()
const replaySplash = useSplashReplay()

useHead({ htmlAttrs: { class: 'home-snap' } })
useSeoMeta({
  title: 'Didap',
  description: t('home.seo_description'),
})

// I prodotti a tutto schermo. `light`: il video in alto è chiaro, la
// barra va in ink. Senza `url` il prodotto non è ancora uscito
type Featured = {
  key: string
  slug: string
  name: string
  url?: string
  status: ProductStatus
  light: boolean
}
const featured: Featured[] = [
  { key: 'cityfix', slug: 'cityfix', name: 'CityFix', url: 'https://cityfix.io', status: 'pilot', light: true },
  { key: 'fanta_rainbow', slug: 'fanta-rainbow', name: 'Fanta Rainbow', url: 'https://fantarainbow.com', status: 'live', light: false },
  { key: 'helllo', slug: 'helllo', name: 'Helllo', status: 'development', light: true },
]

const hero = (slug: string) => ({
  src: `/covers/${slug}-hero.mp4`,
  poster: `/covers/${slug}-hero-poster.webp`,
  srcMobile: `/covers/${slug}-hero-mobile.mp4`,
  posterMobile: `/covers/${slug}-hero-mobile-poster.webp`,
})

const host = (url: string) => new URL(url).hostname.replace(/^www\./, '')
const pad = (n: number) => String(n).padStart(2, '0')

// Le card: i due prodotti che non hanno la loro schermata più NX-TAB,
// il prodotto fatto per Sudel; sotto due clienti presi dalle loro schede
type Card = { to: string, name: string, kicker: string, image?: string }
const productCards = computed<Card[]>(() => [
  { to: localePath('/work/bin-or-deal'), name: 'Bin or Deal', kicker: t('home.products.bin_or_deal.category'), image: '/covers/splash-bin-or-deal-poster.webp' },
  { to: localePath('/work/cruciverba-lab'), name: 'Cruciverba Lab', kicker: t('home.products.cruciverba_lab.category'), image: '/covers/splash-cruciverba-lab-poster.webp' },
  { to: localePath('/clients/sudel'), name: 'NX-TAB', kicker: t('home.products.nx_tab.category'), image: '/covers/sudel.jpg' },
])

const CLIENTS = ['comune-di-brindisi', 'rotte-di-portolano']
const clientsCollection = useProjectCollection('clients')
const { data: clients } = await useAsyncData(
  () => `home-clients-${clientsCollection.value}`,
  () => queryCollection(clientsCollection.value).all(),
  { watch: [clientsCollection] },
)
const clientCards = computed<Card[]>(() =>
  CLIENTS.flatMap((slug) => {
    const c = clients.value?.find(p => p.stem.endsWith(`/${slug}`))
    return c ? [{ to: localePath(`/clients/${slug}`), name: c.title, kicker: c.role ?? '', image: c.cover }] : []
  }),
)

// Le schermate, per l'indice a destra e il colore della barra
const screens = computed(() => [
  { id: 'top', label: 'Didap', light: true },
  ...featured.map((p, i) => ({ id: i === 0 ? HOME_SECTIONS.products : p.slug, label: p.name, light: p.light })),
  { id: HOME_SECTIONS.projects, label: t('home.more_label'), light: true },
  { id: HOME_SECTIONS.contact, label: t('nav.contact'), light: false },
])

// La schermata in scena è quella che passa per la metà dello schermo,
// anche quando è più alta (le card su telefono)
const active = ref(0)
const motion = ref(false)
const root = ref<HTMLElement>()
let observer: IntersectionObserver | null = null
onMounted(() => {
  motion.value = !matchMedia('(prefers-reduced-motion: reduce)').matches
  const els = [...(root.value?.querySelectorAll<HTMLElement>('[data-screen]') ?? [])]
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) active.value = els.indexOf(e.target as HTMLElement)
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  )
  els.forEach(el => observer!.observe(el))
})
onBeforeUnmount(() => observer?.disconnect())

const [taglineStart, taglineEnd] = t('home.hero_tagline').split('\n')
const year = new Date().getFullYear()
</script>

<template>
  <div
    ref="root"
    :class="{ motion }"
  >
    <HomeBar
      :shown="active > 0"
      :light="screens[active]?.light ?? true"
      :solid="screens[active]?.id === HOME_SECTIONS.projects"
    />

    <nav
      :aria-label="t('home.index')"
      class="
        fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 transition-colors
        duration-500
        min-[860px]:block
        md:right-10
        xl:right-20
      "
      :class="screens[active]?.light ? 'text-ink' : 'text-paper-light'"
    >
      <ol class="flex flex-col gap-1">
        <li
          v-for="(s, i) in screens"
          :key="s.id"
        >
          <a
            :href="`#${s.id}`"
            class="
              group flex items-center justify-end gap-3 py-1.5 font-mono
              text-[11px] tracking-[0.06em] uppercase
            "
            :aria-current="i === active ? 'true' : undefined"
          >
            <span
              class="
                translate-x-1.5 whitespace-nowrap opacity-0 transition
                duration-300
                group-hover:translate-x-0 group-hover:opacity-100
                group-focus-visible:translate-x-0
                group-focus-visible:opacity-100
                group-aria-current:translate-x-0 group-aria-current:opacity-100
              "
            >{{ s.label }}</span>
            <span
              class="
                h-[1.5px] w-3.5 bg-current opacity-45 transition-all
                duration-400
                group-aria-current:w-8 group-aria-current:opacity-100
              "
              aria-hidden="true"
            />
          </a>
        </li>
      </ol>
    </nav>

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
          <h1
            class="reveal w-[min(100%,78vw,1100px)]"
            style="--i: 0"
          >
            <img
              src="/brand/logo-esteso.svg"
              alt="Didap"
              width="1278"
              height="367"
              class="block h-auto w-full"
            >
          </h1>
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
      class="screen bg-ink text-paper-light"
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
          class="screen-video absolute inset-0 size-full"
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
            <div
              class="
                reveal flex flex-wrap items-center gap-x-4 gap-y-2.5 text-label
              "
              style="--i: 0"
            >
              <span class="font-mono tracking-[0.04em] opacity-70">{{ pad(i + 1) }} / {{ pad(featured.length) }}</span>
              <span>{{ t(`home.products.${p.key}.category`) }}</span>
              <StatusPill
                :status="p.status"
                inverse
              >
                {{ t(`home.status_${p.status}`) }}
              </StatusPill>
            </div>
            <h2
              :id="`${p.slug}-name`"
              class="
                reveal font-wide text-[clamp(3rem,1.6rem+6.4vw,8.5rem)]
                leading-[0.88] font-bold tracking-[-0.035em]
              "
              style="--i: 1"
            >
              {{ p.name }}
            </h2>
            <p
              class="reveal text-body text-paper-light/88"
              style="--i: 2"
            >
              {{ t(`home.products.${p.key}.desc`) }}
            </p>
          </div>
          <div
            class="
              reveal flex flex-wrap items-center gap-x-[22px] gap-y-3.5
              min-[860px]:justify-end
            "
            style="--i: 3"
          >
            <NuxtLink
              :to="localePath(`/work/${p.slug}`)"
              class="
                border-b-[1.5px] border-paper-light/45 py-2.5 text-button
                transition-colors
                hover:border-paper-light
              "
            >
              {{ t('home.featured_more') }}
            </NuxtLink>
            <DidapButton
              v-if="p.url"
              :href="p.url"
              paper
            >
              {{ t('product.open', { host: host(p.url) }) }}
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              ><path d="M3 11 11 3M4.5 3H11v6.5" /></svg>
            </DidapButton>
            <DidapButton
              v-else
              :to="localePath({ path: '/contact', query: { product: p.name } })"
              paper
            >
              {{ t('product.notify') }}
            </DidapButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Gli altri progetti: una riga di prodotti, una di clienti -->
    <section
      :id="HOME_SECTIONS.projects"
      data-screen
      class="screen screen-tall bg-paper text-ink"
      :class="{ 'is-active': active === featured.length + 1 }"
      :style="{ zIndex: featured.length + 1 }"
      aria-labelledby="progetti-title"
    >
      <div
        class="
          screen-inner page-x flex h-full flex-col gap-5 pt-[72px] pb-8
          lg:pt-[97px]
        "
      >
        <h2
          id="progetti-title"
          class="reveal text-label text-green"
          style="--i: 0"
        >
          {{ t('home.more_label') }}
        </h2>
        <div
          v-for="(row, r) in [
            { label: t('home.more_products'), cards: productCards },
            { label: t('home.more_clients'), cards: clientCards },
          ]"
          :key="r"
          class="reveal flex min-h-0 flex-1 flex-col gap-3"
          :style="{ '--i': r + 1 }"
        >
          <h3 class="text-label opacity-60">
            {{ row.label }}
          </h3>
          <ul
            class="
              grid min-h-0 flex-1 gap-6
              sm:grid-cols-2
              md:grid-cols-3
            "
          >
            <li
              v-for="c in row.cards"
              :key="c.to"
              class="min-h-0"
            >
              <NuxtLink
                :to="c.to"
                class="group flex h-full flex-col gap-3"
              >
                <span class="
                  block aspect-16/10 overflow-hidden bg-ink
                  md:aspect-auto md:min-h-0 md:flex-1
                ">
                  <img
                    v-if="c.image"
                    :src="c.image"
                    alt=""
                    loading="lazy"
                    class="
                      size-full object-cover transition-transform duration-500
                      ease-vintage
                      group-hover:scale-[1.03]
                    "
                  >
                </span>
                <span class="flex flex-col gap-1">
                  <span class="text-label opacity-60">{{ c.kicker }}</span>
                  <span
                    class="
                      text-[clamp(1.25rem,1rem+0.8vw,1.75rem)] leading-[1.1]
                      font-bold transition-colors
                      group-hover:text-green
                    "
                  >{{ c.name }}</span>
                </span>
              </NuxtLink>
            </li>
            <li
              v-if="r === 1"
              class="min-h-0"
            >
              <NuxtLink
                :to="localePath('/work')"
                class="
                  group flex h-full min-h-40 flex-col justify-end gap-4 bg-green
                  p-6 text-paper-light transition-colors
                  hover:bg-ink
                "
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  aria-hidden="true"
                  class="
                    transition-transform duration-300 ease-vintage
                    group-hover:translate-x-1 group-hover:-translate-y-1
                  "
                ><path d="M3 11 11 3M4.5 3H11v6.5" /></svg>
                <span class="text-title">{{ t('home.all_projects') }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
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
          class="
            reveal font-wide text-[clamp(2.75rem,1.4rem+6vw,8rem)] leading-[0.9]
            font-bold tracking-[-0.035em] whitespace-pre-line
          "
          style="--i: 0"
        >
          {{ t('home.outro_title') }}
        </h2>
        <div
          class="reveal flex flex-wrap items-center gap-x-7 gap-y-[18px]"
          style="--i: 1"
        >
          <DidapButton
            :to="localePath('/contact')"
            paper
          >
            {{ t('nav.cta') }}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            ><path d="M3 11 11 3M4.5 3H11v6.5" /></svg>
          </DidapButton>
          <button
            type="button"
            class="
              border-b border-current py-1 font-mono text-xs tracking-[0.04em]
              uppercase opacity-75 transition-opacity
              hover:opacity-100
              focus-visible:outline-2 focus-visible:outline-offset-4
              focus-visible:outline-paper-light
            "
            @click="replaySplash++"
          >
            {{ t('home.replay') }}
          </button>
        </div>
        <div
          class="
            absolute inset-x-0 bottom-0 page-x flex flex-wrap gap-x-6 gap-y-2
            pb-[max(24px,env(safe-area-inset-bottom))] text-label opacity-75
          "
        >
          <span>© {{ year }} Didap</span>
          <a
            :href="`mailto:${CONTACT_EMAIL}`"
            class="
              normal-case
              hover:underline
            "
          >{{ CONTACT_EMAIL }}</a>
          <NuxtLink
            :to="localePath('/privacy')"
            class="hover:underline"
          >
            {{ t('footer.privacy') }}
          </NuxtLink>
          <NuxtLink
            :to="localePath('/cookies')"
            class="hover:underline"
          >
            {{ t('footer.cookies') }}
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Ogni schermata alta quanto lo schermo, si posa con lo snap. Le
   successive stanno sopra (z-index nel template) */
.screen {
  position: relative;
  height: 100svh;
  overflow: hidden;
  scroll-margin-top: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  view-timeline: --screen block;
}


.screen-inner {
  position: relative;
}

/* Le card su telefono non stanno in uno schermo: la schermata si allunga */
@media (width < 48rem) {
  .screen-tall {
    height: auto;
    min-height: 100svh;
  }
}

/* Il velo sotto il testo: sfocatura progressiva a strati, ognuno in
   una fascia che si sovrappone alle vicine, così cresce verso il basso
   senza un bordo. Leggera (al massimo 6px) e bassa: regge il testo
   senza spegnere il video. Sopra, uno scurimento con molte fermate */
.screen-veil {
  position: absolute;
  inset: auto 0 0;
  height: 56%;
  pointer-events: none;
}

.screen-veil i {
  position: absolute;
  inset: 0;
  backdrop-filter: blur(var(--b));
  mask-image: linear-gradient(to bottom, transparent var(--a), #000 var(--c), #000 var(--d), transparent var(--e));
}

.screen-veil i:nth-child(1) { --b: 0.25px; --a: 0%; --c: 12.5%; --d: 25%; --e: 37.5%; }
.screen-veil i:nth-child(2) { --b: 0.5px; --a: 12.5%; --c: 25%; --d: 37.5%; --e: 50%; }
.screen-veil i:nth-child(3) { --b: 1px; --a: 25%; --c: 37.5%; --d: 50%; --e: 62.5%; }
.screen-veil i:nth-child(4) { --b: 2px; --a: 37.5%; --c: 50%; --d: 62.5%; --e: 75%; }
.screen-veil i:nth-child(5) { --b: 3px; --a: 50%; --c: 62.5%; --d: 75%; --e: 87.5%; }
.screen-veil i:nth-child(6) { --b: 4.5px; --a: 62.5%; --c: 75%; --d: 87.5%; --e: 100%; }
.screen-veil i:nth-child(7) { --b: 6px; --a: 75%; --c: 87.5%; --d: 100%; --e: 100.1%; }

.screen-veil::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgb(22 20 18 / 0.74) 0%,
    rgb(22 20 18 / 0.68) 15%,
    rgb(22 20 18 / 0.57) 30%,
    rgb(22 20 18 / 0.43) 45%,
    rgb(22 20 18 / 0.28) 60%,
    rgb(22 20 18 / 0.14) 75%,
    rgb(22 20 18 / 0.05) 88%,
    rgb(22 20 18 / 0) 100%
  );
}

/* In verticale il video sta in alto intero, dietro il suo poster sfocato */
.screen-backdrop {
  display: none;
}

@media (max-aspect-ratio: 1/1) {
  .screen-backdrop {
    position: absolute;
    inset: -10%;
    display: block;
    width: 120%;
    height: 120%;
    object-fit: cover;
    filter: blur(40px) brightness(0.55) saturate(1.2);
  }

  .screen :deep(.screen-video) {
    inset: 14% auto auto 50%;
    width: 150%;
    height: auto;
    aspect-ratio: 5 / 3;
    translate: -50% 0;
  }

  .screen-veil {
    height: 64%;
  }
}

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

/* Il testo entra quando la schermata è in scena. Senza JavaScript, o
   con meno movimento, resta fermo e visibile */
.motion .reveal {
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity 0.9s var(--ease-vintage),
    transform 0.9s var(--ease-vintage);
  transition-delay: calc(var(--i, 0) * 90ms + 420ms);
}

.motion .is-active .reveal {
  opacity: 1;
  transform: none;
}

/* Legate allo scroll: chi esce sale più piano e si scurisce, così la
   successiva la copre; il video che entra si posa da un leggero zoom */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .screen-inner {
      animation: screen-leave linear both;
      animation-timeline: --screen;
      animation-range: exit;
    }

    .screen-inner::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 10;
      background: var(--color-ink);
      pointer-events: none;
      animation: screen-dim linear both;
      animation-timeline: --screen;
      animation-range: exit;
    }

    .screen :deep(.screen-video) {
      animation: screen-settle linear both;
      animation-timeline: --screen;
      animation-range: entry;
    }
  }
}

@keyframes screen-leave {
  to { transform: translateY(70%); }
}

@keyframes screen-dim {
  from { opacity: 0; }
  to { opacity: 0.7; }
}

@keyframes screen-settle {
  from { transform: scale(1.06); }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-cue::after {
    animation: none;
    opacity: 1;
  }
}
</style>
