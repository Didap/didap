// Bandi aperti valutati coi parametri attuali, più lo stato del radar
export default defineEventHandler(async () => {
  const sql = await useDb()
  const [grants, status] = await Promise.all([listEvaluatedGrants(sql), radarStatus(sql, radarDeps())])
  return { grants, status }
})
