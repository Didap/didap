import type { InjectionKey } from 'vue'
import { adminErrorText } from '~/utils/adminErrors'
import { draftConflictText, normalizeDraft, type DraftConflict, type GrantDraft } from '#shared/grant-draft'

// Bozza della candidatura aperta nella scheda "Bozza": la tiene la pagina
// Bandi, non la scheda, così il testo scritto non si perde quando la scheda
// si rimonta (cambio di larghezza, bando nascosto da un filtro) e la pagina
// sa se ci sono modifiche da confermare prima di cambiare bando, scheda o
// pagina. Una bozza aperta alla volta.
//
// Ogni salvataggio parte dalla versione letta (null: prima bozza): se nel
// frattempo hanno salvato Claude o un'altra persona il server dice 409 e il
// testo scritto resta finché non si ricarica.

export type GrantDraftEditor = ReturnType<typeof useGrantDraft>

export const GRANT_DRAFT: InjectionKey<GrantDraftEditor> = Symbol('grant-draft')

// onFolder: il primo salvataggio ha creato la cartella del bando (e il cuore)
export function useGrantDraft(onFolder: (grantId: string) => void) {
  const { notify } = useAdminToast()

  const grantId = ref<string | null>(null)
  // L'ultima bozza letta o salvata: la versione da cui parte il prossimo salvataggio
  const saved = ref<GrantDraft | null>(null)
  const hasFolder = ref(false)
  const text = ref('')
  // Letta almeno una volta per questo bando (prima l'editor è spento)
  const loaded = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  // Il riquadro del salvataggio rifiutato
  const conflict = ref<string | null>(null)

  const baseline = computed(() => normalizeDraft(saved.value?.content ?? ''))
  const dirty = computed(() => loaded.value && text.value !== baseline.value)

  // Solo l'ultima lettura conta. Una lettura che torna mentre si sta
  // scrivendo non tocca né il testo né la versione di partenza (force:
  // "Ricarica", che sostituisce tutto): salvando, il 409 dirà se è cambiata.
  let loadSeq = 0
  async function load(force = false) {
    const id = grantId.value
    if (!id) return
    const seq = ++loadSeq
    loading.value = true
    try {
      const res = await $fetch<{ draft: GrantDraft | null, hasFolder: boolean }>(`/api/admin/radar/grants/${id}/draft`)
      if (seq !== loadSeq) return
      hasFolder.value = res.hasFolder
      if (force || !dirty.value) {
        saved.value = res.draft
        text.value = normalizeDraft(res.draft?.content ?? '')
        conflict.value = null
      }
      loaded.value = true
    }
    catch (err) {
      if (seq === loadSeq) notify('error', adminErrorText(err))
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
    saving.value = true
    try {
      const { draft } = await $fetch<{ draft: GrantDraft }>(`/api/admin/radar/grants/${id}/draft`, {
        method: 'PUT',
        body: { content: text.value, baseVersion: saved.value?.version ?? null },
      })
      // Si riparte dalla versione nuova: quello scritto durante il
      // salvataggio resta da salvare
      if (grantId.value === id) {
        saved.value = draft
        hasFolder.value = true
        conflict.value = null
      }
      notify('ok', 'Bozza salvata')
      if (!hadFolder) onFolder(id)
    }
    catch (err) {
      // h3 mette il `data` dell'errore dentro il corpo della risposta
      const e = err as { statusCode?: number, data?: { data?: DraftConflict } }
      if (e.statusCode === 409 && grantId.value === id) conflict.value = draftConflictText(e.data?.data, new Date())
      else notify('error', adminErrorText(err))
    }
    finally {
      saving.value = false
    }
  }

  // Butta le modifiche: si torna al testo dell'ultima bozza letta
  function discard() {
    text.value = baseline.value
    conflict.value = null
  }

  return reactive({ grantId, saved, hasFolder, text, loaded, loading, saving, conflict, dirty, open, load, save, discard })
}

export function injectGrantDraft(): GrantDraftEditor {
  const editor = inject(GRANT_DRAFT)
  if (!editor) throw new Error('useGrantDraft non fornito dalla pagina')
  return editor
}
