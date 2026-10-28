<script setup lang="ts">
import { formatDay } from '~/utils/format'

// Bando chiuso o scaduto (resta solo perché ha la cartella): l'etichetta e la
// scadenza, nell'elenco e nella scheda. `label` va prima della data.
defineProps<{ deadline: string | null, label?: string }>()
</script>

<template>
  <span class="flex items-center gap-2">
    <span class="rounded-full bg-ink/8 px-2 py-0.5 text-xs font-medium">Chiuso</span>
    <span class="opacity-60">{{ label ? `${label} ` : '' }}{{ deadline ? formatDay(deadline) : 'A sportello' }}</span>
  </span>
</template>
