import { draftInputSchema } from '#shared/quote'

export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const input = await readSchemaBody(event, draftInputSchema)
  return saveDraft(await useDb(), id, input)
})
