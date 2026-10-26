import { z } from 'zod'
import { emailSchema, PASSWORD_MAX } from '#shared/users'

// Login per persona con due limiti: per IP ed email (un successo azzera solo
// il contatore di quell'email) e per IP in tutto, che un successo non azzera,
// così un IP non prova password su tante email. Un solo errore per email
// sconosciuta, disattivata o password sbagliata.
const WINDOW_MS = 10 * 60 * 1000

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().max(PASSWORD_MAX),
})

export default defineEventHandler(async (event) => {
  requireAdminReady()
  const { email, password } = await readSchemaBody(event, loginSchema)
  // emailSchema la dà già in minuscolo e senza spazi
  rateLimit('login-ip', event, { max: 50, windowMs: WINDOW_MS })
  rateLimit('login', event, { max: 8, windowMs: WINDOW_MS }, email)

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
