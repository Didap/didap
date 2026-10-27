import type { InjectionKey } from 'vue'
import { adminErrorText } from '~/utils/adminErrors'
import { createGrantDraftEditor, type DraftState, type GrantDraftEditor } from '~/utils/grantDraftEditor'
import type { GrantDraft } from '#shared/grant-draft'

// Bozza della candidatura aperta nella scheda "Bozza": la tiene la pagina
// Bandi, non la scheda, così il testo scritto non si perde quando la scheda
// si rimonta (cambio di larghezza, bando nascosto da un filtro) e la pagina
// sa se ci sono modifiche da confermare prima di cambiare bando, scheda o
// pagina. Una bozza aperta alla volta. La logica sta in createGrantDraftEditor;
// qui le API del pannello e il toast.

export const GRANT_DRAFT: InjectionKey<GrantDraftEditor> = Symbol('grant-draft')

// onFolder: il primo salvataggio ha creato la cartella del bando (e il cuore)
export function useGrantDraft(onFolder: (grantId: string) => void): GrantDraftEditor {
  const { notify } = useAdminToast()
  const url = (id: string) => `/api/admin/radar/grants/${id}/draft`
  return createGrantDraftEditor({
    read: id => $fetch<DraftState>(url(id)),
    write: (id, body) => $fetch<{ draft: GrantDraft }>(url(id), { method: 'PUT', body }),
    notify,
    errorText: adminErrorText,
    onFolder,
  })
}

export function injectGrantDraft(): GrantDraftEditor {
  const editor = inject(GRANT_DRAFT)
  if (!editor) throw new Error('useGrantDraft non fornito dalla pagina')
  return editor
}
