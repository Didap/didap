import { firstAllowedPath, pageForPath } from '#shared/admin-access'
import type { AdminUser } from '#shared/users'

// Sessione admin condivisa da tutte le pagine di /admin. Le pagine la
// caricano con `await useAdminSession()`; i componenti leggono lo stesso
// dato con useAdminSessionState().

export type AdminSession = {
  configured: boolean
  database: boolean
  authenticated: boolean
  user: AdminUser | null
}
const KEY = 'admin-session'

export const useAdminSession = () => useFetch<AdminSession>('/api/admin/session', { key: KEY })

export const useAdminSessionState = () => useNuxtData<AdminSession>(KEY).data

export const refreshAdminSession = () => refreshNuxtData(KEY)

export async function adminLogin(email: string, password: string) {
  await $fetch('/api/admin/login', { method: 'POST', body: { email, password } })
  await refreshAdminSession()
}

export async function adminLogout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await refreshAdminSession()
}

// Stato della pagina aperta per la persona della sessione:
// - login: nessuna sessione
// - allowed: la pagina è sua (account e password valgono per tutti)
// - redirect: non è sua, si va alla prima pagina che ha
// - none: non ha nessuna pagina
export type AdminPageState = 'login' | 'allowed' | 'redirect' | 'none'

function adminPageState() {
  const session = useAdminSessionState()
  const route = useRoute()
  return computed<AdminPageState>(() => {
    const user = session.value?.authenticated ? session.value.user : null
    if (!user) return 'login'
    const page = pageForPath(route.path)
    if (page === null || page === 'session' || page === 'open' || user.pages.includes(page)) return 'allowed'
    return firstAllowedPath(user.pages) ? 'redirect' : 'none'
  })
}

// Per i gusci delle pagine: oltre allo stato, porta alla prima pagina
// accessibile chi apre una pagina che non ha
export function useAdminPageAccess() {
  const state = adminPageState()
  const session = useAdminSessionState()
  watch(state, (s) => {
    const target = s === 'redirect' ? firstAllowedPath(session.value?.user?.pages ?? []) : null
    if (target) navigateTo(target, { replace: true })
  }, { immediate: true })
  return { state }
}

// Chiama load appena la pagina risulta accessibile (anche dopo un nuovo
// accesso). Parte solo nel browser, dopo il mount: chi non ha la pagina
// non chiama le sue API.
export function onAdminReady(load: () => unknown) {
  const state = adminPageState()
  onMounted(() => {
    watch(() => state.value === 'allowed', (ok) => ok && load(), { immediate: true })
  })
}

// Vero se la pagina aperta è accessibile, per chi carica i dati da sé
export const useAdminPageAllowed = () => {
  const state = adminPageState()
  return computed(() => state.value === 'allowed')
}
