<script setup lang="ts">
import RadarClosedTag from '~/components/admin/RadarClosedTag.vue'
import { formatDay } from '~/utils/format'
import { DAY_MS, romeDate } from '#shared/dates'
import { formatWholeEuro } from '#shared/money'
import type { RadarGrant } from '#shared/radar'

// Quanto manca alla scadenza (o chiuso), quando è entrato nel radar e
// l'importo: a destra della riga nell'elenco, in fondo alla card. La
// disposizione la dà chi lo usa, con le sue classi.
const props = defineProps<{ grant: Pick<RadarGrant, 'closed' | 'deadline' | 'createdAt' | 'maxAmount'> }>()

// In giorni di calendario a Roma
const left = computed(() => {
  const { deadline } = props.grant
  if (!deadline) return { text: 'A sportello', urgent: false }
  const days = (Date.parse(romeDate(new Date(deadline))) - Date.parse(romeDate(new Date()))) / DAY_MS
  const text = days <= 0 ? 'Scade oggi' : days === 1 ? 'Scade domani' : `${days} giorni`
  return { text, urgent: days <= 14 }
})
</script>

<template>
  <span class="flex gap-1 text-sm whitespace-nowrap">
    <RadarClosedTag
      v-if="grant.closed"
      :deadline="grant.deadline"
    />
    <template v-else>
      <span
        class="font-medium"
        :class="left.urgent ? 'text-red' : ''"
      >{{ left.text }}</span>
      <span
        v-if="grant.deadline"
        class="text-xs tabular-nums opacity-60"
      >Scade {{ formatDay(grant.deadline) }}</span>
    </template>
    <span class="text-xs tabular-nums opacity-60">Trovato {{ formatDay(grant.createdAt) }}</span>
    <span
      v-if="grant.maxAmount"
      class="tabular-nums opacity-60"
    >{{ formatWholeEuro(grant.maxAmount) }}</span>
  </span>
</template>
