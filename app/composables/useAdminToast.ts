// Messaggio breve in basso nelle pagine admin (lo mostra AdminToast nel
// layout). Il timer sta qui: si ferma finché il mouse è sopra l'avviso
// (pause/resume da AdminToast), anche se intanto ne arriva uno nuovo,
// che sostituisce quello in corso.

type Toast = { id: number; kind: 'ok' | 'error'; text: string; open: boolean }

const DURATION: Record<Toast['kind'], number> = { ok: 2500, error: 6000 }
let nextId = 0
let timer: ReturnType<typeof setTimeout> | undefined
let deadline = 0
let remaining = 0
let paused = false

export function useAdminToast() {
  const toast = useState<Toast | null>('admin-toast', () => null)

  function stop() {
    clearTimeout(timer)
    timer = undefined
  }
  function start() {
    stop()
    deadline = Date.now() + remaining
    timer = setTimeout(() => {
      timer = undefined
      if (toast.value?.open) toast.value = { ...toast.value, open: false }
    }, remaining)
  }

  function notify(kind: Toast['kind'], text: string) {
    toast.value = { id: ++nextId, kind, text, open: true }
    remaining = DURATION[kind]
    if (paused) stop()
    else start()
  }
  function pause() {
    paused = true
    if (!timer) return
    stop()
    remaining = Math.max(0, deadline - Date.now())
  }
  function resume() {
    paused = false
    if (toast.value?.open && !timer) start()
  }
  return { toast, notify, pause, resume }
}
