<script setup lang="ts">
import SiteSplash from '~/components/SiteSplash.vue'

// Le pagine a schermate (la home, le schede a slide): hanno la loro barra
// (HomeBar) e chiudono da sé, senza nav né footer. Niente DidiGuide: la
// nuvoletta in basso a destra coprirebbe le schermate.
</script>

<template>
  <div class="bg-paper text-ink">
    <main>
      <slot />
    </main>
    <SiteSplash />
  </div>
</template>
