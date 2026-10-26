import { apiAccess, unsafeApiPath } from '#shared/admin-access'

// Permessi delle API sotto /api/admin: le regole stanno in apiAccess.
// Quello che non è aperto richiede una persona (chiuso per difetto).
// Si guarda il percorso grezzo, lo stesso che vede il router: getRequestURL
// risolverebbe "%2e%2e" e i due potrebbero non coincidere.
export default defineEventHandler(async (event) => {
  const path = (event.path.split('?')[0] ?? '').toLowerCase()
  if (!path.startsWith('/api/admin/')) return
  if (unsafeApiPath(path)) {
    throw createError({ statusCode: 400, statusMessage: 'Percorso non valido' })
  }
  const access = apiAccess(path, event.method)
  if (access.kind === 'open') return
  const user = await requireUser(event)
  if (access.kind === 'session') return
  if (access.kind === 'pages' && access.anyOf.some(p => user.pages.includes(p))) return
  throw createError({ statusCode: 403, statusMessage: 'Non hai accesso a questa sezione' })
})
