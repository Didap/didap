import { radarSettingsSchema } from '#shared/radar'

export default defineEventHandler(async (event) => {
  const data = await readSchemaBody(event, radarSettingsSchema)
  const sql = await useDb()
  const before = await readRadarSettings(sql)
  await writeRadarSettings(sql, data)
  // Profilo cambiato, o una ricerca che comprende bandi mai giudicati: si
  // giudicano subito, se il radar è libero
  const searchChanged = JSON.stringify(before.search) !== JSON.stringify(data.search)
  if (searchChanged || profileKey(before.profile) !== profileKey(data.profile)) await radarJudgeNow(sql, radarDeps())
  return data
})
