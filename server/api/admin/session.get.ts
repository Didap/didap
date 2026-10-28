import type { AdminUser } from '#shared/users'

// Stato dell'admin per le pagine /admin. Non fallisce mai: se il database
// non risponde lo segnala invece di dare errore.
export default defineEventHandler(async (event) => {
  let user: AdminUser | null = null
  let databaseError = false
  try {
    if (hasDatabase()) await useDb()
    user = await currentUser(event)
  }
  catch (err) {
    console.error('[admin/session]', err)
    databaseError = true
  }
  return {
    configured: sessionSecret() !== '',
    database: hasDatabase() && !databaseError,
    authenticated: user !== null,
    user,
  }
})
