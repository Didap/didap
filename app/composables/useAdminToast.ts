// Messaggio breve in basso nelle pagine admin (lo mostra AdminToast).
// Il timer sta qui e non nel componente: l'avviso si chiude anche se la
// pagina che lo mostrava è cambiata. Uno nuovo sostituisce quello in corso.

type Toast = { id: number; kind: 'ok' | 'error'; text: string; open: boolean }

const DURATION: Record<Toast['kind'], number> = { ok: 2500, error: 6000 }
let nextId = 0
let timer: ReturnType<typeof setTimeout> | undefined

export function useAdminToast() {
  const toast = useState<Toast | null>('admin-toast', () => null)
  function dismiss() {
    clearTimeout(timer)
    if (toast.value?.open) toast.value = { ...toast.value, open: false }
  }
  function notify(kind: Toast['kind'], text: string) {
    toast.value = { id: ++nextId, kind, text, open: true }
    clearTimeout(timer)
    timer = setTimeout(dismiss, DURATION[kind])
  }
  return { toast, notify, dismiss }
}
