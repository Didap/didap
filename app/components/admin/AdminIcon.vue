<script setup lang="ts">
// Icone piccole dei pannelli admin, a tratto: frecce e croce
defineProps<{ name: 'up' | 'down' | 'close' }>()

const PATHS = {
  up: 'M4 10l4-4 4 4',
  down: 'M4 6l4 4 4-4',
  close: 'M4.5 4.5l7 7M11.5 4.5l-7 7',
}
</script>

<template>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <path
      :d="PATHS[name]"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
