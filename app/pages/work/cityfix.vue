<script setup lang="ts">
import ProductScreens from '~/components/ProductScreens.vue'

// CityFix ha la scheda a slide (components/ProductScreens): questa pagina
// vince su [slug].vue per il suo indirizzo
definePageMeta({ layout: 'screens' })
</script>

<template>
  <ProductScreens slug="cityfix" />
</template>
