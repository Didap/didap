// Stato dell'admin per la pagina /admin. Non fallisce mai: se il database
// non risponde lo segnala invece di dare errore.
export default defineEventHandler(async (event) => {
  let authenticated = false
  let databaseError = false
  try {
    if (hasDatabase()) await useDb()
    authenticated = await isAdmin(event)
  }
  catch (err) {
    console.error('[admin/session]', err)
    databaseError = true
  }
  return {
    configured: adminPassword() !== '',
    database: hasDatabase() && !databaseError,
    authenticated,
  }
})
