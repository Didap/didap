<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import StatusPill from '~/components/StatusPill.vue'
import type { ProductStatus } from '~/components/StatusPill.vue'

// Home - Figma "Home · Desktop 1440 · v0.1".
// Ogni sezione: filetto ink 1.5 in alto, 32 sopra, 136 sotto,
// colonna etichetta 302 + colonna testo 954 su 1280 utili.
const { t } = useI18n()
const localePath = useLocalePath()

const products: {
  key: string
  slug: string
  name: string
  url: string
  status: ProductStatus
}[] = [
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

const statusLabel = (s: ProductStatus) => t(`home.status_${s}`)

const facts = ['fullstack', 'outsourcing', 'design']

const partners = [
  { slug: 'comune-di-brindisi', name: 'Comune di Brindisi', type: 'institutional' },
  { slug: 'rotte-di-portolano', name: 'Le Rotte di Portolano', type: 'saas' },
  { slug: 'sudel', name: 'Sudel', type: 'app' },
  { slug: 'tmi', name: 'TMI', type: 'app' },
]

// width: larghezza dell'illustrazione sulla foto (193.3 di base)
const team = computed<
  {
    name: string
    role: string
    bg: string
    illustration: string
    width: string
  }[]
>(() => [
  {
    name: 'Barbara',
    role: t('home.roles.ceo'),
    bg: 'bg-banana',
    illustration: '/team/illustrations/barbara.svg',
    width: 'w-[75%]',
  },
  {
    name: 'William',
    role: '¯\\_(ツ)_/¯',
    bg: 'bg-green',
    illustration: '/team/illustrations/william.svg',
    width: 'w-[64.1%]',
  },
  {
    name: 'Cristiano',
    role: t('home.roles.fullstack'),
    bg: 'bg-cream',
    illustration: '/team/illustrations/cristiano.svg',
    width: 'w-[66.7%]',
  },
  {
    name: 'Alessandro',
    role: t('home.roles.fullstack'),
    bg: 'bg-blush',
    illustration: '/team/illustrations/alessandro.svg',
    width: 'w-[64.7%]',
  },
  {
    name: 'Vitantonio',
    role: t('home.roles.art_director'),
    bg: 'bg-ink',
    illustration: '/team/illustrations/vitantonio.svg',
    width: 'w-[68.3%]',
  },
  {
    name: 'Didi',
    role: t('home.roles.mascot'),
    bg: 'bg-red',
    illustration: '/brand/didi-testa.svg',
    width: 'w-[73.3%]',
  },
])

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
          <p class="max-w-[693px] text-body whitespace-pre-line">
            {{ t('home.products_intro') }}
          </p>
        </header>

        <!-- In evidenza - Fanta Rainbow -->
        <article class="flex flex-col gap-6">
          <img
            src="/covers/fanta-rainbow-hero.webp"
            :alt="t('home.featured_alt')"
            width="1280"
            height="640"
            class="aspect-2/1 w-full object-cover"
          >
          <div class="
            grid gap-6
            lg:grid-cols-[588fr_692fr] lg:gap-x-0
          ">
            <div class="flex flex-col gap-3.5">
              <div class="flex items-center gap-3">
                <span class="text-label opacity-60">
                  {{ t('home.featured_category') }}
                </span>
                <StatusPill status="live">
                  {{ statusLabel('live') }}
                </StatusPill>
              </div>
              <h3 class="text-title">
                Fanta Rainbow
              </h3>
            </div>
            <div class="flex flex-col gap-6">
              <p class="text-body">
                {{ t('home.featured_desc') }}
              </p>
              <div class="flex flex-wrap items-center gap-6">
                <DidapButton href="https://fantarainbow.com">
                  {{ t('home.featured_cta') }}
                </DidapButton>
                <NuxtLink
                  :to="localePath('/work/fanta-rainbow')"
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
            v-for="p in products"
            :key="p.key"
            class="flex flex-col gap-5"
          >
            <div
              class="
                flex aspect-[410.7/300] w-full items-center justify-center
                bg-ink
              "
            >
              <span class="text-label text-paper-light">
                {{ t('home.placeholder_image') }}
              </span>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <span class="text-label opacity-60">
                {{ t(`home.products.${p.key}.category`) }}
              </span>
              <StatusPill :status="p.status">
                {{ statusLabel(p.status) }}
              </StatusPill>
            </div>
            <h3 class="text-title">
              {{ p.name }}
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

    <!-- Team -->
    <section class="page-x">
      <div
        class="
          flex flex-col gap-16 border-t-[1.5px] border-ink pt-8 pb-24
          lg:pb-[136px]
        "
      >
        <div class="flex flex-col gap-7">
          <h2 class="max-w-[628px] text-title">
            {{ t('home.team_title') }}
          </h2>
          <p class="max-w-[628px] text-body">
            {{ t('home.team_intro') }}
          </p>
        </div>

        <ul class="
          grid grid-cols-2 gap-x-6 gap-y-10
          md:grid-cols-3
          lg:grid-cols-6 lg:gap-y-6
        ">
          <li
            v-for="m in team"
            :key="m.name"
            class="flex min-w-0 flex-col gap-3"
          >
            <div
              class="flex aspect-[193.3/250] w-full items-center justify-center"
              :class="m.bg"
            >
              <img
                :src="m.illustration"
                :alt="m.name"
                class="h-auto"
                :class="m.width"
              >
            </div>
            <p class="text-body">
              {{ m.name }}
            </p>
            <p class="overflow-hidden text-label whitespace-nowrap opacity-60">
              {{ m.role }}
            </p>
          </li>
        </ul>
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
            <p class="max-w-[628px] text-title">
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
