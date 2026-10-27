import { computed, reactive, ref } from 'vue'
import { draftConflictText, normalizeDraft, type DraftConflict, type GrantDraft } from '#shared/grant-draft'

// Il cuore dell'editor della bozza, senza Nuxt: lettura, scrittura e avvisi
// arrivano da fuori (useGrantDraft passa $fetch e il toast), così i test lo
// provano con finte API.
//
// Ogni salvataggio parte dalla versione letta (null: prima bozza): se nel
// frattempo hanno salvato Claude o un'altra persona il server dice 409 e il
// testo scritto resta finché non si ricarica.

export type DraftState = { draft: GrantDraft | null, hasFolder: boolean }

export type DraftEditorDeps = {
  read: (grantId: string) => Promise<DraftState>
  write: (grantId: string, body: { content: string, baseVersion: number | null }) => Promise<{ draft: GrantDraft }>
  notify: (kind: 'ok' | 'error', text: string) => void
  errorText: (err: unknown) => string
  // Il primo salvataggio ha creato la cartella del bando (e il cuore)
  onFolder: (grantId: string) => void
}

export type GrantDraftEditor = ReturnType<typeof createGrantDraftEditor>

export function createGrantDraftEditor(deps: DraftEditorDeps) {
  const grantId = ref<string | null>(null)
  // L'ultima bozza letta o salvata: la versione da cui parte il prossimo salvataggio
  const saved = ref<GrantDraft | null>(null)
  const hasFolder = ref(false)
  const text = ref('')
  // Letta almeno una volta per questo bando (prima l'editor è spento)
  const loaded = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  // Il testo in viaggio verso il server mentre si salva
  const sending = ref('')
  // Il riquadro del salvataggio rifiutato
  const conflict = ref<string | null>(null)

  const baseline = computed(() => normalizeDraft(saved.value?.content ?? ''))
  // Da salvare: diverso dall'ultima bozza letta o salvata (anche durante un
  // salvataggio: chi cambia bando o scheda aspetta che torni, vedi la pagina)
  const dirty = computed(() => loaded.value && text.value !== baseline.value)

  // Solo l'ultima lettura conta. Una lettura che torna mentre si sta
  // scrivendo o salvando non tocca né il testo né la versione di partenza
  // (force: "Ricarica", che sostituisce tutto): salvando, il 409 dirà se è
  // cambiata; il salvataggio in corso porta lui la versione nuova.
  let loadSeq = 0
  async function load(force = false) {
    const id = grantId.value
    if (!id) return
    const seq = ++loadSeq
    loading.value = true
    try {
      const res = await deps.read(id)
      if (seq !== loadSeq || grantId.value !== id) return
      hasFolder.value = hasFolder.value || res.hasFolder
      if (force || (!dirty.value && !saving.value)) {
        saved.value = res.draft
        text.value = normalizeDraft(res.draft?.content ?? '')
        conflict.value = null
      }
      loaded.value = true
    }
    catch (err) {
      if (seq === loadSeq) deps.notify('error', deps.errorText(err))
    }
    finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  // La scheda di un bando si apre: un altro bando riparte da zero; lo stesso
  // si rilegge (Claude può aver salvato), tenendo le modifiche in corso
  function open(id: string) {
    if (grantId.value !== id) {
      grantId.value = id
      saved.value = null
      hasFolder.value = false
      text.value = ''
      loaded.value = false
      conflict.value = null
    }
    return load()
  }

  async function save() {
    const id = grantId.value
    if (!id || !dirty.value || saving.value) return
    const hadFolder = hasFolder.value
    sending.value = text.value
    saving.value = true
    try {
      const { draft } = await deps.write(id, { content: sending.value, baseVersion: saved.value?.version ?? null })
      // Si riparte dalla versione nuova: quello scritto durante il
      // salvataggio resta da salvare
      if (grantId.value === id) {
        saved.value = draft
        hasFolder.value = true
        conflict.value = null
      }
      deps.notify('ok', 'Bozza salvata')
      if (!hadFolder) deps.onFolder(id)
    }
    catch (err) {
      // h3 mette il `data` dell'errore dentro il corpo della risposta
      const e = err as { statusCode?: number, data?: { data?: DraftConflict } }
      if (e.statusCode === 409 && grantId.value === id) conflict.value = draftConflictText(e.data?.data, new Date())
      else deps.notify('error', deps.errorText(err))
    }
    finally {
      saving.value = false
    }
  }

  // Butta le modifiche: si torna all'ultima bozza letta, o durante un
  // salvataggio al testo che sta partendo (finito il salvataggio l'editor
  // mostra esattamente quello salvato)
  function discard() {
    text.value = saving.value ? sending.value : baseline.value
    conflict.value = null
  }

  return reactive({ grantId, saved, hasFolder, text, loaded, loading, saving, conflict, dirty, open, load, save, discard })
}

// La bozza di questo bando ha qualcosa da non perdere: modifiche o un
// salvataggio in corso
export const holdsDraft = (editor: Pick<GrantDraftEditor, 'dirty' | 'saving' | 'grantId'>, grantId: string | null) =>
  !!grantId && editor.grantId === grantId && (editor.dirty || editor.saving)

// Il bando aperto nella scheda a destra: quello scelto se è nell'elenco; se
// filtri, ricerca o moduli e province della ricerca lo tolgono ma la sua
// bozza va tenuta (hold), resta aperto, preso fuori dall'elenco (find)
export function shownGrant<T extends { id: string }>(
  selectedId: string | null,
  visible: T[],
  hold: boolean,
  find: (id: string) => T | null,
): T | null {
  if (!selectedId) return null
  return visible.find(g => g.id === selectedId) ?? (hold ? find(selectedId) : null)
}
