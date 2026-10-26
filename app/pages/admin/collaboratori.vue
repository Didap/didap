<script setup lang="ts">
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'
import AdminField from '~/components/admin/AdminField.vue'
import AdminShell from '~/components/admin/AdminShell.vue'
import AdminSwitch from '~/components/admin/AdminSwitch.vue'
import { adminErrorText } from '~/utils/adminErrors'
import { formatDateTime } from '~/utils/format'
import { ADMIN_PAGES, ADMIN_PAGE_INFO, type AdminPage, type AdminUserRow, type UserStatus } from '#shared/users'

// Collaboratori del pannello: chi entra e quali pagine vede
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Collaboratori - Admin Didap' })

await useAdminSession()
const session = useAdminSessionState()
const { notify } = useAdminToast()

type Form = { name: string, email: string, pages: AdminPage[], active: boolean }

const users = ref<AdminUserRow[] | null>(null)
const editing = ref<{ id: string | null, form: Form } | null>(null)
// Link d'invito da dare a mano quando l'email non è partita
const inviteUrl = ref<string | null>(null)
const busy = ref(false)
const confirmDelete = ref(false)

const myId = computed(() => (session.value?.authenticated ? session.value.user?.id ?? null : null))
const isSelf = computed(() => !!editing.value?.id && editing.value.id === myId.value)
const current = computed(() => users.value?.find((u) => u.id === editing.value?.id) ?? null)

const STATUS_LABELS: Record<UserStatus, string> = {
  attivo: 'Attivo',
  invito: 'Invito in attesa',
  disattivato: 'Disattivato',
}
const STATUS_CLASS: Record<UserStatus, string> = {
  attivo: 'border border-current',
  invito: 'bg-banana text-ink',
  disattivato: 'border border-dashed border-current opacity-70',
}

const SELF_PAGE_TITLE = 'Non puoi togliere a te stesso l\'accesso a Collaboratori'
const SELF_ACTIVE_TITLE = 'Non puoi disattivare il tuo account'
const SELF_DELETE_TITLE = 'Non puoi eliminare il tuo account'

const pageLabels = (pages: AdminPage[]) =>
  pages.length ? pages.map((p) => ADMIN_PAGE_INFO[p].label).join(', ') : 'Nessuna pagina'
const lastLogin = (u: AdminUserRow) => (u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'mai')

async function load() {
  try {
    users.value = await $fetch<AdminUserRow[]>('/api/admin/users')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
}

onAdminReady(load)

function edit(user: AdminUserRow | null) {
  confirmDelete.value = false
  inviteUrl.value = null
  editing.value = user
    ? { id: user.id, form: { name: user.name, email: user.email, pages: [...user.pages], active: user.status !== 'disattivato' } }
    : { id: null, form: { name: '', email: '', pages: [], active: true } }
}

// Caselle delle pagine: l'elenco resta nell'ordine del menu
function togglePage(page: AdminPage, on: boolean) {
  if (!editing.value) return
  const pages = editing.value.form.pages
  editing.value.form.pages = ADMIN_PAGES.filter((p) => (p === page ? on : pages.includes(p)))
}

const canSave = computed(() => {
  const f = editing.value?.form
  return !!f && !!f.name.trim() && (!!editing.value?.id || !!f.email.trim())
})

async function save() {
  if (!editing.value || !canSave.value) return
  busy.value = true
  try {
    const { id, form } = editing.value
    if (id) {
      await $fetch<AdminUserRow>(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: { name: form.name, pages: form.pages, active: form.active },
      })
      await load()
      // Il proprio nome o le proprie pagine cambiano anche la barra in alto
      if (id === myId.value) await refreshAdminSession()
      reselect(id)
      notify('ok', 'Collaboratore salvato')
    }
    else {
      const res = await $fetch<{ user: AdminUserRow, inviteUrl: string | null }>('/api/admin/users', {
        method: 'POST',
        body: { name: form.name, email: form.email, pages: form.pages },
      })
      await load()
      reselect(res.user.id)
      showInvite(res.inviteUrl, 'Collaboratore aggiunto')
    }
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
  }
}

// Riapre la scheda con i dati appena ricaricati
function reselect(id: string) {
  const row = users.value?.find((u) => u.id === id)
  if (row) edit(row)
  else editing.value = null
}

// Senza link l'invito è partito per email; con il link va dato a mano
function showInvite(url: string | null, done: string) {
  inviteUrl.value = url
  notify('ok', url ? `${done}. Copia il link d'invito` : 'Invito inviato')
}

async function resendInvite() {
  if (!editing.value?.id) return
  const id = editing.value.id
  busy.value = true
  try {
    const res = await $fetch<{ inviteUrl: string | null }>(`/api/admin/users/${id}/invite`, { method: 'POST' })
    await load()
    reselect(id)
    showInvite(res.inviteUrl, 'Nuovo invito pronto')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
  }
}

async function copyInvite() {
  if (!inviteUrl.value) return
  try {
    await navigator.clipboard.writeText(inviteUrl.value)
    notify('ok', 'Link copiato')
  }
  catch {
    notify('error', 'Copia non riuscita: seleziona il link e copialo a mano')
  }
}

async function remove() {
  if (!editing.value?.id) return
  busy.value = true
  try {
    await $fetch(`/api/admin/users/${editing.value.id}`, { method: 'DELETE' })
    editing.value = null
    inviteUrl.value = null
    await load()
    notify('ok', 'Collaboratore eliminato')
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
      lg:grid-cols-[340px_minmax(0,1fr)]
    ">
      <nav
        class="
          flex flex-col gap-3 border-b border-ink/10 bg-paper-light p-4
          lg:border-r lg:border-b-0
        "
        aria-label="Collaboratori"
      >
        <div class="flex items-center justify-between gap-3">
          <h1 class="text-xl font-bold">
            Collaboratori
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
            + Aggiungi
          </button>
        </div>
        <ul class="flex flex-col gap-1">
          <li
            v-for="u in users ?? []"
            :key="u.id"
          >
            <button
              type="button"
              class="
                flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left
                transition
              "
              :class="editing?.id === u.id ? 'bg-ink text-paper-light' : `
                hover:bg-ink/5
              `"
              @click="edit(u)"
            >
              <span class="flex items-center justify-between gap-2">
                <span class="truncate font-medium">
                  {{ u.name }}<span
                    v-if="u.id === myId"
                    class="font-normal opacity-60"
                  > (tu)</span>
                </span>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="STATUS_CLASS[u.status]"
                >{{ STATUS_LABELS[u.status] }}</span>
              </span>
              <span class="truncate text-xs opacity-70">{{ u.email }}</span>
              <span class="text-xs opacity-70">{{ pageLabels(u.pages) }}</span>
              <span class="text-xs opacity-50">Ultimo accesso: {{ lastLogin(u) }}</span>
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
          Scegli un collaboratore da modificare o aggiungine uno nuovo.
        </p>
        <form
          v-else
          class="flex max-w-2xl flex-col gap-5"
          @submit.prevent="save"
        >
          <div class="flex flex-col gap-1">
            <h2 class="text-2xl font-bold">
              {{ editing.id ? current?.name || 'Collaboratore' : 'Nuovo collaboratore' }}
            </h2>
            <p
              v-if="current"
              class="text-sm opacity-60"
            >
              {{ STATUS_LABELS[current.status] }} · aggiunto il {{ formatDateTime(current.createdAt) }} · ultimo accesso: {{ lastLogin(current) }}
            </p>
            <p
              v-else
              class="text-sm opacity-60"
            >
              Riceverà un invito per scegliere la sua password.
            </p>
          </div>

          <!-- Link d'invito quando l'email non è partita -->
          <div
            v-if="inviteUrl"
            class="flex flex-col gap-3 rounded-2xl bg-banana/40 p-4"
          >
            <p class="text-sm">
              L'email d'invito non è partita. Copia il link e mandalo tu alla persona:
              vale 7 giorni e si usa una volta sola.
            </p>
            <div class="flex flex-wrap gap-2">
              <input
                :value="inviteUrl"
                readonly
                aria-label="Link d'invito"
                class="admin-input min-w-0 flex-1"
                @focus="($event.target as HTMLInputElement).select()"
              >
              <button
                type="button"
                class="
                  rounded-full bg-ink px-4 py-2 text-sm font-medium
                  text-paper-light
                  hover:bg-green
                "
                @click="copyInvite"
              >
                Copia
              </button>
            </div>
          </div>

          <AdminField label="Nome">
            <input
              v-model="editing.form.name"
              required
              maxlength="120"
              class="admin-input"
            >
          </AdminField>
          <AdminField
            v-if="!editing.id"
            label="Email"
          >
            <input
              v-model="editing.form.email"
              type="email"
              required
              maxlength="200"
              autocomplete="off"
              class="admin-input"
            >
          </AdminField>
          <div
            v-else
            class="flex flex-col gap-1.5"
          >
            <span class="text-sm font-medium">Email</span>
            <span class="wrap-break-word">{{ editing.form.email }}</span>
          </div>

          <fieldset class="flex flex-col gap-2">
            <legend class="mb-1.5 text-sm font-medium">
              Pagine
            </legend>
            <div class="
              grid gap-2
              sm:grid-cols-2
            ">
              <label
                v-for="p in ADMIN_PAGES"
                :key="p"
                class="flex items-center gap-2 text-sm"
                :class="isSelf && p === 'collaboratori' ? `
                  cursor-not-allowed opacity-50
                ` : ''"
                :title="isSelf && p === 'collaboratori' ? SELF_PAGE_TITLE : undefined"
              >
                <input
                  type="checkbox"
                  class="accent-green"
                  :checked="editing.form.pages.includes(p)"
                  :disabled="isSelf && p === 'collaboratori'"
                  @change="togglePage(p, ($event.target as HTMLInputElement).checked)"
                >
                {{ ADMIN_PAGE_INFO[p].label }}
              </label>
            </div>
            <span class="text-xs opacity-55">
              Con Collaboratori può anche aggiungere persone e cambiare le pagine degli altri.
            </span>
          </fieldset>

          <div
            v-if="editing.id"
            class="flex flex-col gap-1.5"
          >
            <AdminSwitch
              v-model="editing.form.active"
              label="Attivo"
              :disabled="isSelf"
              :title="isSelf ? SELF_ACTIVE_TITLE : undefined"
            />
            <span class="text-xs opacity-55">
              Da disattivato non può entrare e le sue sessioni si chiudono.
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              class="
                rounded-full bg-green px-6 py-3 font-medium text-paper-light
                hover:bg-ink
                disabled:opacity-50
              "
              :disabled="busy || !canSave"
            >
              {{ editing.id ? 'Salva' : 'Aggiungi e invita' }}
            </button>
            <button
              v-if="current?.status === 'invito'"
              type="button"
              class="
                rounded-full border border-ink/20 px-4 py-2 text-sm
                hover:border-ink
                disabled:opacity-50
              "
              :disabled="busy"
              @click="resendInvite"
            >
              Rimanda invito
            </button>
            <span
              v-if="editing.id"
              :title="isSelf ? SELF_DELETE_TITLE : undefined"
            >
              <button
                type="button"
                class="
                  rounded-full px-4 py-2 text-sm text-red
                  hover:bg-red/10
                  disabled:cursor-not-allowed disabled:opacity-50
                  disabled:hover:bg-transparent
                "
                :disabled="busy || isSelf"
                @click="confirmDelete = true"
              >
                Elimina
              </button>
            </span>
          </div>
        </form>
      </main>
    </div>

    <AlertDialogRoot v-model:open="confirmDelete">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-ink/40" />
        <AlertDialogContent
          class="
            fixed top-1/2 left-1/2 z-50 w-[calc(100%-3rem)] max-w-md
            -translate-1/2 rounded-2xl bg-white p-6
          "
        >
          <AlertDialogTitle class="text-xl font-bold">
            Eliminare {{ current?.name || 'il collaboratore' }}?
          </AlertDialogTitle>
          <AlertDialogDescription class="mt-2 opacity-70">
            Non potrà più entrare nel pannello. Per farlo tornare servirà un nuovo invito.
          </AlertDialogDescription>
          <div class="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialogCancel
              class="
                rounded-full px-4 py-2 text-sm
                hover:bg-ink/5
              "
            >
              Annulla
            </AlertDialogCancel>
            <button
              type="button"
              class="
                rounded-full bg-red px-4 py-2 text-sm font-medium text-white
                disabled:opacity-50
              "
              :disabled="busy"
              @click="remove"
            >
              Sì, elimina
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </AdminShell>
</template>
