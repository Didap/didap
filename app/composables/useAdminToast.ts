// Messaggio breve in basso nelle pagine admin (lo mostra AdminToast).
// Ogni avviso ha un id: uno nuovo sostituisce quello in corso.

type Toast = { id: number; kind: 'ok' | 'error'; text: string }
let nextId = 0

export function useAdminToast() {
  const toast = useState<Toast | null>('admin-toast', () => null)
  function notify(kind: Toast['kind'], text: string) {
    toast.value = { id: ++nextId, kind, text }
  }
  return { toast, notify }
}
