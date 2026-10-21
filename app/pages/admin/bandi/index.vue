<script setup lang="ts">
import { useIntervalFn, useMediaQuery } from '@vueuse/core'
import {
  CollapsibleContent,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  CollapsibleRoot,
  CollapsibleTrigger,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
  SwitchRoot,
  SwitchThumb,
  ToggleGroupItem,
  ToggleGroupRoot,
} from 'reka-ui'
import AdminShell from '~/components/admin/AdminShell.vue'
import OptionalNumber from '~/components/admin/OptionalNumber.vue'
import RadarComuniPicker from '~/components/admin/RadarComuniPicker.vue'
import RadarGrantDetail from '~/components/admin/RadarGrantDetail.vue'
import RadarOutcomeIcon from '~/components/admin/RadarOutcomeIcon.vue'
import RadarRunLog from '~/components/admin/RadarRunLog.vue'
import { adminErrorText } from '~/utils/adminErrors'
import { formatDateTime } from '~/utils/format'
import { romeDate } from '#shared/dates'
import { formatWholeEuro } from '#shared/money'
import {
  ELIGIBILITY_PLURALS,
  evaluateRadarGrant,
  isDigestCandidate,
  isInScope,
  LEGAL_FORMS,
  PROVINCES,
  radarSettingsSchema,
  SOURCE_GROUPS,
  WEEKDAYS,
  type Eligibility,
  type EvaluatedGrant,
  type LegalForm,
  type RadarSettings,
  type RadarStatus,
} from '#shared/radar'

// Radar bandi in una schermata: a sinistra la ricerca (fonti, import) e,
// più sotto, i filtri aggiuntivi (parametri dell'azienda) e la mail; al
// centro i bandi divisi per esito o il registro degli import, a destra la
// scheda del bando scelto. L'elenco si rivaluta mentre si cambiano i filtri.
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Bandi - Admin Didap' })

await useAdminSession()
const { notify } = useAdminToast()

type RadarList = { grants: EvaluatedGrant[], status: RadarStatus }
const data = ref<RadarList | null>(null)
const form = ref<RadarSettings | null>(null)
// Un indirizzo per riga; diventa la lista al salvataggio
const emails = ref('')
const saved = ref<RadarSettings | null>(null)
const busy = ref(false)
const saving = ref(false)

const isLg = useMediaQuery('(min-width: 1024px)')
const isXl = useMediaQuery('(min-width: 1280px)')

const emailList = () => emails.value.split(/[\s,;]+/).map(e => e.trim()).filter(Boolean)
const current = () => form.value && { ...form.value, notify: { ...form.value.notify, emails: emailList() } }
const dirty = computed(() => !!form.value && JSON.stringify(current()) !== JSON.stringify(saved.value))

function fill(settings: RadarSettings) {
  saved.value = settings
  form.value = structuredClone(settings)
  emails.value = settings.notify.emails.join('\n')
}

const revert = () => saved.value && fill(saved.value)

async function loadGrants() {
  try {
    data.value = await $fetch<RadarList>('/api/admin/radar/grants')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
}

onAdminReady(async () => {
  try {
    const [settings] = await Promise.all([$fetch<RadarSettings>('/api/admin/radar/settings'), loadGrants()])
    fill(settings)
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
})

// Mentre il radar gira l'elenco si ricarica da solo
const { pause, resume } = useIntervalFn(loadGrants, 10_000, { immediate: false })
watch(() => data.value?.status.running, r => (r ? resume() : pause()))

async function save() {
  const body = current()
  if (!body) return
  // Lo schema condiviso col server, qui per dire subito quale campo non va
  const issue = radarSettingsSchema.safeParse(body).error?.issues[0]
  if (issue) {
    const [, field, index] = issue.path
    notify('error', field === 'emails' && typeof index === 'number' ? `${issue.message}: ${body.notify.emails[index]}` : issue.message)
    return
  }
  saving.value = true
  try {
    fill(await $fetch<RadarSettings>('/api/admin/radar/settings', { method: 'PUT', body }))
    notify('ok', 'Parametri salvati')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    saving.value = false
  }
}

// Un pulsante del radar: l'azione restituisce il messaggio da mostrare
async function act(action: () => Promise<string>) {
  busy.value = true
  try {
    notify('ok', await action())
    await loadGrants()
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
  }
}

// Al centro: i bandi o il registro degli import
const view = ref<'grants' | 'runs'>('grants')
const runLog = ref<InstanceType<typeof RadarRunLog> | null>(null)

// "Importa": i moduli e i comuni spuntati, anche se non ancora salvati
const importScope = computed(() => {
  const s = form.value?.search
  if (!s) return null
  const groups = s.groups.filter(g => g !== 'comuni' || s.comuni.length)
  return { groups, comuni: groups.includes('comuni') ? s.comuni : [] }
})

const runNow = () => act(async () => {
  await $fetch('/api/admin/radar/run', { method: 'POST', body: importScope.value })
  view.value = 'runs'
  await nextTick()
  await runLog.value?.load()
  return 'Import partito: lo segui nel registro'
})

// Svuota con conferma in due passi, senza finestre del browser
const confirmWipe = ref(false)
const wipe = () => act(async () => {
  confirmWipe.value = false
  const { deleted } = await $fetch<{ deleted: number }>('/api/admin/radar/wipe', { method: 'POST' })
  return `Dati svuotati: ${deleted} testi cancellati`
})

const sendNow = () => act(async () => {
  const { sent } = await $fetch<{ sent: number }>('/api/admin/radar/digest', { method: 'POST' })
  return sent ? `Mail inviata con ${sent} bandi` : 'Nessun bando nuovo da inviare'
})

// Valutazione coi parametri del pannello, anche prima di salvarli
const now = new Date()
const grants = computed<EvaluatedGrant[]>(() => {
  const f = form.value
  const list = data.value?.grants ?? []
  if (!f) return list
  return list.filter(g => isInScope(g, f.search)).map(g => ({ ...g, ...evaluateRadarGrant(g, f.profile, now) }))
})

// Le schede per esito, più quella dei bandi segnati col cuore
type Tab = Eligibility | 'liked'
const TABS: Record<Tab, string> = { ...ELIGIBILITY_PLURALS, liked: 'Interessanti' }
const tab = ref<Tab>('eligible')
const query = ref('')

const counts = computed(() => {
  const out: Record<Tab, number> = { eligible: 0, to_verify: 0, excluded: 0, liked: 0 }
  for (const g of grants.value) {
    out[g.eligibility]++
    if (g.liked) out.liked++
  }
  return out
})

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return grants.value.filter(g =>
    (tab.value === 'liked' ? g.liked : g.eligibility === tab.value)
    && (!q || `${g.title} ${g.issuer} ${g.summary}`.toLowerCase().includes(q)))
})

// Il cuore cambia subito; se il salvataggio non va, torna com'era
async function toggleLike(id: string) {
  const g = data.value?.grants.find(x => x.id === id)
  if (!g) return
  const liked = !g.liked
  g.liked = liked
  try {
    await $fetch(`/api/admin/radar/grants/${id}/like`, { method: 'PUT', body: { liked } })
  }
  catch (err) {
    g.liked = !liked
    notify('error', adminErrorText(err))
  }
}

const selectedId = ref<string | null>(null)
const selected = computed(() => visible.value.find(g => g.id === selectedId.value) ?? null)

// Sullo schermo largo la scheda a destra non resta mai vuota se c'è un bando
watchEffect(() => {
  if (isXl.value && !selected.value && visible.value.length) selectedId.value = visible.value[0]!.id
})

function pick(id: string) {
  // Sotto xl la scheda si apre sotto la riga: un secondo clic la chiude
  selectedId.value = !isXl.value && selectedId.value === id ? null : id
}

const DAY = 86_400_000
// Quanto manca, in giorni di calendario a Roma
function timeLeft(g: EvaluatedGrant) {
  if (!g.deadline) return { text: 'A sportello', urgent: false }
  const days = (Date.parse(romeDate(new Date(g.deadline))) - Date.parse(romeDate(now))) / DAY
  const text = days <= 0 ? 'Scade oggi' : days === 1 ? 'Scade domani' : `${days} giorni`
  return { text, urgent: days <= 14 }
}

const ELIGIBILITY_OUTCOME = { eligible: 'met', to_verify: 'to_verify', excluded: 'not_met' } as const

const EMPTY: Record<Tab, string> = {
  eligible: 'Nessun bando candidabile.',
  to_verify: 'Nessun bando da verificare.',
  excluded: 'Nessun bando escluso.',
  liked: 'Nessun bando segnato: usa il cuore su quelli che vi interessano.',
}

// Etichette brevi per la colonna stretta
const SHORT_FORMS: Record<LegalForm, string> = {
  ditta_individuale: 'Ditta individuale',
  libero_professionista: 'Professionista',
  societa_persone: 'Snc, sas',
  societa_capitali: 'Srl, spa',
  cooperativa: 'Cooperativa',
  da_costituire: 'Da costituire',
}

// Giorni sempre in ordine, lunedì per primo
const weekdays = computed({
  get: () => form.value?.notify.weekdays.map(String) ?? [],
  set: (v: string[]) => {
    if (form.value) form.value.notify.weekdays = v.map(Number).sort((a, b) => a - b)
  },
})

const sourceErrors = computed(() => data.value?.status.lastIngestError?.split('\n').filter(Boolean) ?? [])

// Su schermi stretti la colonna si apre a richiesta; filtri aggiuntivi e
// mail restano chiusi finché non servono
const paramsOpen = ref(false)
const extraOpen = ref(false)
const mailOpen = ref(false)

function toggleGroup(group: string, on: boolean) {
  const s = form.value!.search
  s.groups = SOURCE_GROUPS.map(g => g.value).filter(g => (g === group ? on : s.groups.includes(g)))
}
</script>

<template>
  <AdminShell fill>
    <div class="
      grid flex-1 grid-cols-[minmax(0,1fr)] content-start
      lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)] lg:content-stretch
      xl:grid-cols-[18rem_minmax(0,1fr)_minmax(0,30rem)]
      2xl:grid-cols-[19rem_minmax(0,1fr)_minmax(0,38rem)]
    ">
      <!-- Parametri -->
      <CollapsibleRoot
        as="aside"
        :open="isLg || paramsOpen"
        class="
          flex min-h-0 flex-col border-b border-ink/10
          lg:border-r lg:border-b-0
        "
        aria-label="Ricerca e filtri del radar"
        @update:open="paramsOpen = $event"
      >
        <CollapsibleTrigger
          class="
            flex items-center justify-between gap-3 px-5 py-4 text-left
            font-bold
            lg:hidden
          "
        >
          Ricerca e filtri
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            class="transition-transform"
            :class="paramsOpen ? 'rotate-180' : ''"
            aria-hidden="true"
          >
            <path
              d="M4 6l4 4 4-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </CollapsibleTrigger>
        <CollapsibleContent
          v-if="form"
          class="
            flex min-h-0 flex-1 flex-col
            data-[state=closed]:hidden
          "
        >
          <form
            class="flex min-h-0 flex-1 flex-col"
            @submit.prevent="save"
          >
            <div class="
              flex flex-1 scrollbar-none flex-col divide-y divide-ink/10
              overflow-y-auto
            ">
              <section
                class="flex flex-col gap-3 p-5"
                aria-labelledby="ricerca"
              >
                <h2
                  id="ricerca"
                  class="text-sm font-bold"
                >
                  Ricerca
                </h2>
                <div class="flex flex-col gap-1">
                  <div
                    v-for="g in SOURCE_GROUPS"
                    :key="g.value"
                    class="flex flex-col gap-2"
                  >
                    <label class="param-row">
                      <span>
                        {{ g.label }}
                        <span class="block text-xs whitespace-normal opacity-60">{{ g.hint }}</span>
                      </span>
                      <SwitchRoot
                        :model-value="form.search.groups.includes(g.value)"
                        class="param-switch"
                        @update:model-value="v => toggleGroup(g.value, v)"
                      >
                        <SwitchThumb />
                      </SwitchRoot>
                    </label>
                    <RadarComuniPicker
                      v-if="g.value === 'comuni' && form.search.groups.includes('comuni')"
                      v-model="form.search.comuni"
                      class="mb-2"
                    />
                  </div>
                  <label class="param-row">
                    <span>
                      Solo digitali
                      <span class="block text-xs opacity-60">Sviluppo IT, IA, servizi</span>
                    </span>
                    <SwitchRoot
                      v-model="form.search.digitalOnly"
                      class="param-switch"
                    >
                      <SwitchThumb />
                    </SwitchRoot>
                  </label>
                </div>
                <button
                  type="button"
                  class="
                    rounded-full bg-ink px-4 py-2 text-sm font-medium
                    text-paper-light
                    hover:bg-green
                    disabled:opacity-40
                  "
                  :disabled="busy || !data || data.status.running || !data.status.llmConfigured || !importScope?.groups.length"
                  :title="data && !data.status.llmConfigured ? 'Manca ANTHROPIC_API_KEY' : undefined"
                  @click="runNow"
                >
                  {{ data?.status.running ? 'Import in corso…' : 'Importa' }}
                </button>
                <p
                  v-if="!confirmWipe"
                  class="text-xs"
                >
                  <button
                    type="button"
                    class="
                      underline decoration-dotted underline-offset-2 opacity-60
                      hover:opacity-100
                      disabled:opacity-30
                    "
                    :disabled="busy || data?.status.running"
                    @click="confirmWipe = true"
                  >
                    Svuota i dati
                  </button>
                </p>
                <div
                  v-else
                  class="flex flex-col gap-2 rounded-lg bg-red/8 p-3 text-xs"
                  role="alert"
                >
                  <p>Cancello tutti i bandi letti, cuori compresi. Impostazioni e registro restano.</p>
                  <span class="flex gap-2">
                    <button
                      type="button"
                      class="
                        rounded-full bg-red px-3 py-1 font-medium
                        text-paper-light
                      "
                      @click="wipe"
                    >
                      Svuota
                    </button>
                    <button
                      type="button"
                      class="
                        rounded-full px-3 py-1 opacity-60
                        hover:opacity-100
                      "
                      @click="confirmWipe = false"
                    >
                      Annulla
                    </button>
                  </span>
                </div>
              </section>
              <CollapsibleRoot v-model:open="extraOpen">
                <CollapsibleTrigger class="
                  flex w-full items-center justify-between px-5 py-4 text-left
                  text-sm font-bold
                  hover:bg-ink/3
                ">
                  Filtri aggiuntivi
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    class="opacity-50 transition-transform"
                    :class="extraOpen ? 'rotate-180' : ''"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </CollapsibleTrigger>
                <CollapsibleContent class="
                  divide-y divide-ink/10 border-t border-ink/10
                  data-[state=closed]:hidden
                ">
              <fieldset class="flex flex-col gap-1 p-5">
                <legend class="contents">
                  <span class="mb-2 block text-sm font-bold">Azienda</span>
                </legend>
                <label class="mb-2 flex flex-col gap-1.5 text-sm">
                  Cosa fa
                  <textarea
                    v-model="form.profile.description"
                    rows="3"
                    maxlength="500"
                    class="resize-none panel-input"
                  />
                </label>
                <label class="param-row">
                  Fatturato
                  <OptionalNumber
                    v-model="form.profile.revenue"
                    suffix="€"
                    class="w-32"
                  />
                </label>
                <label class="param-row">
                  Dipendenti
                  <OptionalNumber
                    v-model="form.profile.employees"
                    class="w-32"
                  />
                </label>
                <label class="param-row">
                  Fondata nel
                  <OptionalNumber
                    v-model="form.profile.foundedYear"
                    plain
                    class="w-32"
                  />
                </label>
                <label class="param-row">
                  ATECO
                  <input
                    v-model="form.profile.ateco"
                    maxlength="8"
                    class="w-32 panel-input text-right tabular-nums"
                  >
                </label>
                <div class="param-row">
                  <span id="forma">Forma</span>
                  <SelectRoot v-model="form.profile.legalForm">
                    <SelectTrigger
                      aria-labelledby="forma"
                      class="select-trigger w-40 panel-input"
                    >
                      <SelectValue class="truncate">
                        {{ SHORT_FORMS[form.profile.legalForm] }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectContent
                        position="popper"
                        :side-offset="4"
                        align="end"
                        class="select-content admin-select-content"
                      >
                        <SelectViewport>
                          <SelectItem
                            v-for="o in LEGAL_FORMS"
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
                <div class="param-row">
                  <span id="provincia">Provincia</span>
                  <SelectRoot v-model="form.profile.province">
                    <SelectTrigger
                      aria-labelledby="provincia"
                      class="select-trigger w-40 panel-input"
                    >
                      <SelectValue class="truncate">
                        {{ PROVINCES.find(p => p.value === form!.profile.province)?.label }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectContent
                        position="popper"
                        :side-offset="4"
                        align="end"
                        class="select-content admin-select-content"
                      >
                        <SelectViewport>
                          <SelectItem
                            v-for="o in PROVINCES"
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
                <label class="param-row">
                  Età titolare
                  <OptionalNumber
                    v-model="form.profile.founderAge"
                    suffix="anni"
                    class="w-32"
                  />
                </label>
                <label class="param-row">
                  Impresa femminile
                  <SwitchRoot
                    v-model="form.profile.femaleLed"
                    class="param-switch"
                  >
                    <SwitchThumb />
                  </SwitchRoot>
                </label>
              </fieldset>

              <fieldset class="flex flex-col gap-1 p-5">
                <legend class="contents">
                  <span class="mb-2 block text-sm font-bold">Progetto</span>
                </legend>
                <label class="param-row">
                  Durata
                  <OptionalNumber
                    v-model="form.profile.projectMonths"
                    suffix="mesi"
                    class="w-32"
                  />
                </label>
                <label class="param-row">
                  Investimento
                  <OptionalNumber
                    v-model="form.profile.investment"
                    suffix="€"
                    class="w-32"
                  />
                </label>
              </fieldset>

                </CollapsibleContent>
              </CollapsibleRoot>
              <CollapsibleRoot v-model:open="mailOpen">
                <CollapsibleTrigger class="
                  flex w-full items-center justify-between px-5 py-4 text-left
                  text-sm font-bold
                  hover:bg-ink/3
                ">
                  Mail di riepilogo
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    class="opacity-50 transition-transform"
                    :class="mailOpen ? 'rotate-180' : ''"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </CollapsibleTrigger>
                <CollapsibleContent class="
                  divide-y divide-ink/10 border-t border-ink/10
                  data-[state=closed]:hidden
                ">
              <fieldset class="flex flex-col gap-1 p-5">
                <label class="param-row">
                  Invio
                  <SwitchRoot
                    v-model="form.notify.enabled"
                    class="param-switch"
                  >
                    <SwitchThumb />
                  </SwitchRoot>
                </label>
                <label class="mt-2 flex flex-col gap-1.5 text-sm">
                  A chi
                  <textarea
                    v-model="emails"
                    rows="2"
                    placeholder="nome@didap.it"
                    class="resize-none panel-input"
                  />
                </label>
                <div
                  class="mt-3 flex flex-col gap-1.5 text-sm"
                  role="group"
                  aria-label="Giorni"
                >
                  Giorni
                  <ToggleGroupRoot
                    v-model="weekdays"
                    type="multiple"
                    class="grid grid-cols-7 gap-1"
                  >
                    <ToggleGroupItem
                      v-for="d in WEEKDAYS"
                      :key="d.value"
                      :value="String(d.value)"
                      :aria-label="d.label"
                      class="
                        rounded-md bg-ink/5 py-1.5 text-xs transition
                        hover:bg-ink/10
                        data-[state=on]:bg-ink data-[state=on]:text-paper-light
                      "
                    >
                      {{ d.label.charAt(0) }}
                    </ToggleGroupItem>
                  </ToggleGroupRoot>
                </div>
                <label class="mt-2 param-row">
                  Ora
                  <input
                    v-model="form.notify.time"
                    type="time"
                    required
                    class="w-32 panel-input text-right tabular-nums"
                  >
                </label>
              </fieldset>
                </CollapsibleContent>
              </CollapsibleRoot>
            </div>

            <div
              v-if="dirty"
              class="flex items-center gap-2 border-t border-ink/10 px-5 py-3"
            >
              <button
                type="submit"
                class="
                  rounded-full bg-green px-4 py-2 text-sm font-medium
                  text-paper-light
                  hover:bg-ink
                  disabled:opacity-40
                "
                :disabled="saving"
              >
                {{ saving ? 'Salvo…' : 'Salva' }}
              </button>
              <button
                type="button"
                class="
                  rounded-full px-3 py-2 text-sm opacity-60
                  hover:opacity-100
                "
                @click="revert"
              >
                Annulla
              </button>
            </div>
          </form>
        </CollapsibleContent>
      </CollapsibleRoot>

      <!-- Elenco -->
      <section
        class="flex min-h-0 flex-col"
        aria-label="Bandi"
      >
        <header class="
          flex flex-col gap-4 border-b border-ink/10 px-5 pt-5 pb-4
          lg:px-8
        ">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
            <h1 class="text-2xl font-bold">
              Bandi
            </h1>
            <ToggleGroupRoot
              :model-value="view"
              type="single"
              class="toggle-segmented"
              aria-label="Vista"
              @update:model-value="v => v && (view = v as 'grants' | 'runs')"
            >
              <ToggleGroupItem value="grants">
                Elenco
              </ToggleGroupItem>
              <ToggleGroupItem value="runs">
                Import
              </ToggleGroupItem>
            </ToggleGroupRoot>
            <p
              v-if="data"
              class="text-sm opacity-60"
            >
              <template v-if="data.status.running">
                Import in corso…
              </template>
              <template v-else>
                Aggiornato {{ data.status.lastIngestAt ? formatDateTime(data.status.lastIngestAt) : 'mai' }}
              </template>
              <template v-if="data.status.pending">
                · {{ data.status.pending }} in lettura
              </template>
            </p>
            <span
              v-if="data"
              class="ml-auto flex gap-2"
            >
              <button
                type="button"
                class="
                  rounded-full border border-ink/20 px-3.5 py-1.5 text-sm
                  hover:border-ink
                  disabled:opacity-40
                "
                :disabled="busy || !data.status.emailConfigured"
                :title="data.status.emailConfigured ? undefined : 'Manca RESEND_API_KEY'"
                @click="sendNow"
              >
                Invia mail
              </button>
            </span>
          </div>

          <p
            v-if="data && (!data.status.llmConfigured || !data.status.emailConfigured || sourceErrors.length)"
            class="flex flex-wrap gap-x-4 text-sm text-red"
          >
            <span v-if="!data.status.llmConfigured">Modello AI non configurato</span>
            <span v-if="!data.status.emailConfigured">Mail non configurata</span>
            <!-- Il dettaglio si apre col clic: le fonti riprovano da sole al giro dopo -->
            <PopoverRoot v-if="sourceErrors.length">
              <PopoverTrigger class="
                underline decoration-dotted underline-offset-2
                hover:decoration-solid
              ">
                {{ sourceErrors.length === 1 ? '1 errore' : `${sourceErrors.length} errori` }} delle fonti
              </PopoverTrigger>
              <PopoverPortal>
                <PopoverContent
                  side="bottom"
                  align="start"
                  :side-offset="6"
                  class="
                    z-50 flex max-w-xl flex-col gap-2 rounded-2xl border
                    border-ink/10 bg-white p-4 text-sm shadow-lg
                  "
                >
                  <p class="opacity-60">
                    Pagine che non si sono scaricate all'ultimo aggiornamento. Si riprovano da sole al prossimo.
                  </p>
                  <ul class="flex flex-col gap-1.5">
                    <li
                      v-for="(e, i) in sourceErrors"
                      :key="i"
                      class="text-xs/relaxed break-all text-ink/80"
                    >
                      {{ e }}
                    </li>
                  </ul>
                </PopoverContent>
              </PopoverPortal>
            </PopoverRoot>
          </p>

          <div
            v-if="view === 'grants'"
            class="flex flex-wrap items-center gap-3"
          >
            <ToggleGroupRoot
              :model-value="tab"
              type="single"
              class="toggle-segmented max-w-full scrollbar-none overflow-x-auto"
              aria-label="Esito"
              @update:model-value="v => v && (tab = v as Tab)"
            >
              <ToggleGroupItem
                v-for="(name, key) in TABS"
                :key="key"
                :value="key"
                class="
                  px-2! whitespace-nowrap
                  sm:px-3!
                "
              >
                {{ name }}
                <span class="tabular-nums opacity-60">{{ counts[key] }}</span>
              </ToggleGroupItem>
            </ToggleGroupRoot>
            <input
              v-model="query"
              type="search"
              placeholder="Cerca"
              aria-label="Cerca nei bandi"
              class="
                panel-input rounded-full px-4
                sm:ml-auto sm:w-64
              "
            >
          </div>
        </header>

        <RadarRunLog
          v-if="view === 'runs'"
          ref="runLog"
          class="
            min-h-0 flex-1 scrollbar-none
            lg:overflow-y-auto
          "
        />
        <div
          v-else
          class="
            min-h-0 flex-1 scrollbar-none
            lg:overflow-y-auto
          "
        >
          <p
            v-if="!data"
            class="px-8 py-10 opacity-60"
          >
            Carico i bandi…
          </p>
          <p
            v-else-if="!visible.length"
            class="px-8 py-10 opacity-60"
          >
            <template v-if="query">
              Nessun risultato per "{{ query }}".
            </template>
            <template v-else-if="!grants.length && data.status.pending">
              Il radar sta leggendo i bandi: compaiono qui man mano.
            </template>
            <template v-else>
              {{ EMPTY[tab] }}
            </template>
          </p>
          <ul v-else>
            <li
              v-for="g in visible"
              :key="g.id"
              class="border-b border-ink/10"
            >
              <div
                class="flex items-stretch transition"
                :class="selectedId === g.id ? 'bg-white' : 'hover:bg-ink/3'"
              >
              <button
                type="button"
                class="
                  grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto]
                  items-start gap-x-4 py-4 pl-5 text-left
                  lg:pl-8
                "
                :aria-expanded="isXl ? undefined : selectedId === g.id"
                :aria-current="isXl && selectedId === g.id ? 'true' : undefined"
                @click="pick(g.id)"
              >
                <RadarOutcomeIcon
                  :outcome="ELIGIBILITY_OUTCOME[g.eligibility]"
                  class="mt-0.5"
                />
                <span class="flex min-w-0 flex-col gap-1">
                  <span class="line-clamp-2 font-medium">
                    {{ g.title }}
                    <span
                      v-if="isDigestCandidate(g)"
                      class="
                        ml-1 inline-block size-2 rounded-full bg-green
                        align-middle
                      "
                      title="Nuovo, va nella prossima mail"
                    />
                  </span>
                  <span class="truncate text-sm opacity-60">{{ g.issuer }}</span>
                </span>
                <span class="
                  flex flex-col items-end gap-1 text-right text-sm
                  whitespace-nowrap
                ">
                  <span :class="timeLeft(g).urgent ? 'font-medium text-red' : ''">{{ timeLeft(g).text }}</span>
                  <span
                    v-if="g.maxAmount"
                    class="tabular-nums opacity-60"
                  >{{ formatWholeEuro(g.maxAmount) }}</span>
                </span>
              </button>
              <button
                type="button"
                class="
                  flex shrink-0 items-start px-4 pt-4 transition
                  hover:text-red
                  lg:pr-7
                "
                :class="g.liked ? 'text-red' : 'text-ink/25'"
                :aria-pressed="g.liked"
                :aria-label="g.liked ? 'Togli dagli interessanti' : 'Segna come interessante'"
                :title="g.liked ? 'Togli dagli interessanti' : 'Segna come interessante'"
                @click="toggleLike(g.id)"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    d="M10 17s-6.5-3.9-6.5-8.6A3.6 3.6 0 0 1 10 6.3a3.6 3.6 0 0 1 6.5 2.1C16.5 13.1 10 17 10 17z"
                    :fill="g.liked ? 'currentColor' : 'none'"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              </div>
              <div
                v-if="!isXl && selectedId === g.id"
                class="border-t border-ink/10 bg-white"
              >
                <RadarGrantDetail :grant="g" />
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- Scheda del bando -->
      <aside
        class="
          hidden min-h-0 scrollbar-none overflow-y-auto border-l border-ink/10
          bg-white
          xl:block
        "
        aria-label="Scheda del bando"
      >
        <RadarGrantDetail
          v-if="selected"
          :grant="selected"
        />
      </aside>
    </div>
  </AdminShell>
</template>
