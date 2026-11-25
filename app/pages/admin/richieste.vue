<script setup lang="ts">
import AdminShell from '~/components/admin/AdminShell.vue'
import { adminErrorText } from '~/utils/adminErrors'
import { telHref, type ProjectType } from '#shared/contact'
import type { DidiRequest, RequestStatus } from '#shared/didi-requests'

// Le richieste arrivate dalla chat con Didi: chi, come richiamarlo, cosa
// vuole (spiegato dal modello) e la conversazione intera
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Richieste - Admin Didap' })

await useAdminSession()
const { notify } = useAdminToast()

const requests = ref<DidiRequest[] | null>(null)
const selectedId = ref<string | null>(null)
const query = ref('')
const busy = ref(false)
const confirmDelete = ref(false)

const TYPE_LABELS: Record<ProjectType, string> = {
  product: 'Un prodotto nuovo',
  app: 'App o SaaS',
  site: 'Un sito',
  grant: 'Cerca un bando',
}

const selected = computed(() => requests.value?.find(r => r.id === selectedId.value) ?? null)
const newCount = computed(() => requests.value?.filter(r => r.status === 'new').length ?? 0)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const all = requests.value ?? []
  return q
    ? all.filter(r => [r.name, r.contact, r.summary].some(v => v.toLowerCase().includes(q)))
    : all
})

const date = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const contactHref = (r: DidiRequest) => r.contactKind === 'email' ? `mailto:${encodeURIComponent(r.contact)}` : telHref(r.contact)

async function load() {
  try {
    requests.value = await $fetch<DidiRequest[]>('/api/admin/requests')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
}

onAdminReady(load)

function open(r: DidiRequest) {
  confirmDelete.value = false
  selectedId.value = r.id
}

async function setStatus(status: RequestStatus) {
  if (!selected.value) return
  busy.value = true
  try {
    const saved = await $fetch<DidiRequest>(`/api/admin/requests/${selected.value.id}`, { method: 'PUT', body: { status } })
    requests.value = requests.value?.map(r => r.id === saved.id ? saved : r) ?? null
    notify('ok', status === 'done' ? 'Segnata come gestita' : 'Di nuovo da gestire')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
  }
}

async function remove() {
  if (!selected.value) return
  busy.value = true
  try {
    await $fetch(`/api/admin/requests/${selected.value.id}`, { method: 'DELETE' })
    selectedId.value = null
    await load()
    notify('ok', 'Richiesta eliminata')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
    confirmDelete.value = false
  }
}
</script>

<template>
  <AdminShell>
    <div class="
      grid flex-1 grid-cols-[minmax(0,1fr)]
      lg:grid-cols-[360px_minmax(0,1fr)]
    ">
      <nav
        class="
          flex flex-col gap-3 border-b border-ink/10 bg-paper-light p-4
          lg:border-r lg:border-b-0
        "
        aria-label="Richieste"
      >
        <div class="flex items-baseline justify-between gap-3">
          <h1 class="text-xl font-bold">
            Richieste
          </h1>
          <span
            v-if="newCount"
            class="
              rounded-full bg-red px-2.5 py-0.5 text-xs font-medium
              text-paper-light
            "
          >{{ newCount }} da gestire</span>
        </div>
        <input
          v-model="query"
          type="search"
          placeholder="Cerca"
          aria-label="Cerca richiesta"
          class="admin-input"
        >
        <p
          v-if="requests && !requests.length"
          class="px-1 text-sm opacity-60"
        >
          Nessuna richiesta. Arrivano qui quando un cliente lascia la sua idea a Didi.
        </p>
        <ul class="flex flex-col gap-1">
          <li
            v-for="r in filtered"
            :key="r.id"
          >
            <button
              type="button"
              class="w-full rounded-xl px-3 py-2.5 text-left transition"
              :class="selectedId === r.id ? 'bg-ink text-paper-light' : `
                hover:bg-ink/5
              `"
              @click="open(r)"
            >
              <span class="flex items-center gap-2">
                <span
                  v-if="r.status === 'new'"
                  class="size-2 shrink-0 rounded-full bg-red"
                  aria-label="Da gestire"
                />
                <span class="truncate font-medium">{{ r.name }}</span>
                <span class="ml-auto shrink-0 text-xs opacity-60">{{ date(r.createdAt) }}</span>
              </span>
              <span class="mt-0.5 line-clamp-2 block text-xs opacity-70">{{ r.summary }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <main class="
        p-6
        lg:p-10
      ">
        <p
          v-if="!selected"
          class="opacity-60"
        >
          Scegli una richiesta per leggere cosa vuole il cliente e la sua chat con Didi.
        </p>
        <article
          v-else
          class="flex max-w-3xl flex-col gap-8"
        >
          <header class="flex flex-col gap-3">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-2xl font-bold">
                {{ selected.name }}
              </h2>
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="selected.status === 'new' ? 'bg-red text-paper-light' : `
                  bg-ink/10
                `"
              >{{ selected.status === 'new' ? 'Da gestire' : 'Gestita' }}</span>
            </div>
            <p class="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-70">
              <span>{{ date(selected.createdAt) }}</span>
              <span v-if="selected.projectType">{{ TYPE_LABELS[selected.projectType] }}</span>
              <span>{{ selected.locale === 'en' ? 'Dal sito in inglese' : 'Dal sito in italiano' }}</span>
              <span>{{ selected.emailSent ? 'Email inviata' : 'Email non inviata' }}</span>
            </p>
            <a
              :href="contactHref(selected)"
              class="
                self-start rounded-full bg-green px-5 py-2.5 font-medium
                text-paper-light
                hover:bg-ink
              "
            >
              {{ selected.contactKind === 'email' ? 'Scrivi a' : 'Chiama' }} {{ selected.contact }}
            </a>
          </header>

          <section class="flex flex-col gap-2">
            <h3 class="text-sm font-bold tracking-wide uppercase opacity-60">
              Cosa vuole
            </h3>
            <p class="text-lg/relaxed whitespace-pre-line">
              {{ selected.summary }}
            </p>
          </section>

          <section class="flex flex-col gap-3">
            <h3 class="text-sm font-bold tracking-wide uppercase opacity-60">
              La chat con Didi
            </h3>
            <ol class="flex flex-col gap-2 rounded-3xl bg-ink/4 p-4">
              <li
                v-for="(m, i) in selected.transcript"
                :key="i"
                class="
                  max-w-[80%] rounded-[20px] px-4 py-2.5 text-[15px]/snug
                  wrap-break-word
                "
                :class="m.role === 'user'
                  ? 'self-end rounded-br-md bg-green text-paper-light'
                  : 'self-start rounded-bl-md bg-paper-light text-ink'"
              >
                <span class="mb-0.5 block text-xs opacity-60">{{ m.role === 'user' ? selected.name : 'Didi' }}</span>
                {{ m.content }}
              </li>
            </ol>
          </section>

          <div class="flex flex-wrap items-center gap-3">
            <button
              v-if="selected.status === 'new'"
              type="button"
              class="
                rounded-full bg-ink px-6 py-3 font-medium text-paper-light
                hover:bg-green
                disabled:opacity-50
              "
              :disabled="busy"
              @click="setStatus('done')"
            >
              Segna come gestita
            </button>
            <button
              v-else
              type="button"
              class="
                rounded-full border border-ink px-6 py-3 font-medium
                hover:bg-ink/5
                disabled:opacity-50
              "
              :disabled="busy"
              @click="setStatus('new')"
            >
              Di nuovo da gestire
            </button>
            <button
              v-if="!confirmDelete"
              type="button"
              class="
                rounded-full px-4 py-2 text-sm text-red
                hover:bg-red/10
              "
              @click="confirmDelete = true"
            >
              Elimina
            </button>
            <template v-else>
              <span class="text-sm">Eliminare la richiesta?</span>
              <button
                type="button"
                class="rounded-full bg-red px-4 py-2 text-sm text-white"
                :disabled="busy"
                @click="remove"
              >
                Sì, elimina
              </button>
              <button
                type="button"
                class="rounded-full px-4 py-2 text-sm"
                @click="confirmDelete = false"
              >
                Annulla
              </button>
            </template>
          </div>
        </article>
      </main>
    </div>
  </AdminShell>
</template>
