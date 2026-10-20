<script setup lang="ts">
import { useEventListener, watchDebounced } from '@vueuse/core'
import {
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
import AdminField from '~/components/admin/AdminField.vue'
import AdminSection from '~/components/admin/AdminSection.vue'
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
// Bozza diversa da com'era all'ultima emissione
const issuedSignature = computed(() =>
  detail.value?.issuedDraft ? stableStringify(detail.value.issuedDraft) : '',
)
const unissued = computed(() => !!issuedSignature.value && issuedSignature.value !== signature.value)
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

    <!-- Editor | anteprima del PDF | totali e azioni; ogni colonna scorre per conto suo -->
    <div
      v-else-if="form && detail"
      class="
        grid flex-1 grid-cols-[minmax(0,1fr)]
        lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_20rem]
        xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_20rem]
      "
    >
      <main class="
        p-5
        lg:overflow-y-auto lg:p-8
      ">
        <NuxtLink
          to="/admin/preventivi"
          class="
            text-sm opacity-60
            hover:opacity-100
          "
        >
          ← Preventivi
        </NuxtLink>
        <!-- Durante un'azione la bozza non si modifica: load() la rimpiazzerebbe -->
        <fieldset
          :disabled="busy"
          class="mt-4 flex min-w-0 flex-col gap-6"
        >
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-3xl font-bold">
              {{ detail.number ?? 'Nuovo preventivo' }}
            </h1>
            <QuoteStatusPill :status="detail.displayStatus" />
            <span
              v-if="unissued"
              class="rounded-full bg-banana px-2.5 py-1 text-xs font-medium"
            >Modifiche non emesse</span>
            <span
              class="ml-auto text-sm opacity-60"
              aria-live="polite"
            >{{ saving ? 'Salvo…' : dirty ? 'Modifiche da salvare' : 'Bozza salvata' }}</span>
          </div>

          <AdminSection
            id="generale"
            title="Preventivo"
          >
            <AdminField
              label="Cliente"
              hint="I dati dei clienti si gestiscono in Clienti."
            >
              <SelectRoot
                :model-value="clientValue"
                :disabled="busy"
                @update:model-value="pickClient"
              >
                <SelectTrigger class="select-trigger admin-input">
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
            </AdminField>
            <AdminField
              label="Titolo del progetto"
              :value="form.title"
              :max="200"
            >
              <input
                v-model="form.title"
                maxlength="200"
                class="admin-input"
              >
            </AdminField>
            <div class="
              grid gap-5
              sm:grid-cols-2
            ">
              <AdminField label="Valido fino al">
                <input
                  v-model="form.content.validUntil"
                  type="date"
                  class="admin-input"
                >
              </AdminField>
              <AdminField
                label="Tariffa giornaliera (€)"
                hint="Usata per le nuove voci a giorni."
              >
                <NumberInput
                  v-model="form.content.dayRate"
                  kind="euro"
                />
              </AdminField>
            </div>
          </AdminSection>

          <AdminSection
            id="premessa"
            title="Premessa"
            description="Obiettivi e contesto del progetto."
          >
            <textarea
              v-model="form.content.intro"
              rows="5"
              maxlength="5000"
              aria-label="Premessa"
              class="admin-input"
            />
          </AdminSection>

          <div class="flex flex-col gap-4">
            <h2 class="text-xl font-bold">
              Fasi
            </h2>
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
            <button
              type="button"
              class="
                self-start rounded-full border border-dashed border-ink/40 px-4
                py-2 text-sm
                hover:border-ink
              "
              @click="addPhase"
            >
              + Aggiungi fase
            </button>
          </div>

          <AdminSection
            id="economico"
            title="Sconto e IVA"
          >
            <div class="
              grid gap-5
              sm:grid-cols-2
            ">
              <AdminField
                label="Sconto"
                group
              >
                <div class="flex gap-2">
                  <SelectRoot
                    :model-value="form.content.discount.kind"
                    :disabled="busy"
                    @update:model-value="setDiscountKind"
                  >
                    <SelectTrigger
                      class="select-trigger admin-input w-auto"
                      aria-label="Tipo di sconto"
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
                  <NumberInput
                    v-if="form.content.discount.kind === 'percent'"
                    v-model="form.content.discount.value"
                    kind="percent"
                    label="Sconto in percentuale"
                  />
                  <NumberInput
                    v-else-if="form.content.discount.kind === 'amount'"
                    v-model="form.content.discount.value"
                    kind="euro"
                    label="Sconto in euro"
                  />
                </div>
              </AdminField>
              <AdminField label="IVA (%)">
                <NumberInput
                  v-model="form.content.vatRate"
                  kind="percent"
                />
              </AdminField>
            </div>
          </AdminSection>

          <AdminSection
            id="condizioni"
            title="Condizioni"
          >
            <AdminField label="Tempi di consegna">
              <textarea
                v-model="form.content.timeline"
                rows="3"
                maxlength="5000"
                class="admin-input"
              />
            </AdminField>
            <AdminField label="Condizioni di pagamento">
              <textarea
                v-model="form.content.paymentTerms"
                rows="3"
                maxlength="5000"
                class="admin-input"
              />
            </AdminField>
            <AdminField label="Esclusioni">
              <textarea
                v-model="form.content.exclusions"
                rows="3"
                maxlength="5000"
                class="admin-input"
              />
            </AdminField>
            <AdminField label="Note">
              <textarea
                v-model="form.content.notes"
                rows="3"
                maxlength="5000"
                class="admin-input"
              />
            </AdminField>
          </AdminSection>
        </fieldset>
      </main>

      <section
        class="
          hidden min-h-0 overflow-y-auto border-x border-ink/10 bg-ink/5 p-6
          xl:block
        "
        aria-label="Anteprima del PDF"
      >
        <QuotePdfPreview
          :src="`/api/admin/quotes/${detail.id}/preview`"
          :version="previewVersion"
        />
      </section>

      <aside class="
        flex flex-col gap-4 p-5
        lg:overflow-y-auto lg:border-l lg:border-ink/10
        xl:border-l-0
      ">
          <div class="rounded-2xl border border-ink/10 bg-white p-5">
            <dl
              v-if="totals"
              class="flex flex-col gap-2 text-sm"
            >
              <div class="flex justify-between">
                <dt>Imponibile</dt>
                <dd class="font-mono tabular-nums">
                  {{ formatEuro(totals.subtotal) }}
                </dd>
              </div>
              <div
                v-if="totals.discount"
                class="flex justify-between"
              >
                <dt>Sconto</dt>
                <dd class="font-mono tabular-nums">
                  {{ formatEuro(-totals.discount) }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt>IVA {{ formatDecimal(form.content.vatRate) }}%</dt>
                <dd class="font-mono tabular-nums">
                  {{ formatEuro(totals.vat) }}
                </dd>
              </div>
              <div class="
                mt-1 flex justify-between border-t border-ink/10 pt-3 text-base
                font-bold
              ">
                <dt>Totale</dt>
                <dd class="font-mono tabular-nums">
                  {{ formatEuro(totals.total) }}
                </dd>
              </div>
            </dl>
          </div>

          <div class="
            flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-5
          ">
            <ul
              v-if="problems.length"
              class="flex flex-col gap-1 text-sm text-red"
            >
              <li
                v-for="p in problems"
                :key="p"
              >
                {{ p }}
              </li>
            </ul>
            <button
              type="button"
              class="
                rounded-full bg-green px-5 py-3 font-medium text-paper-light
                hover:bg-ink
                disabled:opacity-40
                disabled:hover:bg-green
              "
              :disabled="!canIssue || busy"
              @click="issue"
            >
              {{ detail.currentRev ? `Conferma rev. ${detail.currentRev + 1}` : 'Conferma preventivo' }}
            </button>
            <p
              v-if="detail.currentRev && !unissued"
              class="text-xs opacity-60"
            >
              Nessuna modifica dall'ultima conferma.
            </p>
            <button
              v-if="detail.currentRev"
              type="button"
              class="
                rounded-full bg-ink px-5 py-2.5 text-sm font-medium
                text-paper-light
                hover:bg-green
                disabled:opacity-40
                disabled:hover:bg-ink
              "
              :disabled="!canSend || busy"
              @click="sendToClient"
            >
              Invia al cliente
            </button>
            <p
              v-if="detail.currentRev && detail.status === 'confirmed' && !clientEmail"
              class="text-xs text-red"
            >
              Il cliente non ha un'email in anagrafica.
            </p>
            <p
              v-if="detail.sent"
              class="text-xs opacity-60"
            >
              Inviato rev. {{ detail.sent.rev }} a {{ detail.sent.to }}, {{ formatDateTime(detail.sent.at) }}
            </p>
            <!-- Da desktop largo l'anteprima è già accanto -->
            <button
              type="button"
              class="
                rounded-full border border-ink/20 px-5 py-2.5 text-sm
                hover:border-ink
                xl:hidden
              "
              @click="preview"
            >
              Anteprima PDF
            </button>
          </div>

          <div
            v-if="detail.token"
            class="
              flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-5
            "
          >
            <p class="text-sm font-medium">
              Link per il cliente
            </p>
            <input
              :value="publicUrl"
              readonly
              aria-label="Link pubblico"
              class="admin-input font-mono text-xs"
              @focus="($event.target as HTMLInputElement).select()"
            >
            <div class="flex gap-2">
              <button
                type="button"
                class="
                  flex-1 rounded-full border border-ink/20 px-3 py-2 text-sm
                  hover:border-ink
                "
                @click="copyLink"
              >
                Copia link
              </button>
              <a
                :href="publicUrl"
                target="_blank"
                class="
                  flex-1 rounded-full border border-ink/20 px-3 py-2 text-center
                  text-sm
                  hover:border-ink
                "
              >Apri ↗</a>
            </div>
            <p
              id="stato-preventivo"
              class="text-sm font-medium"
            >
              Stato
            </p>
            <ToggleGroupRoot
              :model-value="detail.status"
              type="single"
              :disabled="busy"
              class="toggle-pills"
              aria-labelledby="stato-preventivo"
              @update:model-value="pickStatus"
            >
              <ToggleGroupItem
                v-for="s in SETTABLE_STATUSES"
                :key="s"
                :value="s"
              >
                {{ STATUS_LABELS[s] }}
              </ToggleGroupItem>
            </ToggleGroupRoot>

            <!-- Copia firmata dal cliente: facoltativa, tiene ordine -->
            <p class="mt-1 text-sm font-medium">
              Copia firmata
            </p>
            <div
              v-if="detail.signed.fileName"
              class="flex flex-col gap-2"
            >
              <a
                :href="`/api/admin/quotes/${detail.id}/signed`"
                target="_blank"
                class="truncate text-sm text-green underline underline-offset-2"
              >{{ detail.signed.fileName }}</a>
              <span class="text-xs opacity-60">rev. {{ detail.signed.rev }}<template v-if="detail.signed.at">, firmato il {{ formatDateTime(detail.signed.at) }}</template></span>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="
                    rounded-full border border-ink/20 px-3 py-1.5 text-sm
                    hover:border-ink
                  "
                  :disabled="busy"
                  @click="signedInput?.click()"
                >
                  Sostituisci
                </button>
                <button
                  type="button"
                  class="
                    rounded-full px-3 py-1.5 text-sm text-red
                    hover:bg-red/10
                  "
                  :disabled="busy"
                  @click="removeSigned"
                >
                  Togli
                </button>
              </div>
            </div>
            <button
              v-else
              type="button"
              class="
                rounded-full border border-dashed border-ink/30 px-4 py-2.5
                text-sm
                hover:border-ink
              "
              :disabled="busy"
              @click="signedInput?.click()"
            >
              Carica il PDF firmato
            </button>
            <input
              ref="signedInput"
              type="file"
              accept="application/pdf"
              class="hidden"
              @change="uploadSigned"
            >
          </div>

          <div
            v-if="detail.revisions.length"
            class="rounded-2xl border border-ink/10 bg-white p-5"
          >
            <p class="text-sm font-medium">
              Revisioni
            </p>
            <ul class="mt-2 flex flex-col gap-1 text-sm">
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
                  <span>rev. {{ r.rev }} · {{ formatDateTime(r.issuedAt) }}</span>
                  <span class="font-mono tabular-nums">{{ formatEuro(r.total) }}</span>
                </a>
              </li>
            </ul>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="
                rounded-full border border-ink/20 px-4 py-2 text-sm
                hover:border-ink
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
                  rounded-full px-4 py-2 text-sm text-red
                  hover:bg-red/10
                "
                @click="confirmDelete = true"
              >
                Elimina bozza
              </button>
              <template v-else>
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
      </aside>
    </div>
  </AdminShell>
</template>
