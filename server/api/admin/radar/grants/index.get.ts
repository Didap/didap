// Tutti i bandi letti, aperti e chiusi (gli scaduti restano in memoria), più
// lo stato del radar; il pannello li valuta coi suoi parametri
export default defineEventHandler(async () => {
  const sql = await useDb()
  const [grants, status] = await Promise.all([listGrants(sql, new Date(), { closed: 'all' }), radarStatus(sql, radarDeps())])
  return { grants, status }
})
