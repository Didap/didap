import { statusInputSchema } from '#shared/quote'

export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const { status } = await readSchemaBody(event, statusInputSchema)
  await setQuoteStatus(await useDb(), id, status)
  return { ok: true }
})
