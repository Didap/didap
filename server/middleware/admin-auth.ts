import { apiAccess } from '#shared/admin-access'

// Permessi delle API sotto /api/admin: le regole stanno in apiAccess.
// Quello che non è aperto richiede una persona (chiuso per difetto).
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/admin/')) return
  const access = apiAccess(path, event.method)
  if (access.kind === 'open') return
  const user = await requireUser(event)
  if (access.kind === 'session') return
  if (access.kind === 'pages' && access.anyOf.some(p => user.pages.includes(p))) return
  throw createError({ statusCode: 403, statusMessage: 'Non hai accesso a questa sezione' })
})
