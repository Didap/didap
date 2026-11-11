<script setup lang="ts">
// Testo lungo con gli stili di testo del Figma (utility rich-text in
// main.css): il corpo markdown dei contenuti (schede prodotto, casi
// cliente) con `value`, oppure i paragrafi passati nello slot (chi siamo,
// pagine legali).
defineProps<{
  value?: Record<string, any>
}>()
</script>

<template>
  <div class="rich-text">
    <ContentRenderer
      v-if="value"
      :value="value"
    />
    <slot v-else />
  </div>
</template>
