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
// { nav: 'home' }: la home a schermate ha la sua barra e chiude da sé,
// senza nav né footer
const productNav = computed(() => route.meta.nav === 'product')
const home = computed(() => route.meta.nav === 'home')
</script>

<template>
  <div
    class="flex min-h-screen flex-col text-ink"
    :class="cream ? 'bg-cream' : 'bg-paper'"
  >
    <AppHeader
      v-if="!home"
      :cream="cream"
      :product="productNav"
    />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter
      v-if="!home"
      :cream="cream"
    />
    <DidiGuide />
    <SiteSplash />
  </div>
</template>
