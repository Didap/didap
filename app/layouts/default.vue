<script setup lang="ts">
import AppHeader from '~/components/AppHeader.vue'
import AppFooter from '~/components/AppFooter.vue'
import SiteSplash from '~/components/SiteSplash.vue'
import DidiGuide from '~/components/DidiGuide.vue'

// Le pagine possono chiedere il fondo "cream" del Figma (scheda prodotto)
// con definePageMeta({ surface: 'cream' }): vale anche per nav e footer.
const route = useRoute()
const cream = computed(() => route.meta.surface === 'cream')
// definePageMeta({ nav: 'product' }): nav della scheda prodotto.
// { nav: 'screens' }: le pagine a schermate (la home, le schede a slide)
// hanno la loro barra e chiudono da sé, senza nav né footer. Lì Didi
// non scende in basso a destra: la nuvoletta coprirebbe le schermate
const productNav = computed(() => route.meta.nav === 'product')
const screens = computed(() => route.meta.nav === 'screens')
</script>

<template>
  <div
    class="flex min-h-screen flex-col text-ink"
    :class="cream ? 'bg-cream' : 'bg-paper'"
  >
    <AppHeader
      v-if="!screens"
      :cream="cream"
      :product="productNav"
    />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter
      v-if="!screens"
      :cream="cream"
    />
    <DidiGuide v-if="!screens" />
    <SiteSplash />
  </div>
</template>
