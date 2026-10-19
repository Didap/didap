// Messaggio breve in basso nelle pagine admin: notify() lo mostra,
// AdminToast (nel layout) lo chiude dopo qualche secondo. Uno nuovo
// sostituisce quello in corso.

type Toast = { id: number; kind: 'ok' | 'error'; text: string; open: boolean }

let nextId = 0

export function useAdminToast() {
  const toast = useState<Toast | null>('admin-toast', () => null)
  function notify(kind: Toast['kind'], text: string) {
    toast.value = { id: ++nextId, kind, text, open: true }
  }
  return { toast, notify }
}
