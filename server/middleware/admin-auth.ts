// Tutte le API sotto /api/admin richiedono la sessione admin,
// tranne login e verifica della sessione.
const OPEN = new Set(['/api/admin/login', '/api/admin/session'])

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/admin/') || OPEN.has(path)) return
  await requireAdmin(event)
})
