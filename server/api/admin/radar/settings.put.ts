import { radarSettingsSchema } from '#shared/radar'

export default defineEventHandler(async (event) => {
  const data = await readSchemaBody(event, radarSettingsSchema)
  await writeRadarSettings(await useDb(), data)
  return data
})
