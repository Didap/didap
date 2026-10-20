<script setup lang="ts">
import { useEventListener, watchDebounced } from '@vueuse/core'
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
  ToggleGroupItem,
  ToggleGroupRoot,
} from 'reka-ui'
import AdminIcon from '~/components/admin/AdminIcon.vue'
import AdminShell from '~/components/admin/AdminShell.vue'
import NumberInput from '~/components/admin/NumberInput.vue'
import QuotePdfPreview from '~/components/admin/QuotePdfPreview.vue'
import QuotePhaseEditor from '~/components/admin/QuotePhaseEditor.vue'
import QuoteStatusPill from '~/components/admin/QuoteStatusPill.vue'
import { adminErrorText } from '~/utils/adminErrors'
import { formatDateTime } from '~/utils/format'
import { moveInArray } from '~/utils/moveInArray'
import type { Client } from '#shared/clients'
import { romeDate } from '#shared/dates'
import { formatDecimal, formatEuro } from '#shared/money'
import {
  computeTotals,
  issueProblems,
  newLocalId,
  SETTABLE_STATUSES,
  stableStringify,
  STATUS_LABELS,
  type DraftInput,
  type QuoteContent,
  type QuoteDetail,
  type SettableStatus,
} from '#shared/quote'

// Editor di un preventivo, con accanto il PDF che si aggiorna mentre si
// scrive. La bozza si salva da sola; "Conferma" crea una revisione con
// numero e PDF e sblocca l'invio al cliente; "Firmato" lo segniamo noi,
// volendo con la copia firmata in PDF.
// key: ogni preventivo ha la sua istanza, senza stato rimasto dal precedente
definePageMeta({ layout: 'admin', key: (route) => String(route.params.id) })
defineI18nRoute(false)

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: session } = await useAdminSession()
const { notify } = useAdminToast()

const detail = ref<QuoteDetail | null>(null)
const form = ref<DraftInput | null>(null)
const clients = ref<Client[]>([])
// Reka non accetta null come valore: "nessun cliente" ha il suo, che non
// può essere un uuid, e nel form torna null
const NO_CLIENT = 'none'
const clientOptions = computed(() => [
  { value: NO_CLIENT, label: 'Scegli un cliente…' },
  ...clients.value.map((c) => ({ value: c.id, label: c.name })),
])
const clientValue = computed(() => form.value?.clientId ?? NO_CLIENT)
const clientLabel = computed(() => clientOptions.value.find((o) => o.value === clientValue.value)?.label)

function pickClient(v: unknown) {
  if (form.value && typeof v === 'string') form.value.clientId = v === NO_CLIENT ? null : v
}
const loadError = ref('')
const savedSignature = ref('')
const saving = ref(false)
const busy = ref(false)
const confirmDelete = ref(false)
const origin = ref('')
// Cresce a ogni salvataggio riuscito: l'anteprima si ridisegna
const previewVersion = ref(0)

useSeoMeta({ title: () => `${detail.value?.number ?? 'Bozza'} - Preventivi - Admin Didap` })

const signature = computed(() => (form.value ? stableStringify(form.value) : ''))
const dirty = computed(() => !!form.value && signature.value !== savedSignature.value)
const totals = computed(() => (form.value ? computeTotals(form.value.content) : null))
const problems = computed(() => (form.value ? issueProblems(form.value, romeDate(new Date())) : []))
// Si può riemettere anche a bozza invariata: cambiano i dati di cliente e Didap
const canIssue = computed(() => !!detail.value && !problems.value.length)
const publicUrl = computed(() => (detail.value?.token ? `${origin.value}/p/${detail.value.token}` : ''))

// L'elenco clienti non cambia da qui: basta caricarlo la prima volta
let clientsLoaded = false

async function load() {
  loadError.value = ''
  try {
    const [d, c] = await Promise.all([
      $fetch<QuoteDetail>(`/api/admin/quotes/${id.value}`),
      clientsLoaded ? null : $fetch<Client[]>('/api/admin/clients'),
    ])
    detail.value = d
    if (c) {
      clients.value = c
      clientsLoaded = true
    }
    form.value = d.draft
    savedSignature.value = stableStringify(d.draft)
    previewVersion.value++
  }
  catch (err) {
    loadError.value = adminErrorText(err)
  }
}

onMounted(() => {
  origin.value = location.origin
  watch(() => session.value?.authenticated, (ok) => {
    if (!ok) return
    // Rientro dopo una sessione scaduta: load() rimpiazzerebbe la bozza modificata
    if (dirty.value) {
      save()
      return
    }
    load()
  }, { immediate: true })
})

// ---- Salvataggio automatico, in coda: mai due PUT insieme ------------------
let queue: Promise<boolean> = Promise.resolve(true)
function save() {
  queue = queue.then(async () => {
    if (!form.value || !dirty.value) return true
    const sent = signature.value
    saving.value = true
    try {
      await $fetch(`/api/admin/quotes/${id.value}`, { method: 'PUT', body: form.value })
      savedSignature.value = sent
      previewVersion.value++
      return true
    }
    catch (err) {
      notify('error', adminErrorText(err))
      return false
    }
    finally {
      saving.value = false
    }
  })
  return queue
}

watchDebounced(signature, () => dirty.value && save(), { debounce: 800 })
useEventListener('beforeunload', (e: BeforeUnloadEvent) => {
  if (dirty.value) e.preventDefault()
})

// Navigazione interna: salva prima di uscire e resta qui se il salvataggio fallisce
onBeforeRouteLeave(() => save())
onBeforeRouteUpdate(() => save())

// ---- Azioni: partono sempre dalla bozza salvata -----------------------------
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  try {
    if (await save()) await action()
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
  }
}

async function preview() {
  // La scheda si apre dentro il clic, altrimenti il browser la blocca
  const tab = window.open('', '_blank')
  if (!(await save())) {
    tab?.close()
    return
  }
  const url = `/api/admin/quotes/${id.value}/preview`
  if (tab) tab.location.href = url
  else window.location.href = url
}

const issue = () => run(async () => {
  const res = await $fetch<{ rev: number; number: string }>(`/api/admin/quotes/${id.value}/issue`, { method: 'POST' })
  await load()
  notify('ok', `Confermato ${res.number}, rev. ${res.rev}: ora puoi inviarlo al cliente`)
})

// Email del cliente scelto: senza, l'invio non parte
const clientEmail = computed(() => clients.value.find((c) => c.id === form.value?.clientId)?.email ?? '')
const canSend = computed(() => detail.value?.status === 'confirmed' && !!clientEmail.value)
// Confermato ma senza email del cliente: lo si dice sotto la barra
const needsEmail = computed(() => detail.value?.status === 'confirmed' && !clientEmail.value)

const sendToClient = () => run(async () => {
  const res = await $fetch<{ to: string }>(`/api/admin/quotes/${id.value}/send`, { method: 'POST' })
  await load()
  notify('ok', `Inviato a ${res.to}`)
})

// Copia firmata (facoltativa): caricarla segna anche il preventivo come firmato
const signedInput = ref<HTMLInputElement | null>(null)
function uploadSigned(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  run(async () => {
    const body = new FormData()
    body.append('file', file)
    await $fetch(`/api/admin/quotes/${id.value}/signed`, { method: 'POST', body })
    await load()
    notify('ok', 'Copia firmata caricata')
  })
}
const removeSigned = () => run(async () => {
  await $fetch(`/api/admin/quotes/${id.value}/signed`, { method: 'DELETE' })
  await load()
  notify('ok', 'Copia firmata tolta')
})


// Un clic sullo stato attivo lo spegnerebbe (undefined): non cambia niente
function pickStatus(v: unknown) {
  const s = SETTABLE_STATUSES.find((x) => x === v)
  if (s) setStatus(s)
}
const setStatus = (status: SettableStatus) => run(async () => {
  await $fetch(`/api/admin/quotes/${id.value}/status`, { method: 'PUT', body: { status } })
  await load()
  notify('ok', 'Stato aggiornato')
})

const duplicate = () => run(async () => {
  const copy = await $fetch<{ id: string }>(`/api/admin/quotes/${id.value}/duplicate`, { method: 'POST' })
  await navigateTo(`/admin/preventivi/${copy.id}`)
  notify('ok', 'Copia creata: è una nuova bozza')
})

async function remove() {
  confirmDelete.value = false
  if (busy.value) return
  busy.value = true
  // Un salvataggio in corso o in coda non deve arrivare dopo la DELETE
  await queue
  const kept = form.value
  const keptSignature = savedSignature.value
  // Senza bozza, un salvataggio rimandato non fa nulla
  form.value = null
  try {
    await $fetch(`/api/admin/quotes/${id.value}`, { method: 'DELETE' })
    await navigateTo('/admin/preventivi')
    notify('ok', 'Bozza eliminata')
  }
  catch (err) {
    form.value = kept
    savedSignature.value = keptSignature
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    notify('ok', 'Link copiato')
  }
  catch {
    notify('error', 'Copia non riuscita: seleziona il link a mano')
  }
}

// ---- Fasi e sconto ----------------------------------------------------------
function addPhase() {
  form.value?.content.phases.push({ id: newLocalId(), title: '', description: '', items: [] })
}

type DiscountKind = QuoteContent['discount']['kind']
const DISCOUNT_OPTIONS = [
  { value: 'none', label: 'Nessuno' },
  { value: 'percent', label: 'Percentuale' },
  { value: 'amount', label: 'Importo fisso' },
] as const satisfies readonly { value: DiscountKind; label: string }[]
const discountLabel = computed(() =>
  DISCOUNT_OPTIONS.find((o) => o.value === form.value?.content.discount.kind)?.label,
)

// Testi finali del preventivo, tutti uguali nell'editor
const TEXT_FIELDS = [
  { key: 'timeline', label: 'Tempi di consegna' },
  { key: 'paymentTerms', label: 'Condizioni di pagamento' },
  { key: 'exclusions', label: 'Esclusioni' },
  { key: 'notes', label: 'Note' },
] as const

function setDiscountKind(v: unknown) {
  const kind = DISCOUNT_OPTIONS.find((o) => o.value === v)?.value
  if (!form.value || !kind || kind === form.value.content.discount.kind) return
  form.value.content.discount = kind === 'none' ? { kind } : { kind, value: 0 }
}
</script>

<template>
  <AdminShell fill>
    <main
      v-if="loadError"
      class="p-6"
    >
      <NuxtLink
        to="/admin/preventivi"
        class="
          text-sm opacity-60
          hover:opacity-100
        "
      >
        ← Preventivi
      </NuxtLink>
      <p
        class="mt-6 rounded-2xl border border-red/30 bg-white p-5 text-red"
        role="alert"
      >
        {{ loadError }}
      </p>
    </main>

    <div
      v-else-if="form && detail"
      class="flex min-h-0 flex-1 flex-col"
    >
      <!-- Una sola barra: chi è, quanto vale, cosa si può fare -->
      <header class="
        flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-ink/10 px-5
        py-3
        lg:px-8
      ">
        <NuxtLink
          to="/admin/preventivi"
          class="-ml-1.5 ghost-icon"
          aria-label="Torna ai preventivi"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path
              d="M10 4L6 8l4 4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </NuxtLink>
        <h1 class="text-xl font-bold">
          {{ detail.number ?? 'Nuovo preventivo' }}
        </h1>
        <QuoteStatusPill :status="detail.displayStatus" />
        <span
          class="text-sm opacity-50"
          aria-live="polite"
        >{{ saving ? 'Salvo…' : dirty ? 'Da salvare' : 'Salvato' }}</span>

        <div class="ml-auto flex flex-wrap items-center gap-3">
          <span
            v-if="totals"
            class="mr-2 text-lg font-bold tabular-nums"
          >{{ formatEuro(totals.total) }}</span>
          <ToggleGroupRoot
            v-if="detail.token"
            :model-value="detail.status"
            type="single"
            :disabled="busy"
            class="toggle-segmented"
            aria-label="Stato"
            @update:model-value="pickStatus"
          >
            <ToggleGroupItem
              v-for="s in SETTABLE_STATUSES"
              :key="s"
              :value="s"
              class="px-2.5! text-xs"
            >
              {{ STATUS_LABELS[s] }}
            </ToggleGroupItem>
          </ToggleGroupRoot>
          <button
            v-if="detail.currentRev"
            type="button"
            class="
              rounded-full border border-ink/25 px-4 py-2 text-sm
              hover:border-ink
              disabled:opacity-40
              disabled:hover:border-ink/25
            "
            :disabled="!canSend || busy"
            @click="sendToClient"
          >
            Invia al cliente
          </button>
          <button
            type="button"
            class="
              rounded-full bg-green px-4 py-2 text-sm font-medium
              text-paper-light
              hover:bg-ink
              disabled:opacity-40
              disabled:hover:bg-green
            "
            :disabled="!canIssue || busy"
            @click="issue"
          >
            {{ detail.currentRev ? `Conferma rev. ${detail.currentRev + 1}` : 'Conferma' }}
          </button>

          <PopoverRoot>
            <PopoverTrigger
              class="ghost-icon size-9! opacity-80!"
              aria-label="Altro"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                aria-hidden="true"
              >
                <circle
                  cx="4"
                  cy="9"
                  r="1.4"
                  fill="currentColor"
                />
                <circle
                  cx="9"
                  cy="9"
                  r="1.4"
                  fill="currentColor"
                />
                <circle
                  cx="14"
                  cy="9"
                  r="1.4"
                  fill="currentColor"
                />
              </svg>
            </PopoverTrigger>
            <PopoverPortal>
              <PopoverContent
                side="bottom"
                align="end"
                :side-offset="6"
                @open-auto-focus.prevent
                class="
                  z-50 flex w-80 flex-col divide-y divide-ink/10 rounded-2xl
                  border border-ink/10 bg-white text-sm shadow-lg
                "
              >
                <div
                  v-if="totals"
                  class="flex flex-col gap-1 p-4"
                >
                  <p class="flex justify-between">
                    <span class="opacity-60">Imponibile</span>
                    <span class="tabular-nums">{{ formatEuro(totals.subtotal) }}</span>
                  </p>
                  <p
                    v-if="totals.discount"
                    class="flex justify-between"
                  >
                    <span class="opacity-60">Sconto</span>
                    <span class="tabular-nums">{{ formatEuro(-totals.discount) }}</span>
                  </p>
                  <p class="flex justify-between">
                    <span class="opacity-60">IVA {{ formatDecimal(form.content.vatRate) }}%</span>
                    <span class="tabular-nums">{{ formatEuro(totals.vat) }}</span>
                  </p>
                </div>

                <div
                  v-if="detail.token"
                  class="flex flex-col gap-3 p-4"
                >
                  <div class="flex flex-col gap-1.5">
                    Link per il cliente
                    <div class="flex items-center gap-1">
                      <input
                        :value="publicUrl"
                        readonly
                        aria-label="Link pubblico"
                        class="min-w-0 flex-1 panel-input text-xs"
                        @focus="($event.target as HTMLInputElement).select()"
                      >
                      <button
                        type="button"
                        class="
                          rounded-full px-2.5 py-1 text-xs
                          hover:bg-ink/5
                        "
                        @click="copyLink"
                      >
                        Copia
                      </button>
                      <a
                        :href="publicUrl"
                        target="_blank"
                        class="
                          rounded-full px-2.5 py-1 text-xs
                          hover:bg-ink/5
                        "
                      >Apri</a>
                    </div>
                    <span
                      v-if="detail.sent"
                      class="text-xs opacity-60"
                    >Inviato a {{ detail.sent.to }} il {{ formatDateTime(detail.sent.at) }}</span>
                  </div>

                  <div class="flex flex-col gap-1.5">
                    Copia firmata
                    <div
                      v-if="detail.signed.fileName"
                      class="flex items-center gap-1"
                    >
                      <a
                        :href="`/api/admin/quotes/${detail.id}/signed`"
                        target="_blank"
                        class="
                          min-w-0 flex-1 truncate text-green underline
                          underline-offset-2
                        "
                      >{{ detail.signed.fileName }}</a>
                      <button
                        type="button"
                        class="
                          rounded-full px-2.5 py-1 text-xs
                          hover:bg-ink/5
                        "
                        :disabled="busy"
                        @click="signedInput?.click()"
                      >
                        Cambia
                      </button>
                      <button
                        type="button"
                        class="
                          ghost-icon
                          hover:text-red
                        "
                        aria-label="Togli la copia firmata"
                        :disabled="busy"
                        @click="removeSigned"
                      >
                        <AdminIcon name="close" />
                      </button>
                    </div>
                    <button
                      v-else
                      type="button"
                      class="
                        rounded-full border border-dashed border-ink/30 px-4
                        py-2
                        hover:border-ink
                      "
                      :disabled="busy"
                      @click="signedInput?.click()"
                    >
                      Carica il PDF firmato
                    </button>
                  </div>
                </div>

                <ul
                  v-if="detail.revisions.length"
                  class="flex flex-col p-2"
                >
                  <li
                    v-for="r in detail.revisions"
                    :key="r.rev"
                  >
                    <a
                      :href="`/api/admin/quotes/${detail.id}/revisions/${r.rev}`"
                      target="_blank"
                      class="
                        flex justify-between gap-3 rounded-lg px-2 py-1.5
                        hover:bg-ink/5
                      "
                    >
                      <span>rev. {{ r.rev }} <span class="opacity-50">· {{ formatDateTime(r.issuedAt) }}</span></span>
                      <span class="tabular-nums">{{ formatEuro(r.total) }}</span>
                    </a>
                  </li>
                </ul>

                <div class="flex flex-wrap items-center gap-1 p-2">
                  <button
                    type="button"
                    class="
                      rounded-full px-3 py-1.5
                      hover:bg-ink/5
                      xl:hidden
                    "
                    @click="preview"
                  >
                    Anteprima PDF
                  </button>
                  <button
                    type="button"
                    class="
                      rounded-full px-3 py-1.5
                      hover:bg-ink/5
                    "
                    :disabled="busy"
                    @click="duplicate"
                  >
                    Duplica
                  </button>
                  <template v-if="!detail.currentRev">
                    <button
                      v-if="!confirmDelete"
                      type="button"
                      class="
                        rounded-full px-3 py-1.5 text-red
                        hover:bg-red/10
                      "
                      @click="confirmDelete = true"
                    >
                      Elimina bozza
                    </button>
                    <template v-else>
                      <button
                        type="button"
                        class="rounded-full bg-red px-3 py-1.5 text-white"
                        :disabled="busy"
                        @click="remove"
                      >
                        Sì, elimina
                      </button>
                      <button
                        type="button"
                        class="rounded-full px-3 py-1.5"
                        @click="confirmDelete = false"
                      >
                        Annulla
                      </button>
                    </template>
                  </template>
                </div>
              </PopoverContent>
            </PopoverPortal>
          </PopoverRoot>
          <input
            ref="signedInput"
            type="file"
            accept="application/pdf"
            class="hidden"
            @change="uploadSigned"
          >
        </div>
      </header>

      <!-- Cosa manca prima di poter confermare o inviare, in una riga -->
      <p
        v-if="problems.length || needsEmail"
        class="
          border-b border-ink/10 bg-banana/15 px-5 py-2 text-sm
          lg:px-8
        "
      >
        <template v-if="problems.length">
          Per confermare: {{ problems.join(' · ') }}
        </template>
        <template v-else>
          Per inviarlo manca l'email del cliente: aggiungila in Clienti.
        </template>
      </p>

      <div class="
        grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)]
        xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]
      ">
        <!-- Durante un'azione la bozza non si modifica: load() la rimpiazzerebbe -->
        <fieldset
          :disabled="busy"
          class="
            flex min-w-0 scrollbar-none flex-col divide-y divide-ink/10 px-5
            lg:overflow-y-auto lg:px-8
          "
        >
          <div class="flex flex-col gap-3 py-5">
            <label class="flex flex-col gap-1.5 text-sm">
              Titolo del progetto
              <input
                v-model="form.title"
                maxlength="200"
                placeholder="Es. Nuovo sito vetrina"
                class="panel-input text-base font-medium"
              >
            </label>
            <div class="flex flex-col gap-1.5 text-sm">
              <span id="cliente">Cliente</span>
              <SelectRoot
                :model-value="clientValue"
                :disabled="busy"
                @update:model-value="pickClient"
              >
                <SelectTrigger
                  aria-labelledby="cliente"
                  class="select-trigger panel-input"
                >
                  <!-- Testo dalle opzioni: c'è già nell'HTML del server -->
                  <SelectValue>{{ clientLabel }}</SelectValue>
                </SelectTrigger>
                <SelectPortal>
                  <SelectContent
                    position="popper"
                    :side-offset="4"
                    class="select-content admin-select-content"
                  >
                    <SelectViewport>
                      <SelectItem
                        v-for="o in clientOptions"
                        :key="o.value"
                        :value="o.value"
                        class="select-item admin-select-item"
                      >
                        <SelectItemText>{{ o.label }}</SelectItemText>
                      </SelectItem>
                    </SelectViewport>
                  </SelectContent>
                </SelectPortal>
              </SelectRoot>
            </div>
            <div class="
              grid gap-x-6
              sm:grid-cols-2
            ">
              <label class="param-row">
                Valido fino al
                <input
                  v-model="form.content.validUntil"
                  type="date"
                  class="w-40 panel-input tabular-nums"
                >
              </label>
              <label class="param-row">
                Tariffa giornaliera
                <div class="w-32">
                  <NumberInput
                    v-model="form.content.dayRate"
                    kind="euro"
                    panel
                  />
                </div>
              </label>
            </div>
          </div>

          <label class="flex flex-col gap-1.5 py-5 text-sm">
            <span class="font-bold">Premessa</span>
            <textarea
              v-model="form.content.intro"
              rows="4"
              maxlength="5000"
              placeholder="Obiettivi e contesto del progetto"
              class="panel-input"
            />
          </label>

          <div class="flex flex-col pt-5">
            <h2 class="text-sm font-bold">
              Fasi
            </h2>
            <div class="flex flex-col divide-y divide-ink/10">
              <QuotePhaseEditor
                v-for="(phase, i) in form.content.phases"
                :key="phase.id"
                :phase="phase"
                :index="i"
                :count="form.content.phases.length"
                :day-rate="form.content.dayRate"
                :subtotal="totals?.phases[i] ?? 0"
                :disabled="busy"
                @move="moveInArray(form.content.phases, i, $event)"
                @remove="form.content.phases.splice(i, 1)"
              />
            </div>
            <button
              type="button"
              class="
                mb-5 self-start rounded-full border border-dashed border-ink/30
                px-4 py-2 text-sm
                hover:border-ink
              "
              @click="addPhase"
            >
              + Aggiungi fase
            </button>
          </div>

          <div class="
            grid gap-x-6 py-5
            sm:grid-cols-2
          ">
            <div class="param-row">
              <span id="sconto">Sconto</span>
              <div class="flex items-center gap-1.5">
                <SelectRoot
                  :model-value="form.content.discount.kind"
                  :disabled="busy"
                  @update:model-value="setDiscountKind"
                >
                  <SelectTrigger
                    class="select-trigger w-32 panel-input"
                    aria-labelledby="sconto"
                  >
                    <SelectValue>{{ discountLabel }}</SelectValue>
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectContent
                      position="popper"
                      :side-offset="4"
                      class="select-content admin-select-content"
                    >
                      <SelectViewport>
                        <SelectItem
                          v-for="o in DISCOUNT_OPTIONS"
                          :key="o.value"
                          :value="o.value"
                          class="select-item admin-select-item"
                        >
                          <SelectItemText>{{ o.label }}</SelectItemText>
                        </SelectItem>
                      </SelectViewport>
                    </SelectContent>
                  </SelectPortal>
                </SelectRoot>
                <div
                  v-if="form.content.discount.kind !== 'none'"
                  class="w-24"
                >
                  <NumberInput
                    v-if="form.content.discount.kind === 'percent'"
                    v-model="form.content.discount.value"
                    kind="percent"
                    label="Sconto in percentuale"
                    panel
                  />
                  <NumberInput
                    v-else
                    v-model="form.content.discount.value"
                    kind="euro"
                    label="Sconto in euro"
                    panel
                  />
                </div>
              </div>
            </div>
            <label class="param-row">
              IVA (%)
              <div class="w-24">
                <NumberInput
                  v-model="form.content.vatRate"
                  kind="percent"
                  panel
                />
              </div>
            </label>
          </div>

          <div class="flex flex-col gap-4 py-5">
            <label
              v-for="f in TEXT_FIELDS"
              :key="f.key"
              class="flex flex-col gap-1.5 text-sm"
            >
              <span class="font-bold">{{ f.label }}</span>
              <textarea
                v-model="form.content[f.key]"
                rows="3"
                maxlength="5000"
                class="panel-input"
              />
            </label>
          </div>
        </fieldset>

        <section
          class="
            hidden min-h-0 scrollbar-none overflow-y-auto border-l border-ink/10
            bg-ink/5 p-6
            xl:block
          "
          aria-label="Anteprima del PDF"
        >
          <QuotePdfPreview
            :src="`/api/admin/quotes/${detail.id}/preview`"
            :version="previewVersion"
          />
        </section>
      </div>
    </div>
  </AdminShell>
</template>
