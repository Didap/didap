import { clientInputSchema } from '#shared/clients'

export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const input = await readSchemaBody(event, clientInputSchema)
  return updateClient(await useDb(), id, input)
})
