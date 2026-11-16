<script setup lang="ts">
import { useElementSize } from '@vueuse/core'

// Le slide del kick-off del Safe Mobility Hack. Ogni slide è un frammento
// HTML 1920x1080 in app/assets/decks/safemobilityhack/ (ordinati per nome):
// qui le scaliamo alla larghezza della colonna. Il PDF scaricabile esce dagli
// stessi file con `node scripts/deck-pdf.mjs safemobilityhack`.
const files = import.meta.glob<string>('../../assets/decks/safemobilityhack/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const slides = Object.keys(files)
  .sort()
  .map(path => files[path] as string)

const pdfUrl = '/decks/safemobilityhack/safemobilityhack.pdf'

const { t } = useI18n()
useSeoMeta({
  title: `${t('safemobilityhack.title')} - Didap`,
  description: t('safemobilityhack.seo_description'),
})
useHead({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700&family=Archivo+Black&display=swap',
    },
  ],
})

// Scala 1920 -> larghezza della colonna. Prima della misura vale la colonna
// piena del desktop (1280 / 1920), così il render del server è già giusto lì.
const deck = ref<HTMLElement | null>(null)
const { width } = useElementSize(deck)
const scale = computed(() => (width.value ? width.value / 1920 : 1280 / 1920))
</script>

<template>
  <section class="
    page-x py-16
    md:py-24
  ">
    <p class="text-label text-green">{{ t('safemobilityhack.kicker') }}</p>
    <h1 class="mt-4 text-display">{{ t('safemobilityhack.title') }}</h1>
    <div class="
      mt-8 flex flex-col gap-8
      md:flex-row md:items-end md:justify-between
    ">
      <p class="
        text-body
        md:flex-1
      ">{{ t('safemobilityhack.intro') }}</p>
      <DidapButton
        :href="pdfUrl"
        download="safe-mobility-hack.pdf"
        class="
          gap-3 self-start
          md:self-auto
        "
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-4"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        {{ t('safemobilityhack.download') }}
      </DidapButton>
    </div>

    <ol
      ref="deck"
      class="
        mt-12 flex flex-col gap-6
        md:mt-16 md:gap-10
      "
      :style="{ '--deck-scale': scale }"
    >
      <li
        v-for="(html, i) in slides"
        :key="i"
        class="deck-slide"
        :aria-label="t('safemobilityhack.slide_label', { n: i + 1, total: slides.length })"
      >
        <!-- eslint-disable-next-line vue/no-v-html -- slide nostre, versionate nel repo -->
        <div class="deck-canvas" v-html="html" />
      </li>
    </ol>
  </section>
</template>

<style scoped>
.deck-slide {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 1rem;
  background: #fffdf8;
  box-shadow: 0 0 0 1px rgb(22 20 18 / 0.1);
}

.deck-canvas {
  position: absolute;
  inset: 0 auto auto 0;
  width: 1920px;
  height: 1080px;
  transform: scale(var(--deck-scale));
  transform-origin: 0 0;
  /* Le slide sono una tela fissa: le loro regole di a capo sono già decise */
  font-family: Archivo, Arial, sans-serif;
  line-height: normal;
}

.deck-canvas :deep(section) {
  position: relative;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
}

.deck-canvas :deep(*) {
  margin: 0;
}

/* I titoli del sito stringono la spaziatura: sulle slide resta quella del font */
.deck-canvas :deep(:is(h1, h2, h3)) {
  letter-spacing: normal;
}

.deck-canvas :deep(a) {
  color: inherit;
  text-decoration: none;
}
</style>
