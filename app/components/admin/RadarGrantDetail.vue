<script setup lang="ts">
import RadarOutcomeIcon from '~/components/admin/RadarOutcomeIcon.vue'
import { formatDay } from '~/utils/format'
import { formatWholeEuro } from '#shared/money'
import type { EvaluatedGrant } from '#shared/radar'

// Scheda di un bando: dati, sintesi e requisiti. Il motivo compare solo
// quando c'è qualcosa da guardare; la frase del bando si apre col clic.
const props = defineProps<{ grant: EvaluatedGrant }>()

const ELIGIBILITY_OUTCOME = { eligible: 'met', to_verify: 'to_verify', excluded: 'not_met' } as const

const facts = computed(() => {
  const g = props.grant
  const rows: [string, string][] = [['Scadenza', g.deadline ? formatDay(g.deadline) : 'A sportello']]
  if (g.opensAt && new Date(g.opensAt) > new Date()) rows.push(['Apre', formatDay(g.opensAt)])
  if (g.maxAmount) rows.push(['Fino a', formatWholeEuro(g.maxAmount)])
  if (g.funding) rows.push(['Aiuto', g.funding])
  return rows
})

const GENERIC = 'Da verificare a mano'
const note = (i: number) => {
  const e = props.grant.evaluations[i]!
  return e.outcome === 'met' || e.reason === GENERIC ? '' : e.reason
}
</script>

<template>
  <article class="flex flex-col gap-6 p-6">
    <header class="flex flex-col gap-3">
      <div class="flex items-start gap-3">
        <RadarOutcomeIcon
          :outcome="ELIGIBILITY_OUTCOME[grant.eligibility]"
          :size="22"
          class="mt-1"
        />
        <div class="flex flex-col gap-1">
          <h2 class="text-xl/snug font-bold text-balance">
            {{ grant.title }}
          </h2>
          <p class="text-sm opacity-60">
            {{ grant.issuer }}
          </p>
        </div>
      </div>
      <a
        :href="grant.url"
        target="_blank"
        rel="noopener"
        class="
          ml-9 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-4
          py-2 text-sm font-medium text-paper-light
          hover:bg-green
        "
      >
        Apri il bando
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
        >
          <path
            d="M5 3h6v6M11 3L3.5 10.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </a>
    </header>

    <dl class="
      grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5 border-y
      border-ink/10 py-4 text-sm
    ">
      <template
        v-for="[label, value] in facts"
        :key="label"
      >
        <dt class="opacity-55">
          {{ label }}
        </dt>
        <dd class="font-medium">
          {{ value }}
        </dd>
      </template>
    </dl>

    <p
      v-if="grant.summary"
      class="max-w-[65ch] text-sm/relaxed"
    >
      {{ grant.summary }}
    </p>

    <section
      v-if="grant.requirements.length"
      class="flex flex-col gap-1"
    >
      <h3 class="mb-1 text-sm font-bold">
        Requisiti
      </h3>
      <template
        v-for="(r, i) in grant.requirements"
        :key="i"
      >
        <details
          v-if="r.quote"
          class="group rounded-lg"
        >
          <summary class="
            grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto]
            items-start gap-x-3 rounded-lg p-2
            hover:bg-ink/4
            [&::-webkit-details-marker]:hidden
          ">
            <RadarOutcomeIcon
              :outcome="grant.evaluations[i]!.outcome"
              :size="18"
              class="mt-px"
            />
            <span class="flex flex-col gap-0.5 text-sm">
              <span>{{ r.label }}</span>
              <span
                v-if="note(i)"
                class="opacity-60"
              >{{ note(i) }}</span>
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              class="
                mt-1 opacity-40 transition-transform
                group-open:rotate-180
              "
              aria-hidden="true"
            >
              <path
                d="M4 6l4 4 4-4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </summary>
          <blockquote class="
            mx-2 mt-1 mb-2 ml-9 max-w-[65ch] rounded-lg bg-ink/4 px-3 py-2
            text-sm/relaxed text-ink/80 italic
          ">
            «{{ r.quote }}»<span
              v-if="r.page"
              class="ml-1 not-italic opacity-60"
            >pag. {{ r.page }}</span>
          </blockquote>
        </details>
        <div
          v-else
          class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 p-2"
        >
          <RadarOutcomeIcon
            :outcome="grant.evaluations[i]!.outcome"
            :size="18"
            class="mt-px"
          />
          <span class="flex flex-col gap-0.5 text-sm">
            <span>{{ r.label }}</span>
            <span
              v-if="note(i)"
              class="opacity-60"
            >{{ note(i) }}</span>
          </span>
        </div>
      </template>
    </section>
  </article>
</template>
