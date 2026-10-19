// Messaggio breve in basso nelle pagine admin (lo mostra AdminToast).
// Il timer sta qui e non nel componente: l'avviso si chiude anche se la
// pagina che lo mostrava è cambiata. Si ferma finché ci si passa sopra
// col mouse (pause/resume da AdminToast). Uno nuovo sostituisce quello
// in corso.

type Toast = { id: number; kind: 'ok' | 'error'; text: string; open: boolean }

const DURATION: Record<Toast['kind'], number> = { ok: 2500, error: 6000 }
let nextId = 0
let timer: ReturnType<typeof setTimeout> | undefined
let deadline = 0
let remaining = 0

function schedule(ms: number, close: () => void) {
  clearTimeout(timer)
  deadline = Date.now() + ms
  timer = setTimeout(close, ms)
}

export function useAdminToast() {
  const toast = useState<Toast | null>('admin-toast', () => null)
  function dismiss() {
    clearTimeout(timer)
    timer = undefined
    if (toast.value?.open) toast.value = { ...toast.value, open: false }
  }
  function notify(kind: Toast['kind'], text: string) {
    toast.value = { id: ++nextId, kind, text, open: true }
    schedule(DURATION[kind], dismiss)
  }
  function pause() {
    if (!timer) return
    clearTimeout(timer)
    timer = undefined
    remaining = Math.max(0, deadline - Date.now())
  }
  function resume() {
    if (toast.value?.open && !timer) schedule(remaining, dismiss)
  }
  return { toast, notify, pause, resume }
}
