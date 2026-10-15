<script setup lang="ts">
import AdminField from '~/components/admin/AdminField.vue'
import AdminShell from '~/components/admin/AdminShell.vue'
import { adminErrorText } from '~/utils/adminErrors'
import { emptyClient, type Client, type ClientInput } from '#shared/clients'

// Anagrafica clienti dei preventivi
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Clienti - Admin Didap' })

await useAdminSession()
const { notify } = useAdminToast()

const clients = ref<Client[] | null>(null)
const editing = ref<{ id: string | null; form: ClientInput } | null>(null)
const query = ref('')
const busy = ref(false)
const confirmDelete = ref(false)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const all = clients.value ?? []
  return q
    ? all.filter((c) => [c.name, c.vatNumber, c.contactName, c.email].some((v) => v.toLowerCase().includes(q)))
    : all
})

async function load() {
  try {
    clients.value = await $fetch<Client[]>('/api/admin/clients')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
}

onAdminReady(load)

function edit(client: Client | null) {
  confirmDelete.value = false
  if (!client) {
    editing.value = { id: null, form: emptyClient() }
    return
  }
  const { id, ...form } = client
  editing.value = { id, form }
}

async function save() {
  if (!editing.value) return
  busy.value = true
  try {
    const { id, form } = editing.value
    const saved = await $fetch<Client>(id ? `/api/admin/clients/${id}` : '/api/admin/clients', {
      method: id ? 'PUT' : 'POST',
      body: form,
    })
    await load()
    edit(saved)
    notify('ok', 'Cliente salvato')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
  }
}

async function remove() {
  if (!editing.value?.id) return
  busy.value = true
  try {
    await $fetch(`/api/admin/clients/${editing.value.id}`, { method: 'DELETE' })
    editing.value = null
    await load()
    notify('ok', 'Cliente eliminato')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
    confirmDelete.value = false
  }
}

const FIELDS = [
  { key: 'vatNumber', label: 'Partita IVA', max: 40 },
  { key: 'taxCode', label: 'Codice fiscale', max: 40 },
  { key: 'sdiPec', label: 'Codice SDI o PEC', max: 200 },
  { key: 'contactName', label: 'Referente', max: 200 },
  { key: 'email', label: 'Email', max: 200 },
  { key: 'phone', label: 'Telefono', max: 60 },
] as const
</script>

<template>
  <AdminShell>
    <div class="
      grid flex-1 grid-cols-[minmax(0,1fr)]
      lg:grid-cols-[320px_minmax(0,1fr)]
    ">
      <nav
        class="
          flex flex-col gap-3 border-b border-ink/10 bg-paper-light p-4
          lg:border-r lg:border-b-0
        "
        aria-label="Clienti"
      >
        <div class="flex items-center justify-between gap-3">
          <h1 class="text-xl font-bold">
            Clienti
          </h1>
          <button
            type="button"
            class="
              rounded-full bg-green px-4 py-2 text-sm font-medium
              text-paper-light
              hover:bg-ink
            "
            @click="edit(null)"
          >
            + Nuovo
          </button>
        </div>
        <input
          v-model="query"
          type="search"
          placeholder="Cerca"
          aria-label="Cerca cliente"
          class="admin-input"
        >
        <p
          v-if="clients && !clients.length"
          class="px-1 text-sm opacity-60"
        >
          Nessun cliente. Aggiungi il primo con "Nuovo".
        </p>
        <ul class="flex flex-col gap-1">
          <li
            v-for="c in filtered"
            :key="c.id"
          >
            <button
              type="button"
              class="w-full rounded-xl px-3 py-2.5 text-left transition"
              :class="editing?.id === c.id ? 'bg-ink text-paper-light' : `
                hover:bg-ink/5
              `"
              @click="edit(c)"
            >
              <span class="block font-medium">{{ c.name }}</span>
              <span
                v-if="c.contactName || c.vatNumber"
                class="block text-xs opacity-70"
              >{{ c.contactName || c.vatNumber }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <main class="
        p-6
        lg:p-10
      ">
        <p
          v-if="!editing"
          class="opacity-60"
        >
          Scegli un cliente da modificare o aggiungine uno nuovo.
        </p>
        <form
          v-else
          class="flex max-w-2xl flex-col gap-5"
          @submit.prevent="save"
        >
          <h2 class="text-2xl font-bold">
            {{ editing.id ? editing.form.name || 'Cliente' : 'Nuovo cliente' }}
          </h2>
          <AdminField label="Ragione sociale">
            <input
              v-model="editing.form.name"
              required
              maxlength="200"
              class="admin-input"
            >
          </AdminField>
          <div class="
            grid gap-5
            sm:grid-cols-2
          ">
            <AdminField
              v-for="f in FIELDS"
              :key="f.key"
              :label="f.label"
            >
              <input
                v-model="editing.form[f.key]"
                :maxlength="f.max"
                class="admin-input"
              >
            </AdminField>
          </div>
          <AdminField label="Indirizzo">
            <textarea
              v-model="editing.form.address"
              rows="2"
              maxlength="500"
              class="admin-input"
            />
          </AdminField>
          <AdminField
            label="Note interne"
            hint="Non compaiono nel preventivo."
          >
            <textarea
              v-model="editing.form.notes"
              rows="3"
              maxlength="5000"
              class="admin-input"
            />
          </AdminField>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              class="
                rounded-full bg-green px-6 py-3 font-medium text-paper-light
                hover:bg-ink
                disabled:opacity-50
              "
              :disabled="busy || !editing.form.name.trim()"
            >
              Salva
            </button>
            <template v-if="editing.id">
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
                <span class="text-sm">Eliminare il cliente?</span>
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
            </template>
          </div>
        </form>
      </main>
    </div>
  </AdminShell>
</template>
