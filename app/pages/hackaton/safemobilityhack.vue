<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import PageIntro from '~/components/PageIntro.vue'
import DidapButton from '~/components/DidapButton.vue'

// Le slide del kick-off del Safe Mobility Hack, aperte dal QR dell'ultima
// slide: niente splash. Ogni slide è un frammento HTML 1920x1080 in
// app/assets/decks/safemobilityhack/ (ordinati per nome), scalato alla
// larghezza della colonna. Il PDF esce dagli stessi file con
// `node scripts/deck-pdf.mjs safemobilityhack safe-mobility-hack-slides.pdf`.
definePageMeta({ splash: false })

const files = import.meta.glob<string>('../../assets/decks/safemobilityhack/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const slides = Object.keys(files)
  .sort()
  .map(path => files[path] as string)

const FILE = '/download/safe-mobility-hack-slides.pdf'

const { t } = useI18n()
useSeoMeta({
  title: `${t('safemobilityhack.kicker')} - Didap`,
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
  <div>
    <PageIntro
      :kicker="t('safemobilityhack.kicker')"
      :title="t('safemobilityhack.title')"
      :intro="t('safemobilityhack.intro')"
    >
      <div class="flex flex-col items-start gap-4">
        <DidapButton
          :href="FILE"
          download
        >
          {{ t('safemobilityhack.download') }}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            class="size-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M8 2v9M4 7.5 8 11.5l4-4M3 14h10" />
          </svg>
        </DidapButton>
        <p class="text-label text-ink/60">
          {{ t('safemobilityhack.file') }}
        </p>
      </div>
    </PageIntro>

    <section class="
      page-x pb-24
      lg:pb-30
    ">
      <ol
        ref="deck"
        class="
          flex flex-col gap-6
          md:gap-10
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
  </div>
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
