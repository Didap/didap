<script setup lang="ts">
import type { Outcome } from '#shared/radar'

// Esito di un requisito (o di un bando): spunta verde, punto di domanda
// banana, croce rossa. `size` in pixel.
withDefaults(defineProps<{ outcome: Outcome, size?: number }>(), { size: 20 })

const LABELS: Record<Outcome, string> = { met: 'Rispettato', to_verify: 'Da verificare', not_met: 'Non rispettato' }
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 20 20"
    role="img"
    :aria-label="LABELS[outcome]"
    class="shrink-0"
  >
    <circle
      cx="10"
      cy="10"
      r="9"
      :class="{
        'fill-green': outcome === 'met',
        'fill-banana': outcome === 'to_verify',
        'fill-red': outcome === 'not_met',
      }"
    />
    <path
      v-if="outcome === 'met'"
      d="M6 10.4l2.6 2.6L14 7.6"
      fill="none"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      v-else-if="outcome === 'not_met'"
      d="M7 7l6 6M13 7l-6 6"
      fill="none"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      v-else
      d="M7.9 7.6a2.2 2.2 0 1 1 3.1 2c-.6.3-1 .8-1 1.5v.3M10 14.2v.1"
      fill="none"
      class="stroke-ink"
      stroke-width="1.9"
      stroke-linecap="round"
    />
  </svg>
</template>
