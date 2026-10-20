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
  <AdminShell>
    <main class="
      mx-auto w-full max-w-5xl p-6
      lg:p-10
    ">
      <div class="flex flex-wrap items-center gap-4">
        <h1 class="mr-auto text-3xl font-bold">
          Preventivi
        </h1>
        <button
          type="button"
          class="
            rounded-full bg-green px-5 py-2.5 font-medium text-paper-light
            hover:bg-ink
            disabled:opacity-50
          "
          :disabled="creating"
          @click="create"
        >
          + Nuovo preventivo
        </button>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-2">
        <ToggleGroupRoot
          :model-value="filter"
          type="single"
          class="toggle-pills"
          aria-label="Filtra per stato"
          @update:model-value="pickFilter"
        >
          <ToggleGroupItem
            v-for="f in FILTERS"
            :key="f"
            :value="f"
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
            admin-input
            sm:ml-auto sm:max-w-xs
          "
        >
      </div>

      <p
        v-if="rows && !rows.length"
        class="mt-10 opacity-60"
      >
        Ancora nessun preventivo. Crea il primo con "Nuovo preventivo".
      </p>
      <p
        v-else-if="rows && !visible.length"
        class="mt-10 opacity-60"
      >
        Nessun preventivo corrisponde ai filtri.
      </p>
      <ul
        v-else-if="rows"
        class="mt-6 flex flex-col gap-2"
      >
        <li
          v-for="r in visible"
          :key="r.id"
        >
          <NuxtLink
            :to="`/admin/preventivi/${r.id}`"
            class="
              grid items-center gap-x-4 gap-y-1 rounded-2xl border border-ink/10
              bg-white px-5 py-4 transition
              hover:border-ink
              sm:grid-cols-[90px_minmax(0,1fr)_auto_auto]
            "
          >
            <span class="font-mono text-sm">{{ r.number ?? 'Bozza' }}</span>
            <span class="min-w-0">
              <span class="block truncate font-medium">{{ r.title || 'Senza titolo' }}</span>
              <span class="block truncate text-sm opacity-60">
                {{ r.clientName ?? 'Cliente da scegliere' }} · {{ formatDay(r.updatedAt) }}
              </span>
            </span>
            <span class="font-mono text-sm tabular-nums">{{ formatEuro(r.total) }}</span>
            <QuoteStatusPill :status="r.displayStatus" />
          </NuxtLink>
        </li>
      </ul>
    </main>
  </AdminShell>
</template>
