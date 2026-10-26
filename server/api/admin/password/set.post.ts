import { z } from 'zod'
import { passwordSchema } from '#shared/users'

// Nuova password dal link d'invito o di reset, poi dentro col nuovo accesso
const setSchema = z.object({
  token: z.string().min(1).max(200),
  password: passwordSchema,
})

export default defineEventHandler(async (event) => {
  // Prima di consumare il token: senza chiave la sessione non partirebbe
  requireAdminReady()
  rateLimit('password-set', event, { max: 10, windowMs: 10 * 60 * 1000 })
  const { token, password } = await readSchemaBody(event, setSchema)
  const user = await redeemToken(await useDb(), token, password)
  await startAdminSession(event, user.id)
  return { ok: true }
})
