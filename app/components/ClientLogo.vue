<script setup lang="ts">
// Il logo di un cliente nel colore del testo: l'immagine trasparente
// (public/logos, solo la sagoma) dà la misura e il nome, quello che si
// vede è il colore del testo nella sua sagoma. L'altezza la decide chi lo
// usa, in vw/vh e non in %: con una percentuale la larghezza del bottone
// intorno non torna con quella del logo. Senza `logo` c'è il nome.
defineProps<{
  logo?: string
  title: string
}>()
</script>

<template>
  <span
    v-if="logo"
    class="relative block"
  >
    <img
      :src="logo"
      :alt="title"
      class="block h-(--logo-h) w-auto opacity-0"
      draggable="false"
    >
    <span
      class="logo-ink absolute inset-0 bg-current"
      :style="{ '--logo': `url(${logo})` }"
      aria-hidden="true"
    />
  </span>
  <span v-else>{{ title }}</span>
</template>

<style scoped>
.logo-ink {
  mask: var(--logo) center / contain no-repeat;
}
</style>
