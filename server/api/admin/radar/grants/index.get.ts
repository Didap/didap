// Bandi aperti e quelli con cartella, più lo stato del radar; il pannello
// li valuta coi suoi parametri
export default defineEventHandler(async () => {
  const sql = await useDb()
  const [grants, status] = await Promise.all([listGrants(sql, new Date(), { withFolders: true }), radarStatus(sql, radarDeps())])
  return { grants, status }
})
