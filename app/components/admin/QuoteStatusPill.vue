<script setup lang="ts">
import { STATUS_LABELS, type DisplayStatus } from '#shared/quote'

// Stato di un preventivo: bozza tratteggiata, confermato contorno verde,
// firmato verde pieno, rifiutato rosso, scaduto banana
defineProps<{ status: DisplayStatus }>()
</script>

<template>
  <span
    class="
      inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs
      font-medium
    "
    :class="{
      'border border-dashed border-ink/50': status === 'draft',
      'border border-green text-green': status === 'confirmed',
      'bg-green text-paper-light': status === 'signed',
      'border border-red text-red': status === 'rejected',
      'bg-banana text-ink': status === 'expired',
    }"
  >{{ STATUS_LABELS[status] }}</span>
</template>
