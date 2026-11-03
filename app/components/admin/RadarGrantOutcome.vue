<script setup lang="ts">
import RadarOutcomeIcon from '~/components/admin/RadarOutcomeIcon.vue'
import { formatDateTime, formatDollars } from '~/utils/format'
import { formatDate } from '#shared/dates'
import { OUTCOME_LABELS, type RadarGrant } from '#shared/radar'

// Esito di un bando candidato, in cima al "Dettaglio": l'ultimo trovato da
// "Controlla esito" (punteggio, chi ha vinto, dove è pubblicato) e il
// pulsante per cercarlo o ricontrollarlo. La ricerca gira in background: la
// pagina segna il bando e lo ricarica finché non finisce.
const props = defineProps<{ grant: Pick<RadarGrant, 'id' | 'outcome' | 'outcomeChecking' | 'outcomeError'> }>()
defineEmits<{ check: [id: string] }>()

const label = computed(() => props.grant.outcome && OUTCOME_LABELS[props.grant.outcome.status])

const facts = computed(() => {
  const o = props.grant.outcome
  const rows: [string, string][] = []
  if (o?.ourScore) rows.push(['Il vostro punteggio', o.ourScore])
  if (o?.ourRank) rows.push(['Posizione', `${o.ourRank}ª`])
  if (o?.publishedOn) rows.push(['Pubblicato il', formatDate(o.publishedOn)])
  return rows
})
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-xl border border-ink/10 p-4 text-sm"
    aria-label="Esito del bando"
  >
    <div class="flex items-start gap-3">
      <RadarOutcomeIcon
        v-if="label?.icon"
        :outcome="label.icon"
        :size="18"
        class="mt-px"
      />
      <div class="flex flex-col gap-1">
        <p class="font-medium">
          {{ label?.title ?? 'Esito non ancora controllato' }}
        </p>
        <p v-if="grant.outcome?.summary">
          {{ grant.outcome.summary }}
        </p>
      </div>
    </div>

    <template v-if="grant.outcome">
      <dl
        v-if="facts.length"
        class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5"
      >
        <template
          v-for="[name, value] in facts"
          :key="name"
        >
          <dt class="opacity-55">
            {{ name }}
          </dt>
          <dd class="font-medium tabular-nums">
            {{ value }}
          </dd>
        </template>
      </dl>
      <div
        v-if="grant.outcome.winners.length"
        class="flex flex-col gap-1"
      >
        <h3 class="font-bold">
          Chi ha vinto
        </h3>
        <ul class="flex flex-col gap-0.5">
          <li
            v-for="(w, i) in grant.outcome.winners"
            :key="i"
          >
            {{ w.name }}<span
              v-if="w.score"
              class="tabular-nums opacity-60"
            > · {{ w.score }}</span>
          </li>
        </ul>
      </div>
      <div
        v-if="grant.outcome.sources.length"
        class="flex flex-col gap-1"
      >
        <h3 class="font-bold">
          Dove è pubblicato
        </h3>
        <ul class="flex flex-col gap-0.5">
          <li
            v-for="s in grant.outcome.sources"
            :key="s.url"
          >
            <a
              :href="s.url"
              target="_blank"
              rel="noopener"
              class="
                underline decoration-ink/30 underline-offset-2
                hover:decoration-ink
              "
            >{{ s.title }}</a>
          </li>
        </ul>
      </div>
      <p class="text-xs opacity-60">
        Controllato il {{ formatDateTime(grant.outcome.checkedAt) }} · {{ formatDollars(grant.outcome.cost) }}
      </p>
    </template>

    <p
      v-if="grant.outcomeError"
      class="text-red"
    >
      {{ grant.outcomeError }}
    </p>

    <button
      type="button"
      class="
        inline-flex w-fit items-center rounded-full border border-ink/20 px-4
        py-2
        hover:border-ink
        disabled:cursor-wait disabled:opacity-60
      "
      :disabled="grant.outcomeChecking"
      @click="$emit('check', grant.id)"
    >
      {{ grant.outcomeChecking ? 'Cerco l\'esito sul web…' : grant.outcome ? 'Controlla di nuovo' : 'Controlla esito' }}
    </button>
  </section>
</template>
