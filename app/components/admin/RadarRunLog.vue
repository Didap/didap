<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { adminErrorText } from '~/utils/adminErrors'
import { formatDateTime, formatDay } from '~/utils/format'
import { formatDecimal } from '#shared/money'
import {
  comuniOf,
  grantTags,
  isNewIn,
  PROVINCES,
  sourceLabel,
  SOURCE_GROUPS,
  usageCost,
  type EvaluatedGrant,
  type RadarRun,
} from '#shared/radar'

// Registro degli scan: quando, cosa, quanto è durato, quali bandi nuovi ha
// trovato (un clic li apre nell'elenco), quali siti non hanno risposto e
// quanti token ha consumato. Mentre uno scan gira si aggiorna da solo.
// I bandi sono quelli che il pannello ha già valutato coi suoi filtri.
const props = defineProps<{ grants: EvaluatedGrant[] }>()
defineEmits<{ open: [id: string] }>()
const { notify } = useAdminToast()

const runs = ref<RadarRun[] | null>(null)

async function load() {
  try {
    runs.value = await $fetch<RadarRun[]>('/api/admin/radar/runs')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
}

onMounted(load)
defineExpose({ load })

const running = computed(() => runs.value?.some(r => r.status === 'running') ?? false)

// I bandi nuovi di ogni scan: gli stessi che la scheda "Nuovi" mostra per l'ultimo
const rows = computed(() => {
  const added = new Map<string, EvaluatedGrant[]>()
  for (const g of props.grants) {
    if (!g.runId || !isNewIn(g, g.runId)) continue
    const list = added.get(g.runId)
    if (list) list.push(g)
    else added.set(g.runId, [g])
  }
  return (runs.value ?? []).map(r => ({ ...r, added: added.get(r.id) ?? [] }))
})
const { pause, resume } = useIntervalFn(load, 5_000, { immediate: false })
watch(running, r => (r ? resume() : pause()))

const TRIGGERS: Record<RadarRun['trigger'], string> = {
  manuale: 'Scan',
  automatico: 'Import automatico',
  ripresa: 'Ripresa della coda',
  profilo: 'Nuovo giudizio dopo il profilo',
}

// Le fonti senza risposta in una riga: i comuni sono tanti
const names = (list: string[]) => (list.length > 6 ? `${list.slice(0, 6).join(', ')} e altri ${list.length - 6}` : list.join(', '))

const STATUS: Record<RadarRun['status'], { text: string, cls: string }> = {
  running: { text: 'In corso', cls: 'bg-gold/20' },
  done: { text: 'Finito', cls: 'bg-green/15' },
  failed: { text: 'Fallito', cls: 'bg-red/15 text-red' },
}

const fmt = formatDecimal
const dollars = (n: number | null) =>
  n === null ? 'prezzo n.d.' : `≈ ${n.toLocaleString('it-IT', { style: 'currency', currency: 'USD', minimumFractionDigits: n < 1 ? 3 : 2 })}`

const now = ref(Date.now())
useIntervalFn(() => (now.value = Date.now()), 1_000)

function duration(r: RadarRun) {
  const end = r.finishedAt ? Date.parse(r.finishedAt) : now.value
  const s = Math.max(0, Math.round((end - Date.parse(r.startedAt)) / 1000))
  const m = Math.floor(s / 60)
  return m ? `${m} min ${s % 60} s` : `${s} s`
}

function scope(r: RadarRun) {
  if (!r.groups.length) return 'Coda già scaricata'
  return r.groups.map((g) => {
    const label = SOURCE_GROUPS.find(x => x.value === g)?.label ?? g
    if (g !== 'comuni') return label
    const names = r.provinces.map(p => PROVINCES.find(x => x.value === p)?.label ?? p)
    return `Comuni di ${names.join(', ')} (${comuniOf(r.provinces).length})`
  }).join(', ')
}

const totals = computed(() => {
  const list = runs.value ?? []
  const tokens = list.reduce((n, r) => n + r.usage.input + r.usage.output + r.usage.cacheRead + r.usage.cacheWrite, 0)
  const costs = list.map(r => usageCost(r.model, r.usage))
  const cost = costs.every(c => c !== null) ? costs.reduce((n, c) => n + c!, 0) : null
  return { tokens, cost }
})
</script>

<template>
  <div>
    <p
      v-if="!runs"
      class="px-8 py-10 opacity-60"
    >
      Carico il registro…
    </p>
    <p
      v-else-if="!runs.length"
      class="px-8 py-10 opacity-60"
    >
      Nessuno scan ancora: scegli le fonti a sinistra e premi Avvia scan.
    </p>
    <template v-else>
      <p class="
        border-b border-ink/10 px-5 py-3 text-sm opacity-60
        lg:px-8
      ">
        Ultimi {{ runs.length }} giri: {{ fmt(totals.tokens) }} token, {{ dollars(totals.cost) }}
      </p>
      <ul>
        <li
          v-for="r in rows"
          :key="r.id"
          class="
            flex flex-col gap-2 border-b border-ink/10 px-5 py-4
            lg:px-8
          "
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="font-medium">{{ TRIGGERS[r.trigger] }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              :class="STATUS[r.status].cls"
            >{{ STATUS[r.status].text }}</span>
            <span class="text-sm opacity-60">{{ formatDateTime(r.startedAt) }} · {{ duration(r) }}</span>
          </div>
          <p class="text-sm">
            {{ scope(r) }}
          </p>
          <dl class="
            grid grid-cols-2 gap-x-6 gap-y-1 text-sm
            sm:grid-cols-4
          ">
            <div>
              <dt class="text-xs opacity-55">
                Voci nelle fonti
              </dt>
              <dd class="tabular-nums">
                {{ fmt(r.stats.listed) }} <span class="opacity-60">· {{ fmt(r.stats.queued) }} nuove</span>
              </dd>
            </div>
            <div>
              <dt class="text-xs opacity-55">
                Letti dal modello
              </dt>
              <dd class="tabular-nums">
                {{ fmt(r.stats.read) }} <span class="opacity-60">· {{ fmt(r.stats.grants) }} bandi</span>
              </dd>
            </div>
            <div>
              <dt class="text-xs opacity-55">
                Giudicati col profilo
              </dt>
              <dd class="tabular-nums">
                {{ fmt(r.stats.judged) }}
              </dd>
            </div>
            <div>
              <dt class="text-xs opacity-55">
                Token · {{ fmt(r.usage.calls) }} chiamate
              </dt>
              <dd
                class="tabular-nums"
                :title="`Input ${fmt(r.usage.input)}, output ${fmt(r.usage.output)}, cache letta ${fmt(r.usage.cacheRead)}, cache scritta ${fmt(r.usage.cacheWrite)}`"
              >
                {{ fmt(r.usage.input + r.usage.cacheRead + r.usage.cacheWrite) }} in, {{ fmt(r.usage.output) }} out
                <span class="opacity-60">· {{ dollars(usageCost(r.model, r.usage)) }}</span>
              </dd>
            </div>
          </dl>
          <div
            v-if="r.added.length"
            class="flex flex-col gap-1.5"
          >
            <p class="text-sm font-medium">
              {{ r.added.length === 1 ? '1 bando nuovo' : `${r.added.length} bandi nuovi` }}
            </p>
            <ul class="
              flex flex-col divide-y divide-ink/8 rounded-xl border
              border-ink/10
            ">
              <li
                v-for="g in r.added"
                :key="g.id"
              >
                <button
                  type="button"
                  class="
                    grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-4 px-3 py-2
                    text-left text-sm
                    hover:bg-ink/3
                  "
                  @click="$emit('open', g.id)"
                >
                  <span class="flex min-w-0 flex-col">
                    <span class="truncate font-medium">
                      {{ g.title }}
                    </span>
                    <span class="truncate text-xs opacity-60">
                      {{ [...grantTags(g), sourceLabel(g.source)].join(' · ') }}
                    </span>
                  </span>
                  <span class="
                    text-right text-xs whitespace-nowrap tabular-nums
                  ">
                    {{ g.deadline ? `Scade ${formatDay(g.deadline)}` : 'A sportello' }}
                  </span>
                </button>
              </li>
            </ul>
          </div>
          <p
            v-if="r.stats.unreachable.length || r.stats.paused.length"
            class="text-xs/relaxed opacity-60"
          >
            <template v-if="r.stats.unreachable.length">
              Non hanno risposto, si riprovano al prossimo scan: {{ names(r.stats.unreachable) }}.
            </template>
            <template v-if="r.stats.paused.length">
              In pausa, non rispondono da più di un giorno: {{ names(r.stats.paused) }}.
            </template>
          </p>
          <p
            v-if="r.error"
            class="text-sm text-red"
          >
            {{ r.error }}
          </p>
          <details
            v-if="r.stats.errors.length"
            class="text-sm"
          >
            <summary class="
              w-fit cursor-pointer text-red underline decoration-dotted
              underline-offset-2
            ">
              {{ r.stats.errors.length === 1 ? '1 errore' : `${r.stats.errors.length} errori` }}
            </summary>
            <ul class="mt-2 flex flex-col gap-1">
              <li
                v-for="(e, i) in r.stats.errors"
                :key="i"
                class="text-xs/relaxed break-all text-ink/80"
              >
                {{ e }}
              </li>
            </ul>
          </details>
        </li>
      </ul>
    </template>
  </div>
</template>
