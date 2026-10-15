// Messaggio breve in basso nelle pagine admin (lo mostra AdminShell)

type Toast = { kind: 'ok' | 'error'; text: string }
let timer: ReturnType<typeof setTimeout> | undefined

export function useAdminToast() {
  const toast = useState<Toast | null>('admin-toast', () => null)
  function notify(kind: Toast['kind'], text: string) {
    toast.value = { kind, text }
    clearTimeout(timer)
    timer = setTimeout(() => (toast.value = null), kind === 'ok' ? 2500 : 6000)
  }
  return { toast, notify }
}
