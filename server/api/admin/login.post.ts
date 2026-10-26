import { z } from 'zod'
import { emailSchema } from '#shared/users'

// Login per persona con limite di tentativi per IP ed email: un successo
// azzera solo il contatore di quell'email, non quello delle altre. Un solo
// errore per email sconosciuta, disattivata o password sbagliata.
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
  const { email, password } = await readSchemaBody(event, loginSchema)
  // emailSchema la dà già in minuscolo e senza spazi
  rateLimit('login', event, { max: 8, windowMs: 10 * 60 * 1000 }, email)

  let user
  try {
    user = await checkLogin(await useDb(), email, password)
  }
  catch (err) {
    console.error('[admin/login]', err)
    throw createError({ statusCode: 503, statusMessage: 'Database non raggiungibile' })
  }
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Email o password errati' })

  clearRateLimit('login', event, email)
  try {
    await startAdminSession(event, user.id)
  }
  catch (err) {
    console.error('[admin/login]', err)
    throw createError({ statusCode: 503, statusMessage: 'Database non raggiungibile' })
  }
  return { ok: true }
})
