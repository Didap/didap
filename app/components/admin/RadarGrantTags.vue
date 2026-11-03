<script setup lang="ts">
import { grantTags, hasOutcome, OUTCOME_LABELS, type OutcomeStatus, type RadarGrant } from '#shared/radar'

// Le etichette di un bando, nell'elenco e nelle card: nuovo dell'ultimo
// scan, esito, gara, IA. Niente se non ce ne sono.
const props = defineProps<{ grant: Pick<RadarGrant, 'kind' | 'ai' | 'applied' | 'outcome'>, isNew: boolean }>()

// L'esito: vinto in evidenza
const OUTCOME_CLASS: Record<OutcomeStatus, string> = {
  won: 'bg-green font-medium text-paper-light',
  lost: 'bg-red/15 text-red',
  unclear: 'bg-gold/25',
  not_published: 'bg-ink/8',
}

const tags = computed(() => grantTags(props.grant))
</script>

<template>
  <span
    v-if="isNew || tags.length || hasOutcome(grant)"
    class="flex flex-wrap gap-1.5 text-xs"
  >
    <span
      v-if="isNew"
      class="rounded-full bg-green px-2 py-0.5 font-medium text-paper-light"
    >Nuovo</span>
    <span
      v-if="hasOutcome(grant)"
      class="rounded-full px-2 py-0.5"
      :class="OUTCOME_CLASS[grant.outcome.status]"
    >{{ OUTCOME_LABELS[grant.outcome.status].tag }}</span>
    <span
      v-for="t in tags"
      :key="t"
      class="rounded-full px-2 py-0.5"
      :class="t === 'IA' ? 'bg-gold/25' : 'bg-ink/8'"
    >{{ t }}</span>
  </span>
</template>
