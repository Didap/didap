import { z } from 'zod'
import { emailSchema } from '#shared/users'

// Login per persona con limite di tentativi per IP. Un solo errore per
// email sconosciuta, disattivata o password sbagliata.
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().max(200),
})

export default defineEventHandler(async (event) => {
  if (!sessionSecret()) {
    throw createError({ statusCode: 503, statusMessage: 'Admin non configurato' })
  }
  if (!hasDatabase()) {
    throw createError({ statusCode: 503, statusMessage: 'Database non configurato' })
  }
  rateLimit('login', event, { max: 8, windowMs: 10 * 60 * 1000 })
  const { email, password } = await readSchemaBody(event, loginSchema)

  let user
  try {
    user = await checkLogin(await useDb(), email, password)
  }
  catch (err) {
    console.error('[admin/login]', err)
    throw createError({ statusCode: 503, statusMessage: 'Database non raggiungibile' })
  }
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Email o password errati' })

  clearRateLimit('login', event)
  try {
    await startAdminSession(event, user.id)
  }
  catch (err) {
    console.error('[admin/login]', err)
    throw createError({ statusCode: 503, statusMessage: 'Database non raggiungibile' })
  }
  return { ok: true }
})
