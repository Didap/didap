import { radarSettingsSchema } from '#shared/radar'

export default defineEventHandler(async (event) => {
  const data = await readSchemaBody(event, radarSettingsSchema)
  const sql = await useDb()
  const before = await readRadarSettings(sql)
  await writeRadarSettings(sql, data)
  // Profilo cambiato: i bandi si rigiudicano subito, se il radar è libero
  if (profileKey(before.profile) !== profileKey(data.profile)) await radarJudgeNow(sql, radarDeps())
  return data
})
