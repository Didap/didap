<script setup lang="ts">
import AppHeader from '~/components/AppHeader.vue'
import AppFooter from '~/components/AppFooter.vue'

// Le pagine possono chiedere il fondo "cream" del Figma (scheda prodotto)
// con definePageMeta({ surface: 'cream' }): vale anche per nav e footer.
const route = useRoute()
const cream = computed(() => route.meta.surface === 'cream')
</script>

<template>
  <div
    class="flex min-h-screen flex-col text-ink"
    :class="cream ? 'bg-cream' : 'bg-paper'"
  >
    <AppHeader :cream="cream" />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter :cream="cream" />
  </div>
</template>
