<script setup lang="ts">
import { useDebouncedRefHistory, useEventListener, watchDebounced } from '@vueuse/core'
import PreviewPane from '~/components/admin/PreviewPane.vue'
import ProductForm from '~/components/admin/ProductForm.vue'
import StatusPill from '~/components/StatusPill.vue'
import type { ProductLocale, ProductOverride } from '#shared/product'
import {
  formSignature,
  fromAdminForm,
  toAdminForm,
} from '~/utils/adminForm'
import type { AdminForm, AdminSource } from '~/utils/adminForm'

// /admin: modifica delle schede prodotto con anteprima live.
// Le modifiche vanno nel database e si sovrappongono al markdown;
// "Ripristina originale" torna al markdown.
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Admin - Didap' })

const route = useRoute()
const router = useRouter()

const { data: session, refresh: refreshSession } = await useFetch('/api/admin/session')

// ---- Login ---------------------------------------------------------------
const password = ref('')
const loginError = ref('')
const loggingIn = ref(false)

async function login() {
  loggingIn.value = true
  loginError.value = ''
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    password.value = ''
    await refreshSession()
    await refreshEdits()
  }
  catch (err) {
    loginError.value = (err as { statusMessage?: string }).statusMessage ?? 'Accesso non riuscito'
  }
  finally {
    loggingIn.value = false
  }
}

async function logout() {
  await guard(async () => {
    await $fetch('/api/admin/logout', { method: 'POST' })
    form.value = null
    await router.replace({ query: {} })
    await refreshSession()
  })
}

// ---- Prodotti e modifiche salvate -----------------------------------------
const slugOf = (stem: string) => stem.split('/').pop() ?? ''

const { data: productRows, error: productsError } = await useAsyncData('admin-products', () =>
  queryCollection('work_it')
    .order('order', 'ASC')
    .select('stem', 'title', 'role', 'status')
    .all(),
)

const { data: edits, refresh: refreshEdits } = await useFetch('/api/admin/products', {
  immediate: !!session.value?.authenticated,
  default: () => [] as {
    slug: string
    locale: string
    updatedAt: string
    title?: string
    status?: 'live' | 'pilot' | 'pending' | null
  }[],
})

// Nome e stato mostrati nell'elenco: quelli salvati in italiano, se ci sono
const products = computed(() =>
  (productRows.value ?? []).map((p) => {
    const slug = slugOf(p.stem)
    const it = (edits.value ?? []).find((e) => e.slug === slug && e.locale === 'it')
    return {
      ...p,
      slug,
      title: it?.title || p.title,
      status: it && it.status !== undefined ? it.status : p.status,
    }
  }),
)
const editedLocales = (slug: string) =>
  new Set((edits.value ?? []).filter((e) => e.slug === slug).map((e) => e.locale))

const selected = computed(() =>
  typeof route.query.p === 'string' ? route.query.p : null,
)
const locale = computed<ProductLocale>(() => (route.query.lang === 'en' ? 'en' : 'it'))
const current = computed(() => products.value.find((p) => p.slug === selected.value))

// ---- Form e stato --------------------------------------------------------
const form = ref<AdminForm | null>(null)
const savedSignature = ref('')
const updatedAt = ref<string | null>(null)
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')

const dirty = computed(() => !!form.value && formSignature(form.value) !== savedSignature.value)
const draft = computed<ProductOverride | null>(() => (form.value ? fromAdminForm(form.value) : null))
const hasOverride = computed(() => !!updatedAt.value)

// ---- Annulla / ripeti (Ctrl+Z, Ctrl+Shift+Z) --------------------------------
const history = useDebouncedRefHistory(form, {
  deep: true,
  clone: true,
  debounce: 400,
  capacity: 100,
})
// Nuovo prodotto caricato: la cronologia riparte da qui
function resetHistory(next: AdminForm | null) {
  history.pause()
  form.value = next
  history.resume()
  history.commit()
  history.clear()
}

// ---- Bozza di sicurezza nel browser ---------------------------------------
// Le modifiche non salvate restano nel browser: se la scheda si chiude,
// alla riapertura si possono recuperare.
const backupKey = computed(() =>
  selected.value ? `didap-admin-bozza:${selected.value}:${locale.value}` : '',
)
const restorable = ref<{ form: AdminForm; at: number } | null>(null)

function readBackup(): { base: string; form: AdminForm; at: number } | null {
  try {
    const raw = backupKey.value ? localStorage.getItem(backupKey.value) : null
    return raw ? JSON.parse(raw) : null
  }
  catch {
    return null
  }
}
function dropBackup() {
  try {
    if (backupKey.value) localStorage.removeItem(backupKey.value)
  }
  catch {}
}

watchDebounced(
  [form, dirty],
  () => {
    if (!backupKey.value || !form.value || restorable.value) return
    try {
      if (dirty.value) {
        localStorage.setItem(
          backupKey.value,
          JSON.stringify({ base: savedSignature.value, form: form.value, at: Date.now() }),
        )
      }
      else localStorage.removeItem(backupKey.value)
    }
    catch {}
  },
  { debounce: 600, deep: true },
)

function restoreBackup() {
  if (!restorable.value) return
  form.value = restorable.value.form
  restorable.value = null
  notify('ok', 'Bozza ripristinata: ricordati di salvare')
}
function ignoreBackup() {
  restorable.value = null
  dropBackup()
}

async function load() {
  resetHistory(null)
  restorable.value = null
  loadError.value = ''
  if (!selected.value || !session.value?.authenticated) return
  loading.value = true
  try {
    const slug = selected.value
    const [base, override] = await Promise.all([
      queryCollection(`work_${locale.value}`).where('stem', 'LIKE', `%/${slug}`).first(),
      $fetch<{ data: ProductOverride; updatedAt: string } | null>(`/api/admin/products/${slug}`, {
        query: { locale: locale.value },
      }),
    ])
    if (!base) throw createError({ statusMessage: 'Prodotto non trovato' })
    const loaded = toAdminForm(mergeProduct(base as AdminSource, override?.data))
    savedSignature.value = formSignature(loaded)
    updatedAt.value = override?.updatedAt ?? null
    resetHistory(loaded)
    const backup = readBackup()
    if (backup && backup.base === savedSignature.value && formSignature(backup.form) !== savedSignature.value) {
      restorable.value = { form: backup.form, at: backup.at }
    }
    else if (backup) dropBackup()
  }
  catch (err) {
    loadError.value = errorText(err)
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  watch([selected, locale, () => session.value?.authenticated], load, { immediate: true })
})

// ---- Messaggi ------------------------------------------------------------
const toast = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined
function notify(kind: 'ok' | 'error', text: string) {
  toast.value = { kind, text }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), kind === 'ok' ? 2500 : 6000)
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Nome',
  url: 'Sito del prodotto',
  role: 'Categoria',
  scope: 'Ruolo',
  stack: 'Stack',
  lede: 'Frase di apertura',
  logo: 'Logo',
  hero: 'Immagine di testata',
  intro: 'Racconto',
  challenge: 'La cosa difficile',
  features: 'Cosa fa',
  model: 'Modello',
  media: 'Immagini',
}

function errorText(err: unknown) {
  const e = err as {
    statusCode?: number
    statusMessage?: string
    data?: { data?: { fieldErrors?: Record<string, string[]> } }
  }
  if (e.statusCode === 401) {
    refreshSession()
    return 'Sessione scaduta, accedi di nuovo'
  }
  const fields = Object.keys(e.data?.data?.fieldErrors ?? {})
  if (e.statusCode === 422 && fields.length) {
    return `Controlla: ${fields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}`
  }
  return e.statusMessage ?? 'Operazione non riuscita'
}

// ---- Azioni --------------------------------------------------------------
async function save() {
  if (!form.value || !selected.value || saving.value) return false
  saving.value = true
  try {
    const snapshot = formSignature(form.value)
    const res = await $fetch<{ updatedAt: string }>(`/api/admin/products/${selected.value}`, {
      method: 'PUT',
      query: { locale: locale.value },
      body: fromAdminForm(form.value),
    })
    savedSignature.value = snapshot
    updatedAt.value = res.updatedAt
    dropBackup()
    refreshEdits()
    notify('ok', 'Salvato. La pagina è già aggiornata.')
    return true
  }
  catch (err) {
    notify('error', errorText(err))
    return false
  }
  finally {
    saving.value = false
  }
}

async function discard() {
  dropBackup()
  await load()
  notify('ok', 'Modifiche annullate')
}

const confirmReset = ref(false)
async function reset() {
  if (!selected.value) return
  confirmReset.value = false
  saving.value = true
  try {
    await $fetch(`/api/admin/products/${selected.value}`, {
      method: 'DELETE',
      query: { locale: locale.value },
    })
    dropBackup()
    await load()
    refreshEdits()
    notify('ok', 'Tornato al contenuto originale')
  }
  catch (err) {
    notify('error', errorText(err))
  }
  finally {
    saving.value = false
  }
}

// Modifiche non salvate: chiede cosa fare prima di cambiare prodotto o lingua
const pending = ref<null | (() => Promise<void> | void)>(null)
async function guard(action: () => Promise<void> | void) {
  if (dirty.value) pending.value = action
  else await action()
}
async function resolvePending(choice: 'save' | 'discard' | 'cancel') {
  const action = pending.value
  pending.value = null
  if (!action || choice === 'cancel') return
  if (choice === 'save' && !(await save())) return
  if (choice === 'discard') {
    savedSignature.value = formSignature(form.value)
    dropBackup()
  }
  await action()
}

const open = (slug: string | null, lang: ProductLocale = locale.value) =>
  guard(async () => {
    await router.replace({ query: slug ? { p: slug, ...(lang === 'en' ? { lang } : {}) } : {} })
  })

const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLElement
  && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

useEventListener('keydown', (e: KeyboardEvent) => {
  const mod = e.ctrlKey || e.metaKey
  const key = e.key.toLowerCase()
  if (mod && key === 's') {
    e.preventDefault()
    if (dirty.value) save()
  }
  // Nei campi di testo Ctrl+Z resta quello del browser (annulla la digitazione)
  if (mod && !isTextField(e.target) && form.value) {
    if (key === 'z' && !e.shiftKey && history.canUndo.value) {
      e.preventDefault()
      history.undo()
    }
    else if (((key === 'z' && e.shiftKey) || key === 'y') && history.canRedo.value) {
      e.preventDefault()
      history.redo()
    }
  }
  if (e.key === 'Escape') {
    pending.value = null
    confirmReset.value = false
    previewOpen.value = false
  }
})
useEventListener('beforeunload', (e: BeforeUnloadEvent) => {
  if (dirty.value) e.preventDefault()
})

// ---- Anteprima e navigazione tra sezioni ------------------------------------
const preview = useTemplateRef<InstanceType<typeof PreviewPane>>('preview')
const previewOpen = ref(false)

const SECTIONS = [
  { id: 'scheda', label: 'Scheda' },
  { id: 'testata', label: 'Testata' },
  { id: 'prodotto', label: 'Il prodotto' },
  { id: 'difficile', label: 'La cosa difficile' },
  { id: 'cosafa', label: 'Cosa fa' },
  { id: 'chiusura', label: 'Chiusura' },
]
const activeSection = ref('scheda')

function focusSection(id: string) {
  if (activeSection.value === id) return
  activeSection.value = id
  preview.value?.scrollTo(id)
}
function jumpTo(id: string, syncPreview = true) {
  document.getElementById(`sezione-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activeSection.value = id
  if (syncPreview) preview.value?.scrollTo(id)
}

// Clic su una parte dell'anteprima: apre e illumina il blocco del form
const highlighted = ref<string | null>(null)
let highlightTimer: ReturnType<typeof setTimeout> | undefined
async function onPreviewSelect(id: string) {
  previewOpen.value = false
  highlighted.value = id
  await nextTick()
  jumpTo(id, false)
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => (highlighted.value = null), 1800)
}

const others = computed(() =>
  products.value.filter((p) => p.slug !== selected.value).map(({ slug, title }) => ({ slug, title })),
)

const lastSaved = computed(() =>
  updatedAt.value
    ? new Date(updatedAt.value).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
    : null,
)
const STATUS_LABELS = { live: 'Live', pilot: 'Pilot', pending: 'Da confermare' } as const
</script>

<template>
  <div class="
    flex min-h-screen flex-col bg-paper
    lg:h-screen
  ">
    <!-- Barra -->
    <header class="
      flex h-14 shrink-0 items-center justify-between gap-4 border-b
      border-ink/10 bg-paper-light px-5
    ">
      <button
        type="button"
        class="flex items-center gap-3"
        @click="open(null)"
      >
        <img
          src="/brand/logo-contratto.svg"
          alt=""
          width="27"
          height="30"
          class="h-7 w-auto"
        >
        <span class="text-sm font-bold">Didap<span class="
          hidden
          sm:inline
        "> · Admin prodotti</span></span>
      </button>
      <div
        v-if="session?.authenticated"
        class="flex items-center gap-4 text-sm"
      >
        <a
          href="/"
          target="_blank"
          class="
            hidden opacity-60
            hover:opacity-100
            sm:inline
          "
        >Vai al sito ↗</a>
        <button
          type="button"
          class="
            rounded-full border border-ink/20 px-3 py-1
            hover:border-ink
          "
          @click="logout"
        >
          Esci
        </button>
      </div>
    </header>

    <!-- Stati di sistema -->
    <main
      v-if="!session?.configured || (!session?.database && !session?.authenticated)"
      class="flex flex-1 items-center justify-center p-6"
    >
      <div class="max-w-md rounded-2xl border border-ink/10 bg-white p-8">
        <h1 class="text-2xl font-bold">
          {{ !session?.configured ? 'Admin non configurato' : 'Database non disponibile' }}
        </h1>
        <p class="mt-3 opacity-70">
          <template v-if="!session?.configured">
            Imposta la variabile d'ambiente ADMIN_PASSWORD sul server per attivare l'accesso.
          </template>
          <template v-else>
            Imposta DATABASE_URL sul server o controlla che il database sia raggiungibile.
          </template>
        </p>
      </div>
    </main>

    <!-- Login -->
    <main
      v-else-if="!session?.authenticated"
      class="flex flex-1 items-center justify-center p-6"
    >
      <form
        class="
          flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-ink/10
          bg-white p-8
        "
        @submit.prevent="login"
      >
        <div>
          <h1 class="text-2xl font-bold">
            Accedi
          </h1>
          <p class="mt-1 text-sm opacity-60">
            Per modificare le pagine prodotto.
          </p>
        </div>
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium">Password</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            autofocus
            class="admin-input"
          >
        </label>
        <p
          v-if="loginError"
          class="text-sm text-red"
          role="alert"
        >
          {{ loginError }}
        </p>
        <button
          type="submit"
          class="
            rounded-full bg-green px-6 py-3 font-medium text-paper-light
            hover:bg-ink
            disabled:opacity-50
          "
          :disabled="loggingIn || !password"
        >
          {{ loggingIn ? 'Accesso…' : 'Entra' }}
        </button>
      </form>
    </main>

    <!-- App -->
    <div
      v-else
      class="
        grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)]
        lg:grid-cols-[260px_minmax(0,1fr)]
        2xl:grid-cols-[280px_minmax(0,720px)_minmax(0,1fr)]
      "
    >
      <!-- Elenco prodotti -->
      <nav
        class="
          border-b border-ink/10 bg-paper-light p-3
          lg:overflow-y-auto lg:border-r lg:border-b-0
        "
        aria-label="Prodotti"
      >
        <p class="
          px-3 pt-2 pb-3 text-xs font-medium tracking-wider uppercase opacity-50
        ">
          Prodotti
        </p>
        <ul class="
          flex gap-1 overflow-x-auto
          lg:flex-col
        ">
          <li
            v-for="p in products"
            :key="p.slug"
            class="shrink-0"
          >
            <button
              type="button"
              class="
                flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left
                transition
              "
              :class="selected === p.slug ? 'bg-ink text-paper-light' : `
                hover:bg-ink/5
              `"
              :aria-current="selected === p.slug ? 'page' : undefined"
              @click="open(p.slug)"
            >
              <span class="font-medium">{{ p.title }}</span>
              <span class="flex items-center gap-2 text-xs opacity-70">
                <span>{{ p.role }}</span>
                <template
                  v-for="l in (['it', 'en'] as const)"
                  :key="l"
                >
                  <span
                    v-if="editedLocales(p.slug).has(l)"
                    class="
                      rounded-sm bg-banana px-1 font-medium text-ink uppercase
                    "
                    :title="`Modificato (${l.toUpperCase()})`"
                  >{{ l }}</span>
                </template>
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- Nessun prodotto -->
      <main
        v-if="!selected"
        class="
          p-6
          lg:overflow-y-auto lg:p-10
          2xl:col-span-2
        "
      >
        <h1 class="text-3xl font-bold">
          Pagine prodotto
        </h1>
        <p class="mt-2 max-w-xl opacity-60">
          Scegli un prodotto da modificare. Le modifiche sono online appena salvi;
          "Ripristina originale" torna ai testi di partenza.
        </p>
        <p
          v-if="productsError || !products.length"
          class="mt-8 rounded-2xl border border-red/30 bg-white p-5 text-red"
          role="alert"
        >
          Non riesco a leggere l'elenco dei prodotti. Ricarica la pagina; in sviluppo,
          se continua, riavvia il server dopo aver cancellato le cartelle .data e .nuxt.
        </p>
        <ul class="
          mt-8 grid gap-4
          sm:grid-cols-2
          xl:grid-cols-3
        ">
          <li
            v-for="p in products"
            :key="p.slug"
          >
            <button
              type="button"
              class="
                flex w-full flex-col gap-4 rounded-2xl border border-ink/10
                bg-white p-5 text-left transition
                hover:border-ink
              "
              @click="open(p.slug)"
            >
              <span class="flex items-center justify-between gap-3">
                <span class="text-xl font-bold">{{ p.title }}</span>
                <StatusPill
                  v-if="p.status"
                  :status="p.status"
                >
                  {{ STATUS_LABELS[p.status] }}
                </StatusPill>
              </span>
              <span class="flex items-center justify-between text-sm">
                <span class="opacity-60">{{ p.role }}</span>
                <span class="opacity-60">
                  {{ editedLocales(p.slug).size ? `Modificato (${[...editedLocales(p.slug)].join(', ').toUpperCase()})` : 'Originale' }}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </main>

      <!-- Editor -->
      <main
        v-else
        class="
          relative flex min-w-0 flex-col
          lg:overflow-y-auto
        "
      >
        <!-- Barra dell'editor -->
        <div class="
          sticky top-0 z-20 border-b border-ink/10 bg-paper/95 px-5 py-3
          backdrop-blur-sm
        ">
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="mr-auto text-xl font-bold">
              {{ current?.title ?? selected }}
            </h1>
            <div
              class="flex rounded-full bg-ink/5 p-1"
              role="tablist"
              aria-label="Lingua"
            >
              <button
                v-for="l in (['it', 'en'] as const)"
                :key="l"
                type="button"
                role="tab"
                :aria-selected="locale === l"
                class="
                  flex items-center gap-1.5 rounded-full px-3 py-1 text-sm
                  transition
                "
                :class="locale === l ? 'bg-white font-medium shadow-sm' : `
                  opacity-60
                  hover:opacity-100
                `"
                @click="locale !== l && open(selected, l)"
              >
                {{ l === 'it' ? 'Italiano' : 'English' }}
                <span
                  v-if="selected && editedLocales(selected).has(l)"
                  class="size-1.5 rounded-full bg-banana"
                  aria-label="modificato"
                />
              </button>
            </div>
            <button
              type="button"
              class="
                rounded-full border border-ink/20 px-4 py-2 text-sm
                hover:border-ink
                2xl:hidden
              "
              @click="previewOpen = true"
            >
              Anteprima
            </button>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-3">
            <p
              class="mr-auto flex items-center gap-2 text-sm"
              aria-live="polite"
            >
              <span
                class="size-2 rounded-full"
                :class="dirty ? 'bg-banana' : hasOverride ? 'bg-green' : `
                  bg-ink/30
                `"
              />
              <span v-if="saving">Salvo…</span>
              <span v-else-if="dirty">Modifiche non salvate</span>
              <span v-else-if="hasOverride">Salvato {{ lastSaved }}</span>
              <span
                v-else
                class="opacity-60"
              >Contenuto originale</span>
            </p>
            <div class="flex">
              <button
                type="button"
                class="admin-icon bg-transparent!"
                :disabled="!history.canUndo.value"
                aria-label="Annulla l'ultima modifica"
                title="Annulla (Ctrl+Z)"
                @click="history.undo()"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                ><path
                  d="M7 4L3 8l4 4M3.5 8H11a4 4 0 010 8H8"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </button>
              <button
                type="button"
                class="admin-icon bg-transparent!"
                :disabled="!history.canRedo.value"
                aria-label="Ripeti la modifica"
                title="Ripeti (Ctrl+Shift+Z)"
                @click="history.redo()"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                ><path
                  d="M11 4l4 4-4 4M14.5 8H7a4 4 0 000 8h3"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </button>
            </div>
            <button
              v-if="dirty"
              type="button"
              class="
                rounded-full px-4 py-2 text-sm
                hover:bg-ink/5
              "
              :disabled="saving"
              @click="discard"
            >
              Annulla modifiche
            </button>
            <button
              type="button"
              class="
                rounded-full bg-green px-5 py-2 text-sm font-medium
                text-paper-light transition
                hover:bg-ink
                disabled:cursor-not-allowed disabled:opacity-40
              "
              :disabled="!dirty || saving || !session.database"
              title="Salva (Ctrl+S)"
              @click="save"
            >
              Salva
            </button>
          </div>

          <!-- Sezioni -->
          <div class="-mx-5 mt-3 flex gap-1 overflow-x-auto px-5 pb-1">
            <button
              v-for="s in SECTIONS"
              :key="s.id"
              type="button"
              class="shrink-0 rounded-full px-3 py-1 text-sm transition"
              :class="activeSection === s.id ? 'bg-ink text-paper-light' : `
                bg-ink/5
                hover:bg-ink/10
              `"
              @click="jumpTo(s.id)"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <div class="flex-1 px-5 py-6">
          <p
            v-if="loading"
            class="opacity-60"
          >
            Carico…
          </p>
          <p
            v-else-if="loadError"
            class="text-red"
            role="alert"
          >
            {{ loadError }}
          </p>
          <template v-else-if="form">
            <div
              v-if="restorable"
              class="
                mb-5 flex flex-wrap items-center justify-between gap-3
                rounded-2xl bg-banana/25 p-4
              "
              role="alert"
            >
              <p class="text-sm">
                C'è una bozza non salvata del
                {{ new Date(restorable.at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) }}.
              </p>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="
                    rounded-full px-4 py-1.5 text-sm
                    hover:bg-ink/5
                  "
                  @click="ignoreBackup"
                >
                  Elimina
                </button>
                <button
                  type="button"
                  class="
                    rounded-full bg-ink px-4 py-1.5 text-sm font-medium
                    text-paper-light
                  "
                  @click="restoreBackup"
                >
                  Ripristina bozza
                </button>
              </div>
            </div>
            <ProductForm
              v-model="form"
              :others="others"
              :highlighted="highlighted"
              @focus="focusSection"
            />

            <p class="mt-6 text-xs/relaxed opacity-50">
              Ctrl+S salva · Ctrl+Z annulla · Ctrl+Shift+Z ripeti. Trascina un'immagine su un
              altro riquadro per scambiarle, trascina più file insieme per riempire un gruppo,
              incolla un'immagine con Ctrl+V sopra un riquadro. Le voci si spostano dalla maniglia.
            </p>

            <!-- Zona ripristino -->
            <div
              v-if="hasOverride"
              class="
                mt-8 flex flex-wrap items-center justify-between gap-4
                rounded-2xl border border-red/30 p-5
              "
            >
              <div>
                <p class="font-medium">
                  Ripristina il contenuto originale
                </p>
                <p class="text-sm opacity-60">
                  Cancella tutte le modifiche di questa lingua.
                </p>
              </div>
              <div class="flex gap-2">
                <template v-if="confirmReset">
                  <button
                    type="button"
                    class="
                      rounded-full px-4 py-2 text-sm
                      hover:bg-ink/5
                    "
                    @click="confirmReset = false"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    class="
                      rounded-full bg-red px-4 py-2 text-sm font-medium
                      text-white
                    "
                    :disabled="saving"
                    @click="reset"
                  >
                    Sì, ripristina
                  </button>
                </template>
                <button
                  v-else
                  type="button"
                  class="
                    rounded-full border border-red/40 px-4 py-2 text-sm text-red
                    hover:bg-red hover:text-white
                  "
                  @click="confirmReset = true"
                >
                  Ripristina originale
                </button>
              </div>
            </div>
          </template>
        </div>
      </main>

      <!-- Anteprima: colonna fissa sugli schermi larghi, pannello sopra gli altri -->
      <aside
        v-if="selected && form"
        class="
          fixed inset-0 z-40 flex-col bg-paper p-4
          2xl:static 2xl:z-auto 2xl:flex 2xl:border-l 2xl:border-ink/10
        "
        :class="previewOpen ? 'flex' : 'hidden'"
        aria-label="Anteprima"
      >
        <div class="
          mb-3 flex items-center justify-between
          2xl:hidden
        ">
          <span class="font-bold">Anteprima</span>
          <button
            type="button"
            class="rounded-full border border-ink/20 px-4 py-1.5 text-sm"
            @click="previewOpen = false"
          >
            Chiudi
          </button>
        </div>
        <PreviewPane
          ref="preview"
          @select="onPreviewSelect"
          class="min-h-0 flex-1"
          :slug="selected"
          :locale="locale"
          :draft="draft"
        />
      </aside>
    </div>

    <!-- Modifiche non salvate -->
    <div
      v-if="pending"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6">
        <h2
          id="unsaved-title"
          class="text-xl font-bold"
        >
          Modifiche non salvate
        </h2>
        <p class="mt-2 opacity-70">
          Vuoi salvarle prima di continuare?
        </p>
        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            class="
              rounded-full px-4 py-2 text-sm
              hover:bg-ink/5
            "
            @click="resolvePending('cancel')"
          >
            Resta qui
          </button>
          <button
            type="button"
            class="
              rounded-full border border-ink/20 px-4 py-2 text-sm
              hover:border-ink
            "
            @click="resolvePending('discard')"
          >
            Scarta
          </button>
          <button
            type="button"
            class="
              rounded-full bg-green px-4 py-2 text-sm font-medium
              text-paper-light
              hover:bg-ink
            "
            @click="resolvePending('save')"
          >
            Salva e continua
          </button>
        </div>
      </div>
    </div>

    <!-- Avvisi -->
    <Transition
      enter-from-class="translate-y-4 opacity-0"
      leave-to-class="translate-y-4 opacity-0"
      enter-active-class="transition"
      leave-active-class="transition"
    >
      <div
        v-if="toast"
        class="
          fixed bottom-6 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)]
          -translate-x-1/2 rounded-full px-5 py-3 text-sm font-medium shadow-lg
        "
        :class="toast.kind === 'ok' ? 'bg-ink text-paper-light' : `
          bg-red text-white
        `"
        role="status"
      >
        {{ toast.text }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
:deep(.admin-icon) {
  display: flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: #fff;
}

:deep(.admin-icon:hover:not(:disabled)) {
  background: var(--color-ink);
  color: var(--color-paper-light);
}

:deep(.admin-icon:disabled) {
  opacity: 0.3;
}
</style>
