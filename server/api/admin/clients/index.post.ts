import { clientInputSchema } from '#shared/clients'

export default defineEventHandler(async (event) => {
  const input = await readSchemaBody(event, clientInputSchema)
  return createClient(await useDb(), input)
})
