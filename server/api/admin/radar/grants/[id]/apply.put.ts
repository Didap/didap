import { z } from 'zod'

// Segna o toglie un bando dai candidati
const applySchema = z.object({ applied: z.boolean() }).strict()

export default defineEventHandler(async (event) => {
  const { applied } = await readSchemaBody(event, applySchema)
  await setGrantApplied(await useDb(), uuidParam(event), applied)
  return { applied }
})
