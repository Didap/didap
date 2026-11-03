<script setup lang="ts">
// Icone piccole dei pannelli admin, a tratto: frecce, croce, spunta, elenco
// e griglia
defineProps<{ name: 'up' | 'down' | 'close' | 'check' | 'list' | 'grid' }>()

const PATHS = {
  up: 'M4 10l4-4 4 4',
  down: 'M4 6l4 4 4-4',
  close: 'M4.5 4.5l7 7M11.5 4.5l-7 7',
  check: 'M3.5 8.5l3 3 6-7',
  list: 'M3 4h10M3 8h10M3 12h10',
  grid: 'M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z',
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
