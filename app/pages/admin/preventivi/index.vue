<script setup lang="ts">
import AdminShell from '~/components/admin/AdminShell.vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import QuoteStatusPill from '~/components/admin/QuoteStatusPill.vue'
import { adminErrorText } from '~/utils/adminErrors'
import { formatDay } from '~/utils/format'
import { formatEuro } from '#shared/money'
import type { DisplayStatus, QuoteListRow } from '#shared/quote'

// Elenco dei preventivi, dal più recente
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Preventivi - Admin Didap' })

await useAdminSession()
const { notify } = useAdminToast()

const rows = ref<QuoteListRow[] | null>(null)
// Gruppi dell'elenco: i confermati scaduti restano tra i confermati
const GROUPS = {
  draft: { label: 'Bozze', statuses: ['draft'] },
  confirmed: { label: 'Confermati', statuses: ['confirmed', 'expired'] },
  signed: { label: 'Firmati', statuses: ['signed'] },
  rejected: { label: 'Rifiutati', statuses: ['rejected'] },
  all: { label: 'Tutti', statuses: [] },
} as const satisfies Record<string, { label: string, statuses: readonly DisplayStatus[] }>
type Group = keyof typeof GROUPS
const FILTERS = Object.keys(GROUPS) as Group[]
const inGroup = (r: QuoteListRow, g: Group) =>
  g === 'all' || (GROUPS[g].statuses as readonly DisplayStatus[]).includes(r.displayStatus)

const filter = ref<Group>('all')
const query = ref('')
const creating = ref(false)
const counts = computed(() =>
  Object.fromEntries(FILTERS.map(g => [g, (rows.value ?? []).filter(r => inGroup(r, g)).length])) as Record<Group, number>)

// Un clic sul filtro attivo lo spegnerebbe (undefined): resta com'è
function pickFilter(v: unknown) {
  const f = FILTERS.find((x) => x === v)
  if (f) filter.value = f
}

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (rows.value ?? []).filter((r) =>
    inGroup(r, filter.value)
    && (!q || [r.number ?? '', r.title, r.clientName ?? ''].some((v) => v.toLowerCase().includes(q))),
  )
})

async function load() {
  try {
    rows.value = await $fetch<QuoteListRow[]>('/api/admin/quotes')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
}

onAdminReady(load)

async function create() {
  creating.value = true
  try {
    const { id } = await $fetch<{ id: string }>('/api/admin/quotes', { method: 'POST' })
    await navigateTo(`/admin/preventivi/${id}`)
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    creating.value = false
  }
}
</script>

<template>
  <AdminShell fill>
    <section
      class="flex min-h-0 flex-1 flex-col"
      aria-label="Preventivi"
    >
      <header class="
        flex flex-col gap-4 border-b border-ink/10 px-5 pt-5 pb-4
        lg:px-8
      ">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 class="text-2xl font-bold">
            Preventivi
          </h1>
          <button
            type="button"
            class="
              ml-auto rounded-full bg-green px-4 py-2 text-sm font-medium
              text-paper-light
              hover:bg-ink
              disabled:opacity-50
            "
            :disabled="creating"
            @click="create"
          >
            + Nuovo preventivo
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <ToggleGroupRoot
            :model-value="filter"
            type="single"
            class="toggle-segmented max-w-full scrollbar-none overflow-x-auto"
            aria-label="Filtra per stato"
            @update:model-value="pickFilter"
          >
            <ToggleGroupItem
              v-for="f in FILTERS"
              :key="f"
              :value="f"
              class="
                px-2! whitespace-nowrap
                sm:px-3!
              "
            >
              {{ GROUPS[f].label }}
              <span class="tabular-nums opacity-60">{{ counts[f] }}</span>
            </ToggleGroupItem>
          </ToggleGroupRoot>
          <input
            v-model="query"
            type="search"
            placeholder="Cerca numero, titolo o cliente"
            aria-label="Cerca"
            class="
              panel-input rounded-full px-4
              sm:ml-auto sm:w-72
            "
          >
        </div>
      </header>

      <div class="
        min-h-0 flex-1 scrollbar-none
        lg:overflow-y-auto
      ">
        <p
          v-if="rows && !rows.length"
          class="px-8 py-10 opacity-60"
        >
          Ancora nessun preventivo.
        </p>
        <p
          v-else-if="rows && !visible.length"
          class="px-8 py-10 opacity-60"
        >
          Nessun preventivo qui.
        </p>
        <ul v-else-if="rows">
          <li
            v-for="r in visible"
            :key="r.id"
            class="border-b border-ink/10"
          >
            <NuxtLink
              :to="`/admin/preventivi/${r.id}`"
              class="
                grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1
                px-5 py-4 transition
                hover:bg-ink/3
                sm:grid-cols-[6rem_minmax(0,1fr)_auto_auto_7rem]
                lg:px-8
              "
            >
              <span class="
                hidden text-sm tabular-nums opacity-60
                sm:block
              ">{{ r.number ?? 'Bozza' }}</span>
              <span class="min-w-0">
                <span class="block truncate font-medium">{{ r.title || 'Senza titolo' }}</span>
                <span class="block truncate text-sm opacity-60">{{ r.clientName ?? 'Cliente da scegliere' }}</span>
              </span>
              <span class="
                hidden text-sm opacity-50
                sm:block
              ">{{ formatDay(r.updatedAt) }}</span>
              <span class="text-right tabular-nums">{{ formatEuro(r.total) }}</span>
              <span class="
                hidden justify-end
                sm:flex
              ">
                <QuoteStatusPill :status="r.displayStatus" />
              </span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>
  </AdminShell>
</template>
