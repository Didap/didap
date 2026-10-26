import { z } from 'zod'
import { passwordSchema } from '#shared/users'

// Cambio della propria password: le altre sessioni si chiudono
const changeSchema = z.object({
  current: z.string().max(200),
  next: passwordSchema,
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const sid = await currentSessionId(event)
  if (!sid) throw createError({ statusCode: 401, statusMessage: 'Accesso non autorizzato' })
  const { current, next } = await readSchemaBody(event, changeSchema)
  await changeOwnPassword(await useDb(), user, sid, current, next)
  return { ok: true }
})
