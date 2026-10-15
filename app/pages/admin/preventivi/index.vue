<script setup lang="ts">
import AdminShell from '~/components/admin/AdminShell.vue'
import QuoteStatusPill from '~/components/admin/QuoteStatusPill.vue'
import { adminErrorText } from '~/utils/adminErrors'
import { formatDay } from '~/utils/format'
import { formatEuro } from '#shared/money'
import { STATUS_LABELS, type DisplayStatus, type QuoteListRow } from '#shared/quote'

// Elenco dei preventivi, dal più recente
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Preventivi - Admin Didap' })

await useAdminSession()
const { notify } = useAdminToast()

const rows = ref<QuoteListRow[] | null>(null)
const filter = ref<DisplayStatus | 'all'>('all')
const query = ref('')
const creating = ref(false)
const FILTERS = ['all', 'draft', 'sent', 'expired', 'accepted', 'rejected'] as const

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (rows.value ?? []).filter((r) =>
    (filter.value === 'all' || r.displayStatus === filter.value)
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
        <button
          v-for="f in FILTERS"
          :key="f"
          type="button"
          class="rounded-full px-3 py-1.5 text-sm"
          :class="filter === f ? 'bg-ink text-paper-light' : `
            border border-ink/20
            hover:border-ink
          `"
          :aria-pressed="filter === f"
          @click="filter = f"
        >
          {{ f === 'all' ? 'Tutti' : STATUS_LABELS[f] }}
        </button>
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
