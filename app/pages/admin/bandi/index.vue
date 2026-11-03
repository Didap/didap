<script setup lang="ts">
import { until, useDocumentVisibility, useEventListener, useLocalStorage, useMediaQuery } from '@vueuse/core'
import {
  CollapsibleContent,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
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
import AdminConfirm from '~/components/admin/AdminConfirm.vue'
import AdminIcon from '~/components/admin/AdminIcon.vue'
import AdminShell from '~/components/admin/AdminShell.vue'
import OptionalNumber from '~/components/admin/OptionalNumber.vue'
import RadarGrantDetail from '~/components/admin/RadarGrantDetail.vue'
import RadarGrantDue from '~/components/admin/RadarGrantDue.vue'
import RadarGrantTags from '~/components/admin/RadarGrantTags.vue'
import RadarLikeButton from '~/components/admin/RadarLikeButton.vue'
import RadarOutcomeIcon from '~/components/admin/RadarOutcomeIcon.vue'
import RadarProvincePicker from '~/components/admin/RadarProvincePicker.vue'
import RadarRunLog from '~/components/admin/RadarRunLog.vue'
import { GRANT_DRAFT, useGrantDraft } from '~/composables/useGrantDraft'
import { usePollWhile } from '~/composables/usePollWhile'
import { holdsDraft, refreshesDraft, shownGrant } from '~/utils/grantDraftEditor'
import { adminErrorText } from '~/utils/adminErrors'
import { formatDateTime } from '~/utils/format'
import {
  ELIGIBILITY_OUTCOME,
  ELIGIBILITY_PLURALS,
  evaluateRadarGrant,
  grantTrack,
  GRANT_TRACKS,
  isInScope,
  isKept,
  isNewIn,
  LEGAL_FORMS,
  OUTCOME_LABELS,
  PROVINCES,
  radarSettingsSchema,
  SOURCE_GROUPS,
  type Eligibility,
  type EvaluatedGrant,
  type FolderStart,
  type GrantTrack,
  type LegalForm,
  type RadarGrant,
  type RadarSettings,
  type RadarStatus,
} from '#shared/radar'

// Radar bandi in una schermata: a sinistra la ricerca (fonti, scan) e,
// più sotto, i filtri aggiuntivi (parametri dell'azienda) e la mail; al
// centro i bandi (nuovi dell'ultimo scan, per esito, interessanti) o il
// registro degli scan, a destra la scheda del bando scelto. L'elenco si
// rivaluta mentre si cambiano i filtri. Gli scan partono solo da qui.
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Bandi - Admin Didap' })

await useAdminSession()
const { notify } = useAdminToast()

// Bandi grezzi dal server: si valutano qui coi parametri del modulo. Sono
// tanti (anche gli scaduti): niente reattività profonda, chi cambia un bando
// sul posto passa da editGrant
type RadarList = { grants: RadarGrant[], status: RadarStatus }
const data = shallowRef<RadarList | null>(null)
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

// Vince l'ultima versione: una lettura partita prima di un'altra lettura, o
// di un cambio fatto qui (editGrant), non riporta indietro lo stato
let version = 0
let reading = 0
async function loadGrants() {
  const v = ++version
  reading++
  try {
    const list = await $fetch<RadarList>('/api/admin/radar/grants')
    if (v === version) data.value = list
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    reading--
  }
}

// Un bando cambiato qui (cuore, candidatura, cartella): sul posto, come
// versione più nuova di ogni lettura in volo, e la vista si aggiorna
function editGrant(id: string, edit: (g: RadarGrant) => void) {
  const g = data.value?.grants.find(x => x.id === id)
  if (!g) return
  edit(g)
  version++
  triggerRef(data)
}

onAdminReady(async () => {
  try {
    const [settings] = await Promise.all([$fetch<RadarSettings>('/api/admin/radar/settings'), loadGrants()])
    fill(settings)
    if (counts.value.new) tab.value = 'new'
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
})

// Mentre il radar gira, una cartella del bando si sta riempiendo o si cerca
// un esito, l'elenco si ricarica da solo. Un giro salta se la lettura di
// prima non è tornata: con tanti bandi una lettura lenta non va scartata
const busyRadar = computed(() => !!data.value?.status.running || !!data.value?.grants.some(g => g.folderFilling || g.outcomeChecking))
usePollWhile(() => reading || loadGrants(), busyRadar, 10_000)

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

// Al centro: i bandi o il registro degli scan
const view = ref<'grants' | 'runs'>('grants')
const runLog = ref<InstanceType<typeof RadarRunLog> | null>(null)

// "Avvia scan": i moduli e le province spuntati, anche se non ancora salvati
const importScope = computed(() => {
  const s = form.value?.search
  if (!s) return null
  const groups = s.groups.filter(g => g !== 'comuni' || s.provinces.length)
  return { groups, provinces: groups.includes('comuni') ? s.provinces : [] }
})

const runNow = () => act(async () => {
  await $fetch('/api/admin/radar/run', { method: 'POST', body: importScope.value })
  view.value = 'runs'
  await nextTick()
  await runLog.value?.load()
  return 'Scan partito: lo segui nel registro'
})

// Un bando del registro (viene dallo stesso elenco): si apre nella sua
// scheda, senza la ricerca testuale che potrebbe nasconderlo
function openFromLog(id: string) {
  const g = grants.value.find(x => x.id === id)
  if (!g) return
  view.value = 'grants'
  query.value = ''
  tab.value = TAB_KEYS.find(t => inTab(t, g)) ?? tab.value
  guardDraft(() => (selectedId.value = id))
}

// Svuota con conferma in due passi, senza finestre del browser
const confirmWipe = ref(false)
const wipe = () => act(async () => {
  confirmWipe.value = false
  const { deleted, kept } = await $fetch<{ deleted: number, kept: number }>('/api/admin/radar/wipe', { method: 'POST' })
  return `Dati svuotati: ${deleted} testi cancellati${kept ? `, ${kept} bandi con cartella o candidatura tenuti` : ''}`
})

const sendNow = () => act(async () => {
  const { sent } = await $fetch<{ sent: number }>('/api/admin/radar/digest', { method: 'POST' })
  return sent ? `Mail inviata con ${sent} bandi` : 'Nessun bando nuovo da inviare'
})

// Valutazione coi parametri del pannello, anche prima di salvarli. I bandi
// tenuti (cartella o candidatura) restano anche fuori dalla ricerca scelta.
const now = new Date()
const grants = computed<EvaluatedGrant[]>(() => {
  const f = form.value
  const list = data.value?.grants ?? []
  if (!f) return []
  return list.filter(g => isKept(g) || isInScope(g, f.search)).map(g => ({ ...g, ...evaluateRadarGrant(g, f.profile, now) }))
})

// Le schede: i bandi nuovi dell'ultimo scan, poi gli aperti per esito, poi
// dove sta un bando segnato o chiuso (grantTrack: interessanti, candidati,
// esiti, scaduti), in una sola. Gli scaduti restano tutti, anche senza
// cuore: lì si apre anche la loro cartella.
const isNew = (g: EvaluatedGrant) => isNewIn(g, data.value?.status.lastScan?.id)
type Tab = 'new' | Eligibility | GrantTrack
const TABS: Record<Tab, string> = {
  new: 'Nuovi',
  ...ELIGIBILITY_PLURALS,
  liked: 'Interessanti',
  applied: 'Candidati',
  outcome: 'Esiti',
  expired: 'Scaduti',
}
const TAB_KEYS = Object.keys(TABS) as Tab[]
const TRACKS: readonly Tab[] = GRANT_TRACKS
const tab = ref<Tab>('eligible')
const query = ref('')

// In che scheda sta un bando: un bando nuovo sta anche nel suo esito
function inTab(t: Tab, g: EvaluatedGrant) {
  if (t === 'new') return isNew(g)
  if (TRACKS.includes(t)) return grantTrack(g) === t
  return !g.closed && g.eligibility === t
}

// Il bando aperto è passato a un'altra delle nostre schede (candidatura,
// esito trovato): lo si segue, così resta davanti
function follow(id: string) {
  const g = grants.value.find(x => x.id === id)
  const track = g && grantTrack(g)
  if (track && selectedId.value === id && TRACKS.includes(tab.value)) tab.value = track
}

const counts = computed(() => {
  const out = Object.fromEntries(TAB_KEYS.map(t => [t, 0])) as Record<Tab, number>
  for (const g of grants.value) {
    for (const t of TAB_KEYS) if (inTab(t, g)) out[t]++
  }
  return out
})

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return grants.value.filter(g => inTab(tab.value, g) && (!q || `${g.title} ${g.issuer} ${g.summary}`.toLowerCase().includes(q)))
})

// L'ultimo scan del registro è in corso (il radar è occupato anche quando
// rigiudica dopo un cambio di profilo: quello non è uno scan)
const scanning = computed(() => data.value?.status.lastScan?.status === 'running')

// Uno scan appena finito, partito da qui o da un'altra scheda: si dice
// quanti bandi nuovi ha trovato e si apre la loro scheda
watch(() => data.value?.status.lastScan, (scan, was) => {
  if (!scan || was?.id !== scan.id || was.status !== 'running' || scan.status === 'running') return
  if (scan.status === 'failed') {
    notify('error', 'Scan non riuscito: il motivo è nel registro')
    return
  }
  const n = counts.value.new
  notify('ok', n === 1 ? 'Scan finito: 1 bando nuovo' : `Scan finito: ${n} bandi nuovi`)
  if (n) tab.value = 'new'
})

// Cuore e candidatura cambiano subito, e il bando aperto si segue se cambia
// scheda; se il salvataggio non va, tornano com'erano
async function patchGrant(id: string, patch: Partial<Pick<RadarGrant, 'liked' | 'applied'>>, save: () => Promise<unknown>) {
  const g = data.value?.grants.find(x => x.id === id)
  if (!g) return
  const before = { liked: g.liked, applied: g.applied }
  editGrant(id, x => Object.assign(x, patch))
  follow(id)
  try {
    await save()
  }
  catch (err) {
    editGrant(id, x => Object.assign(x, before))
    follow(id)
    notify('error', adminErrorText(err))
  }
}

function toggleLike(id: string) {
  const liked = !data.value?.grants.find(x => x.id === id)?.liked
  return patchGrant(id, { liked }, () => $fetch(`/api/admin/radar/grants/${id}/like`, { method: 'PUT', body: { liked } }))
}

// La candidatura mette anche il cuore: si sceglie tra gli interessanti
const setApplied = (id: string, applied: boolean) => patchGrant(
  id,
  applied ? { applied, liked: true } : { applied },
  () => $fetch(`/api/admin/radar/grants/${id}/apply`, { method: 'PUT', body: { applied } }),
)

// "Controlla esito": parte in background, l'elenco si ricarica finché il
// controllo è in corso
async function checkOutcome(id: string) {
  try {
    await $fetch(`/api/admin/radar/grants/${id}/outcome`, { method: 'POST' })
  }
  catch (err) {
    notify('error', adminErrorText(err))
    return
  }
  // Il turno è già preso: rileggendo il bando risulta in controllo
  await loadGrants()
}

// Un controllo dell'esito appena finito: si dice com'è andato e il bando
// aperto si segue nella sua scheda
watch(() => data.value?.grants, (list, was) => {
  const checking = new Set(was?.filter(g => g.outcomeChecking).map(g => g.id))
  if (!checking.size) return
  for (const g of list ?? []) {
    if (g.outcomeChecking || !checking.has(g.id)) continue
    if (g.outcomeError) notify('error', `Esito non controllato: ${g.title}`)
    else if (g.outcome) notify('ok', `${OUTCOME_LABELS[g.outcome.status].title}: ${g.title}`)
    follow(g.id)
  }
})

// Cartella del bando: già riempita, o partita (l'elenco si ricarica
// finché c'è una cartella in riempimento)
function setFolder(id: string, start: FolderStart) {
  editGrant(id, (g) => {
    g.hasFolder = true
    g.liked = true
    g.folderFilled = start.status === 'ready'
    g.folderFilling = start.status === 'filling'
    // Il server azzera nota ed errore quando riparte: qui subito, senza aspettare
    if (g.folderFilling) {
      g.folderNote = ''
      g.folderFailed = false
    }
  })
}

// Scheda del dettaglio ("Dettaglio", "File" o "Bozza"): resta passando da un bando all'altro
type DetailTab = 'detail' | 'files' | 'draft'
const detailTab = ref<DetailTab>('detail')

// Bozza della candidatura aperta: qui e non nella scheda, che si rimonta
// (larghezza, filtri) senza perdere il testo. Il primo salvataggio crea
// cartella e cuore: l'elenco si rilegge e segue il riempimento come dopo
// "Crea cartella del bando".
const draft = useGrantDraft((id) => {
  editGrant(id, (g) => {
    g.hasFolder = true
    g.liked = true
  })
  loadGrants()
})
provide(GRANT_DRAFT, draft)

// Bozza con modifiche non salvate: prima di cambiare bando, scheda o pagina
// si chiede conferma, e confermando le modifiche si buttano. Con un
// salvataggio in corso si aspetta che torni: andato bene, l'editor ha già
// il testo salvato e non si chiede niente; rifiutato o fallito, le
// modifiche ci sono ancora e si chiede. Mai buttare un testo in viaggio.
const pendingLeave = ref<null | (() => unknown)>(null)
const leaveOpen = computed({
  get: () => !!pendingLeave.value,
  set: (v) => {
    if (!v) pendingLeave.value = null
  },
})

const saveSettled = () => until(() => draft.saving).toBe(false)

async function guardDraft(action: () => unknown) {
  await saveSettled()
  if (draft.dirty) pendingLeave.value = action
  else action()
}

function leaveDraft() {
  const action = pendingLeave.value
  pendingLeave.value = null
  draft.discard()
  action?.()
}

const router = useRouter()
onBeforeRouteLeave(async (to) => {
  await saveSettled()
  if (!draft.dirty) return true
  pendingLeave.value = () => router.push(to.fullPath)
  return false
})
// Chiudere o ricaricare la scheda del browser: la domanda standard del browser
useEventListener('beforeunload', (e: BeforeUnloadEvent) => {
  if (draft.dirty || draft.saving) e.preventDefault()
})

function setDetailTab(t: DetailTab) {
  if (t !== detailTab.value) guardDraft(() => (detailTab.value = t))
}

// La scheda del bando, uguale nei tre posti in cui si apre (sotto la riga,
// a destra, nel pannello delle card): stessi dati, stessi eventi
const detailBindings = computed(() => ({
  'tab': detailTab.value,
  'filesConfigured': !!data.value?.status.filesConfigured,
  'onUpdate:tab': setDetailTab,
  'onFolder': setFolder,
  'onApply': setApplied,
  'onOutcome': checkOutcome,
}))

const selectedId = ref<string | null>(null)
// Con la bozza da salvare (o in salvataggio) il bando resta aperto anche se
// un filtro, la ricerca o i moduli e le province della ricerca non ancora
// salvata lo tolgono dall'elenco: preso da tutti i bandi, valutato qui
const keepsDraft = computed(() => holdsDraft(draft, selectedId.value))
const selected = computed(() => shownGrant(selectedId.value, visible.value, keepsDraft.value, (id) => {
  const g = data.value?.grants.find(x => x.id === id)
  return g && form.value ? { ...g, ...evaluateRadarGrant(g, form.value.profile, now) } : null
}))
// L'elenco mostrato: il bando tenuto per la bozza, se i filtri lo tolgono,
// resta in cima con la sua riga (sotto xl la scheda si apre lì)
const listed = computed(() => {
  const s = selected.value
  return s && !visible.value.some(g => g.id === s.id) ? [s, ...visible.value] : visible.value
})

// Tornando sulla pagina la bozza aperta e intatta si rilegge: chi la riprende
// non scrive su un testo vecchio fino al 409
function refreshDraft() {
  const shownId = detailTab.value === 'draft' ? selected.value?.id ?? null : null
  if (refreshesDraft(draft, shownId)) void draft.load()
}
useEventListener('focus', refreshDraft)
const pageVisibility = useDocumentVisibility()
watch(pageVisibility, (v) => {
  if (v === 'visible') refreshDraft()
})

// Elenco o card su più colonne. La scelta resta sul computer
type Layout = 'list' | 'cards'
const layout = useLocalStorage<Layout>('didap-radar-layout', 'list', { initOnMounted: true })
const cards = computed(() => layout.value === 'cards')

// Dove si apre la scheda del bando, una sola montata: sotto la riga
// (elenco, schermo stretto), a destra (elenco, da xl) o in un pannello
// sopra la pagina (card)
const detailAt = computed(() => (cards.value ? 'drawer' : isXl.value ? 'side' : 'row'))

// Passando alle card non resta aperto il bando scelto in automatico
function setLayout(next: Layout) {
  if (next === 'list') layout.value = next
  else guardDraft(() => {
    selectedId.value = null
    layout.value = next
  })
}

const closeDrawer = () => guardDraft(() => (selectedId.value = null))

// La scheda a destra non resta mai vuota se c'è un bando; mai al posto di
// un bando con la bozza da tenere (anche sparito dai dati)
watchEffect(() => {
  if (detailAt.value === 'side' && !selected.value && visible.value.length && !keepsDraft.value) {
    selectedId.value = visible.value[0]!.id
  }
})

function pick(id: string) {
  // La scheda sotto la riga si chiude con un secondo clic
  const next = detailAt.value === 'row' && selectedId.value === id ? null : id
  if (next !== selectedId.value) guardDraft(() => (selectedId.value = next))
}

const EMPTY: Record<Tab, string> = {
  new: 'Nessun bando nuovo nell\'ultimo scan.',
  eligible: 'Nessun bando candidabile.',
  to_verify: 'Nessun bando da verificare.',
  excluded: 'Nessun bando escluso.',
  liked: 'Nessun bando segnato: usa il cuore su quelli che vi interessano.',
  applied: 'Nessuna candidatura: apri un bando interessante e usa "Ci siamo candidati".',
  outcome: 'Nessun esito: apri un bando candidato e usa "Controlla esito".',
  expired: 'Nessun bando scaduto: qui restano quelli chiusi a cui non vi siete candidati.',
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
    <!-- Con le card la colonna della scheda non c'è: l'elenco prende il posto -->
    <div
      class="
        grid flex-1 grid-cols-[minmax(0,1fr)] content-start
        lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)] lg:content-stretch
      "
      :class="cards ? '2xl:grid-cols-[19rem_minmax(0,1fr)]' : `
        xl:grid-cols-[18rem_minmax(0,1fr)_minmax(0,30rem)]
        2xl:grid-cols-[19rem_minmax(0,1fr)_minmax(0,38rem)]
      `"
    >
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
                    <RadarProvincePicker
                      v-if="g.value === 'comuni' && form.search.groups.includes('comuni')"
                      v-model="form.search.provinces"
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
                  {{ scanning ? 'Scan in corso…' : 'Avvia scan' }}
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
                  <p>Cancello tutti i bandi letti, cuori compresi, tranne quelli con la cartella. Impostazioni e registro restano.</p>
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
                  <AdminIcon
                    name="down"
                    class="size-3.5 opacity-50 transition-transform"
                    :class="extraOpen ? 'rotate-180' : ''"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent class="
                  divide-y divide-ink/10 border-t border-ink/10
                  data-[state=closed]:hidden
                ">
              <fieldset class="flex flex-col gap-1 p-5">
                <legend class="contents">
                  <span class="mb-2 block text-sm font-bold">Azienda</span>
                </legend>
                <p class="mb-2 text-xs opacity-60">
                  Cosa fa l'azienda sta in server/radar/didap.md: il radar lo usa per leggere e giudicare i bandi.
                </p>
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
                  Mail di fine scan
                  <AdminIcon
                    name="down"
                    class="size-3.5 opacity-50 transition-transform"
                    :class="mailOpen ? 'rotate-180' : ''"
                  />
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
                Scan
              </ToggleGroupItem>
            </ToggleGroupRoot>
            <p
              v-if="data"
              class="text-sm opacity-60"
            >
              <template v-if="scanning">
                Scan in corso…
              </template>
              <template v-else>
                Ultimo scan {{ data.status.lastScan ? formatDateTime(data.status.lastScan.startedAt) : 'mai' }}
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
                    Fonti con un problema all'ultimo scan (i siti che non rispondono non sono qui: si riprovano da soli).
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
            <!-- Ricerca e vista insieme, a destra: non vanno a capo da sole -->
            <div class="
              flex w-full items-center gap-3
              sm:ml-auto sm:w-auto
            ">
              <input
                v-model="query"
                type="search"
                placeholder="Cerca"
                aria-label="Cerca nei bandi"
                class="
                  min-w-0 flex-1 panel-input rounded-full px-4
                  sm:w-64 sm:flex-none
                "
              >
              <ToggleGroupRoot
                :model-value="layout"
                type="single"
                class="toggle-segmented shrink-0"
                aria-label="Vista dei bandi"
                @update:model-value="v => v && setLayout(v as Layout)"
              >
                <ToggleGroupItem
                  value="list"
                  aria-label="Elenco"
                  title="Elenco"
                >
                  <AdminIcon name="list" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="cards"
                  aria-label="Card"
                  title="Card"
                >
                  <AdminIcon name="grid" />
                </ToggleGroupItem>
              </ToggleGroupRoot>
            </div>
          </div>
        </header>

        <RadarRunLog
          v-if="view === 'runs'"
          ref="runLog"
          class="
            min-h-0 flex-1 scrollbar-none
            lg:overflow-y-auto
          "
          :grants="grants"
          @open="openFromLog"
          @finished="loadGrants"
        />
        <div
          v-else
          class="
            @container min-h-0 flex-1 scrollbar-none
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
            v-else-if="!listed.length"
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
          <!-- Card: da una a quattro per riga, secondo lo spazio della colonna -->
          <ul
            v-else-if="cards"
            class="
              grid grid-cols-1 gap-4 p-5
              lg:p-8
              @xl:grid-cols-2
              @4xl:grid-cols-3
              @6xl:grid-cols-4
            "
          >
            <li
              v-for="g in listed"
              :key="g.id"
              class="relative"
            >
              <button
                type="button"
                class="
                  flex size-full flex-col gap-3 rounded-2xl border bg-white p-4
                  text-left transition
                  hover:border-ink/40
                "
                :class="selectedId === g.id ? 'border-ink' : 'border-ink/10'"
                aria-haspopup="dialog"
                @click="pick(g.id)"
              >
                <span class="flex items-start gap-3 pr-7">
                  <RadarOutcomeIcon
                    :outcome="ELIGIBILITY_OUTCOME[g.eligibility]"
                    class="mt-0.5 shrink-0"
                  />
                  <span class="flex min-w-0 flex-col gap-1.5">
                    <RadarGrantTags
                      :grant="g"
                      :is-new="isNew(g)"
                    />
                    <span class="line-clamp-3 font-medium wrap-break-word">{{ g.title }}</span>
                    <span class="truncate text-sm opacity-60">{{ g.issuer }}</span>
                  </span>
                </span>
                <span
                  v-if="g.summary"
                  class="line-clamp-4 text-sm text-ink/75"
                >{{ g.summary }}</span>
                <RadarGrantDue
                  :grant="g"
                  class="
                    mt-auto flex-wrap items-baseline gap-x-3 border-t
                    border-ink/10 pt-3
                  "
                />
              </button>
              <RadarLikeButton
                :liked="g.liked"
                class="absolute top-4 right-4"
                @toggle="toggleLike(g.id)"
              />
            </li>
          </ul>
          <ul v-else>
            <li
              v-for="g in listed"
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
                :aria-expanded="detailAt === 'row' ? selectedId === g.id : undefined"
                :aria-current="detailAt === 'side' && selectedId === g.id ? 'true' : undefined"
                @click="pick(g.id)"
              >
                <RadarOutcomeIcon
                  :outcome="ELIGIBILITY_OUTCOME[g.eligibility]"
                  class="mt-0.5"
                />
                <span class="flex min-w-0 flex-col gap-1">
                  <RadarGrantTags
                    :grant="g"
                    :is-new="isNew(g)"
                  />
                  <span class="line-clamp-2 font-medium">{{ g.title }}</span>
                  <span class="truncate text-sm opacity-60">{{ g.issuer }}</span>
                  <span
                    v-if="g.summary"
                    class="line-clamp-2 text-sm text-ink/75"
                  >{{ g.summary }}</span>
                </span>
                <RadarGrantDue
                  :grant="g"
                  class="flex-col items-end text-right"
                />
              </button>
              <RadarLikeButton
                :liked="g.liked"
                class="
                  flex shrink-0 items-start px-4 pt-4
                  lg:pr-7
                "
                @toggle="toggleLike(g.id)"
              />
              </div>
              <div
                v-if="detailAt === 'row' && selectedId === g.id"
                class="border-t border-ink/10 bg-white"
              >
                <RadarGrantDetail
                  :grant="g"
                  v-bind="detailBindings"
                />
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- Scheda del bando, da xl in su (sotto si apre nella riga): una sola
           scheda montata, non due elenchi della cartella in parallelo. Con
           le card la colonna non c'è: la scheda si apre nel pannello -->
      <aside
        v-if="!cards"
        class="
          hidden min-h-0 scrollbar-none overflow-y-auto border-l border-ink/10
          bg-white
          xl:block
        "
        aria-label="Scheda del bando"
      >
        <RadarGrantDetail
          v-if="detailAt === 'side' && selected"
          :grant="selected"
          v-bind="detailBindings"
        />
      </aside>
    </div>

    <!-- Con le card la scheda del bando si apre in un pannello sopra la pagina;
         chiudendolo con la bozza da salvare si chiede prima -->
    <DialogRoot
      :open="detailAt === 'drawer' && !!selected"
      @update:open="v => v || closeDrawer()"
    >
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-40 bg-ink/30" />
        <DialogContent
          class="
            fixed inset-y-0 right-0 z-40 w-full max-w-2xl overflow-y-auto
            bg-white shadow-2xl
          "
          :aria-describedby="undefined"
        >
          <div class="sticky top-0 z-10 flex justify-end bg-white/90 p-3">
            <DialogClose
              class="
                rounded-full p-2
                hover:bg-ink/5
              "
              aria-label="Chiudi la scheda del bando"
            >
              <AdminIcon name="close" />
            </DialogClose>
          </div>
          <template v-if="selected">
            <DialogTitle class="sr-only">
              {{ selected.title }}
            </DialogTitle>
            <RadarGrantDetail
              :grant="selected"
              v-bind="detailBindings"
            />
          </template>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <AdminConfirm
      v-model:open="leaveOpen"
      title="Lasciare la bozza senza salvare?"
      description="Le modifiche alla bozza che non hai salvato andranno perse."
      confirm-label="Esci senza salvare"
      @confirm="leaveDraft"
    />
  </AdminShell>
</template>
