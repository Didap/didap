<script setup lang="ts">
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import RadarClosedTag from '~/components/admin/RadarClosedTag.vue'
import RadarGrantDraft from '~/components/admin/RadarGrantDraft.vue'
import RadarGrantFiles from '~/components/admin/RadarGrantFiles.vue'
import RadarOutcomeIcon from '~/components/admin/RadarOutcomeIcon.vue'
import { formatDay } from '~/utils/format'
import { formatWholeEuro } from '#shared/money'
import { ELIGIBILITY_OUTCOME, sourceLabel, VERDICT_LABELS, type EvaluatedGrant, type FolderStart } from '#shared/radar'

// Scheda di un bando, in tre schede: "Dettaglio" (giudizio, dati, sintesi,
// requisiti e come si presenta), "File" (la cartella del bando) e "Bozza"
// (la bozza della candidatura, condivisa con Claude). Il motivo
// di un requisito compare solo quando c'è qualcosa da guardare; la frase del
// bando si apre col clic.
const props = defineProps<{ grant: EvaluatedGrant, filesConfigured: boolean }>()
// La scheda scelta la tiene la pagina: resta passando da un bando all'altro.
// Lasciando la bozza con modifiche la pagina chiede prima conferma.
const tab = defineModel<'detail' | 'files' | 'draft'>('tab', { required: true })
// La cartella si riempie in background: la pagina segna il bando e lo
// ricarica finché non è pronta
defineEmits<{ folder: [id: string, start: FolderStart] }>()

const VERDICT_OUTCOME = { yes: 'met', no: 'not_met', maybe: 'to_verify' } as const

const facts = computed(() => {
  const g = props.grant
  const rows: [string, string][] = [
    ['Scadenza', g.deadline ? formatDay(g.deadline) : 'A sportello'],
    ['Fonte', sourceLabel(g.source)],
  ]
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
          <RadarClosedTag
            v-if="grant.closed"
            :deadline="grant.deadline"
            label="Scadenza"
            class="text-sm"
          />
        </div>
      </div>
      <div class="ml-9 flex flex-wrap gap-2">
        <a
          :href="grant.url"
          target="_blank"
          rel="noopener"
          class="
            inline-flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2
            text-sm font-medium text-paper-light
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
        <!-- Il bando in un file Markdown + YAML, per lavorarci con Claude Code -->
        <a
          :href="`/api/admin/radar/grants/${grant.id}/export`"
          download
          class="
            inline-flex w-fit items-center rounded-full border border-ink/20
            px-4 py-2 text-sm
            hover:border-ink
          "
          title="Scarica il bando in un file da dare a Claude Code"
        >
          Esporta per Claude
        </a>
      </div>
      <ToggleGroupRoot
        :model-value="tab"
        type="single"
        class="ml-9 toggle-segmented w-fit"
        aria-label="Scheda del bando"
        @update:model-value="v => v && (tab = v as 'detail' | 'files' | 'draft')"
      >
        <ToggleGroupItem value="detail">
          Dettaglio
        </ToggleGroupItem>
        <ToggleGroupItem value="files">
          File
        </ToggleGroupItem>
        <ToggleGroupItem value="draft">
          Bozza
        </ToggleGroupItem>
      </ToggleGroupRoot>
    </header>

    <!-- Per id: un altro bando ha una cartella nuova, dalla principale -->
    <RadarGrantFiles
      v-if="tab === 'files'"
      :key="grant.id"
      :grant="grant"
      :configured="filesConfigured"
      @folder="(id, start) => $emit('folder', id, start)"
    />

    <RadarGrantDraft
      v-else-if="tab === 'draft'"
      :key="grant.id"
      :grant="grant"
    />

    <template v-else>
    <div
      v-if="grant.verdict"
      class="flex items-start gap-3 rounded-xl bg-ink/4 p-3 text-sm"
    >
      <RadarOutcomeIcon
        :outcome="VERDICT_OUTCOME[grant.verdict]"
        :size="18"
        class="mt-px"
      />
      <p>
        <span class="font-medium">{{ VERDICT_LABELS[grant.verdict] }}.</span>
        {{ grant.verdictReason }}
      </p>
    </div>

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

    <section
      v-if="grant.application"
      class="flex flex-col gap-2"
    >
      <h3 class="text-sm font-bold">
        Come si presenta
      </h3>
      <p
        v-if="grant.application.platform"
        class="text-sm"
      >
        {{ grant.application.platform }}
      </p>
      <ul
        v-if="grant.application.documents.length"
        class="flex flex-col gap-1.5 text-sm"
      >
        <li
          v-for="(d, i) in grant.application.documents"
          :key="i"
          class="flex flex-col"
        >
          <span>{{ d.name }}</span>
          <span
            v-if="d.format || d.notes"
            class="opacity-60"
          >{{ [d.format, d.notes].filter(Boolean).join(' · ') }}</span>
        </li>
      </ul>
    </section>
    </template>
  </article>
</template>
