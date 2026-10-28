<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import StatusPill from '~/components/StatusPill.vue'
import type { ProductStatus } from '#shared/product'

// Home - Figma "Home · Desktop 1440 · v0.1".
// Ogni sezione: filetto ink 1.5 in alto, 32 sopra, 136 sotto,
// colonna etichetta 302 + colonna testo 954 su 1280 utili.
const { t } = useI18n()
const localePath = useLocalePath()

// I quattro prodotti, ognuno con la sua splash animata (2:1, il centro
// regge anche il taglio delle card). In evidenza c'è sempre CityFix.
const products: {
  key: string
  slug: string
  name: string
  url: string
  status: ProductStatus
}[] = [
  {
    key: 'fanta_rainbow',
    slug: 'fanta-rainbow',
    name: 'Fanta Rainbow',
    url: 'https://fantarainbow.com',
    status: 'live',
  },
  {
    key: 'bin_or_deal',
    slug: 'bin-or-deal',
    name: 'Bin or Deal',
    url: 'https://www.binordeal.com',
    status: 'pending',
  },
  {
    key: 'cityfix',
    slug: 'cityfix',
    name: 'CityFix',
    url: 'https://cityfix.io',
    status: 'pilot',
  },
  {
    key: 'cruciverba_lab',
    slug: 'cruciverba-lab',
    name: 'Cruciverba Lab',
    url: 'https://cruciverba-lab.it',
    status: 'pending',
  },
]

const FEATURED = 'cityfix'
const featured = products.find((p) => p.key === FEATURED)!
const others = products.filter((p) => p.key !== FEATURED)

const splash = (p: (typeof products)[number]) => ({
  src: `/covers/splash-${p.slug}.mp4`,
  poster: `/covers/splash-${p.slug}-poster.webp`,
  alt: t(`home.products.${p.key}.alt`),
})

const host = (url: string) => new URL(url).hostname.replace(/^www\./, '')

const statusLabel = (s: ProductStatus) => t(`home.status_${s}`)

const facts = ['fullstack', 'outsourcing', 'design']

const partners = [
  { slug: 'comune-di-brindisi', name: 'Comune di Brindisi', type: 'institutional' },
  { slug: 'rotte-di-portolano', name: 'Le Rotte di Portolano', type: 'saas' },
  { slug: 'sudel', name: 'Sudel', type: 'app' },
  { slug: 'tmi', name: 'TMI', type: 'app' },
]

useSeoMeta({
  title: 'Didap',
  description: t('home.seo_description'),
})
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="page-x">
      <div
        class="
          flex flex-col gap-12 py-16
          lg:gap-24 lg:pt-[139px] lg:pb-[67px]
        "
      >
        <h1 class="m-0">
          <img
            src="/brand/logo-esteso.svg"
            alt="Didap"
            width="1278"
            height="367"
            class="block aspect-[559.4/160] w-full"
          >
        </h1>
        <div class="
          grid gap-6
          lg:grid-cols-2
        ">
          <p class="text-hero whitespace-pre-line">
            {{ t('home.hero_tagline') }}
          </p>
          <p class="text-body-medium">
            {{ t('home.hero_sub') }}
          </p>
        </div>
      </div>
    </section>

    <!-- PROd -->
    <section
      id="prodotti"
      class="page-x"
    >
      <div
        class="
          flex flex-col gap-16 border-t-[1.5px] border-ink pt-8 pb-24
          lg:pb-[136px]
        "
      >
        <header class="flex flex-col gap-7">
          <h2 class="text-title">
            {{ t('home.products_title') }}
          </h2>
          <p class="text-body">
            {{ t('home.products_intro') }}
          </p>
        </header>

        <!-- In evidenza: CityFix. Video e titolo aprono la
             scheda; il video è un doppione del titolo per il lettore di schermo. -->
        <article class="group flex flex-col gap-6">
          <NuxtLink
            :to="localePath(`/work/${featured.slug}`)"
            tabindex="-1"
            aria-hidden="true"
            class="block"
          >
            <MediaSlot
              :media="splash(featured)"
              class="
                aspect-2/1 w-full transition-opacity
                group-hover:opacity-90
              "
            />
          </NuxtLink>
          <div class="
            grid gap-6
            lg:grid-cols-[588fr_692fr] lg:gap-x-0
          ">
            <div class="flex flex-col gap-3.5">
              <div class="flex items-center gap-3">
                <span class="text-label opacity-60">
                  {{ t(`home.products.${featured.key}.category`) }}
                </span>
                <StatusPill :status="featured.status">
                  {{ statusLabel(featured.status) }}
                </StatusPill>
              </div>
              <h3 class="text-title">
                <NuxtLink
                  :to="localePath(`/work/${featured.slug}`)"
                  class="
                    transition-colors
                    hover:text-green
                  "
                >
                  {{ featured.name }}
                </NuxtLink>
              </h3>
            </div>
            <div class="flex flex-col gap-6">
              <p class="text-body">
                {{ t(`home.products.${featured.key}.desc`) }}
              </p>
              <div class="flex flex-wrap items-center gap-6">
                <DidapButton :href="featured.url">
                  {{ t('product.open', { host: host(featured.url) }) }}
                </DidapButton>
                <NuxtLink
                  :to="localePath(`/work/${featured.slug}`)"
                  class="
                    text-label underline transition-colors
                    hover:text-green
                  "
                >
                  {{ t('home.featured_more') }}
                </NuxtLink>
              </div>
            </div>
          </div>
        </article>

        <!-- Card prodotto -->
        <div class="
          grid gap-16
          md:grid-cols-3 md:gap-6
        ">
          <article
            v-for="p in others"
            :key="p.key"
            class="group flex flex-col gap-5"
          >
            <NuxtLink
              :to="localePath(`/work/${p.slug}`)"
              tabindex="-1"
              aria-hidden="true"
              class="block"
            >
              <MediaSlot
                :media="splash(p)"
                class="
                  aspect-[410.7/300] w-full transition-opacity
                  group-hover:opacity-90
                "
              />
            </NuxtLink>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <span class="text-label opacity-60">
                {{ t(`home.products.${p.key}.category`) }}
              </span>
              <StatusPill :status="p.status">
                {{ statusLabel(p.status) }}
              </StatusPill>
            </div>
            <h3 class="text-title">
              <NuxtLink
                :to="localePath(`/work/${p.slug}`)"
                class="
                  transition-colors
                  hover:text-green
                "
              >
                {{ p.name }}
              </NuxtLink>
            </h3>
            <p class="text-body">
              {{ t(`home.products.${p.key}.desc`) }}
            </p>
            <a
              :href="p.url"
              target="_blank"
              rel="noopener"
              class="
                self-start text-label underline transition-colors
                hover:text-green
              "
            >
              {{ t('home.open_product') }}
            </a>
          </article>
        </div>
      </div>
    </section>

    <!-- Come lavoriamo -->
    <section
      id="come-lavoriamo"
      class="page-x"
    >
      <div class="border-t-[1.5px] border-ink py-8">
        <div class="
          grid gap-6
          lg:grid-cols-[302fr_954fr]
        ">
          <div>
            <h2 class="text-label text-green">
              {{ t('home.how_label') }}
            </h2>
            <img
              src="/brand/didi-testa.svg"
              alt=""
              width="218"
              height="200"
              class="
                mt-8 hidden w-[218px]
                lg:mt-[52px] lg:ml-[42px] lg:block
              "
            >
          </div>
          <ul>
            <li
              v-for="(f, i) in facts"
              :key="f"
              class="
                grid gap-3
                md:grid-cols-[519fr_411fr] md:gap-6
              "
              :class="i === 0 ? 'pb-7' : 'border-t border-ink py-7'"
            >
              <h3 class="text-title whitespace-pre-line">
                {{ t(`home.how.${f}.title`) }}
              </h3>
              <p class="text-body">
                {{ t(`home.how.${f}.body`) }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Partner -->
    <section
      id="partner"
      class="page-x"
    >
      <div class="
        border-t-[1.5px] border-ink pt-8 pb-24
        lg:pb-[136px]
      ">
        <div class="
          grid gap-6
          lg:grid-cols-[302fr_954fr]
        ">
          <h2 class="text-label text-green">
            {{ t('home.partners_label') }}
          </h2>
          <ul>
            <li
              v-for="(p, i) in partners"
              :key="p.slug"
              :class="i === 0 ? 'pb-6' : 'border-t border-ink py-6'"
            >
              <NuxtLink
                :to="localePath(`/clients/${p.slug}`)"
                class="group flex items-center justify-between gap-6"
              >
                <span class="
                  text-title transition-colors
                  group-hover:text-green
                ">
                  {{ p.name }}
                </span>
                <span class="shrink-0 text-right text-label opacity-60">
                  {{ t(`home.partner_types.${p.type}`) }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Contatto -->
    <section
      id="contatti"
      class="page-x"
    >
      <div
        class="
          flex flex-col gap-12 border-t-[1.5px] border-ink pt-8 pb-24
          lg:pb-[120px]
        "
      >
        <h2 class="text-display">
          {{ t('home.contact_title') }}
        </h2>
        <div class="flex flex-wrap items-center gap-6">
          <DidapButton :to="localePath('/contact')">
            {{ t('home.contact_cta') }}
          </DidapButton>
          <a
            href="mailto:amministrazione@didap.it"
            class="
              text-body transition-colors
              hover:text-green
            "
          >
            amministrazione@didap.it
          </a>
        </div>
        <div class="
          grid gap-6
          lg:grid-cols-[302fr_954fr]
        ">
          <h3 class="text-label text-green">
            {{ t('home.qube_label') }}
          </h3>
          <div class="flex flex-col gap-7">
            <p class="text-title">
              {{ t('home.qube_title') }}
            </p>
            <p class="text-body">
              {{ t('home.qube_body') }}
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
