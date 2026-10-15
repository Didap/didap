// Sessione admin condivisa da tutte le pagine di /admin. Le pagine la
// caricano con `await useAdminSession()`; i componenti leggono lo stesso
// dato con useAdminSessionState().

type AdminSession = { configured: boolean; database: boolean; authenticated: boolean }
const KEY = 'admin-session'

export const useAdminSession = () => useFetch<AdminSession>('/api/admin/session', { key: KEY })

export const useAdminSessionState = () => useNuxtData<AdminSession>(KEY).data

export const refreshAdminSession = () => refreshNuxtData(KEY)

export async function adminLogin(password: string) {
  await $fetch('/api/admin/login', { method: 'POST', body: { password } })
  await refreshAdminSession()
}

export async function adminLogout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await refreshAdminSession()
}

// Chiama load appena la sessione risulta autenticata (anche dopo un nuovo
// accesso). Parte solo nel browser, dopo il mount.
export function onAdminReady(load: () => unknown) {
  const session = useAdminSessionState()
  onMounted(() => {
    watch(() => session.value?.authenticated, (ok) => ok && load(), { immediate: true })
  })
}
