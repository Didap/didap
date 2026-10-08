// Login admin con limite di tentativi per IP (in memoria, per istanza)
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 8
const attempts = new Map<string, { count: number; since: number }>()

export default defineEventHandler(async (event) => {
  if (!adminPassword()) {
    throw createError({ statusCode: 503, statusMessage: 'Admin non configurato' })
  }
  if (!hasDatabase()) {
    throw createError({ statusCode: 503, statusMessage: 'Database non configurato' })
  }

  // Dietro il proxy di Coolify l'IP vero è l'ultimo di X-Forwarded-For:
  // i valori precedenti li può scrivere il client
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  const ip
    = forwarded?.split(',').pop()?.trim()
      || getRequestIP(event)
      || 'unknown'
  const now = Date.now()
  const entry = attempts.get(ip)
  if (entry && now - entry.since < WINDOW_MS && entry.count >= MAX_ATTEMPTS) {
    throw createError({ statusCode: 429, statusMessage: 'Troppi tentativi, riprova più tardi' })
  }

  const body = await readBody<{ password?: unknown }>(event)
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!passwordMatches(password)) {
    const fresh = !entry || now - entry.since >= WINDOW_MS
    attempts.set(ip, { count: fresh ? 1 : entry.count + 1, since: fresh ? now : entry.since })
    throw createError({ statusCode: 401, statusMessage: 'Password errata' })
  }

  attempts.delete(ip)
  try {
    await startAdminSession(event)
  }
  catch (err) {
    console.error('[admin/login]', err)
    throw createError({ statusCode: 503, statusMessage: 'Database non raggiungibile' })
  }
  return { ok: true }
})
