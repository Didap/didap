<script setup lang="ts">
import { useEventListener, watchDebounced } from '@vueuse/core'
import AdminField from '~/components/admin/AdminField.vue'
import AdminSection from '~/components/admin/AdminSection.vue'
import AdminSelect from '~/components/admin/AdminSelect.vue'
import AdminShell from '~/components/admin/AdminShell.vue'
import NumberInput from '~/components/admin/NumberInput.vue'
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

// Editor di un preventivo. La bozza si salva da sola; "Emetti" crea una
// revisione con numero e PDF, e il link pubblico mostra sempre l'ultima.
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
const clientOptions = computed(() => clients.value.map((c) => ({ value: c.id, label: c.name })))
const loadError = ref('')
const savedSignature = ref('')
const saving = ref(false)
const busy = ref(false)
const confirmDelete = ref(false)
const origin = ref('')

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
  notify('ok', `Emesso ${res.number}, rev. ${res.rev}`)
})

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

function setDiscountKind(kind: DiscountKind) {
  if (!form.value) return
  form.value.content.discount = kind === 'none' ? { kind } : { kind, value: 0 }
}
</script>

<template>
  <AdminShell>
    <main class="
      mx-auto w-full max-w-6xl p-5
      lg:p-8
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

      <p
        v-if="loadError"
        class="mt-6 rounded-2xl border border-red/30 bg-white p-5 text-red"
        role="alert"
      >
        {{ loadError }}
      </p>

      <div
        v-else-if="form && detail"
        class="
          mt-4 grid items-start gap-6
          lg:grid-cols-[minmax(0,1fr)_320px]
        "
      >
        <!-- Durante un'azione la bozza non si modifica: load() la rimpiazzerebbe -->
        <fieldset
          :disabled="busy"
          class="flex min-w-0 flex-col gap-6"
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
              <AdminSelect
                v-model="form.clientId"
                :options="clientOptions"
                placeholder="Scegli un cliente…"
              />
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
                  <AdminSelect
                    :model-value="form.content.discount.kind"
                    :options="DISCOUNT_OPTIONS"
                    class="w-auto"
                    label="Tipo di sconto"
                    @update:model-value="setDiscountKind"
                  />
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

        <aside class="
          flex flex-col gap-4
          lg:sticky lg:top-4
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
              {{ detail.currentRev ? `Emetti rev. ${detail.currentRev + 1}` : 'Emetti preventivo' }}
            </button>
            <p
              v-if="detail.currentRev && !unissued"
              class="text-xs opacity-60"
            >
              Nessuna modifica alla bozza dall'ultima emissione: emetti di nuovo solo se sono cambiati i dati del cliente o di Didap.
            </p>
            <button
              type="button"
              class="
                rounded-full border border-ink/20 px-5 py-2.5 text-sm
                hover:border-ink
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
              class="flex flex-wrap gap-2"
              aria-labelledby="stato-preventivo"
              @update:model-value="(s) => s && setStatus(s as SettableStatus)"
            >
              <ToggleGroupItem
                v-for="s in SETTABLE_STATUSES"
                :key="s"
                :value="s"
                class="
                  rounded-full border border-ink/20 px-3 py-1.5 text-sm
                  hover:border-ink
                  data-[state=on]:border-ink data-[state=on]:bg-ink
                  data-[state=on]:text-paper-light
                "
              >
                {{ STATUS_LABELS[s] }}
              </ToggleGroupItem>
            </ToggleGroupRoot>
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
    </main>
  </AdminShell>
</template>
