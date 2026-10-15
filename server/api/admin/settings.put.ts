import { settingsSchema } from '#shared/settings'

export default defineEventHandler(async (event) => {
  const data = await readSchemaBody(event, settingsSchema)
  await writeSettings(await useDb(), data)
  return data
})
