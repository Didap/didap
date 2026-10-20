import { z } from 'zod'

// Segna o toglie un bando dagli interessanti
const likeSchema = z.object({ liked: z.boolean() }).strict()

export default defineEventHandler(async (event) => {
  const { liked } = await readSchemaBody(event, likeSchema)
  await setGrantLiked(await useDb(), uuidParam(event), liked)
  return { liked }
})
