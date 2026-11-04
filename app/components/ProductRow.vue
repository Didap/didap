<script setup lang="ts">
// Una riga della scheda prodotto: l'etichetta verde a sinistra, il
// contenuto a destra, sulla griglia 302/954 del Figma. Filo e spazi li
// decide chi la usa, via class
defineProps<{ label: string }>()
</script>

<template>
  <div class="
    grid gap-8
    lg:grid-cols-[302fr_954fr] lg:gap-6
  ">
    <p class="text-label text-green">
      {{ label }}
    </p>
    <slot />
  </div>
</template>
