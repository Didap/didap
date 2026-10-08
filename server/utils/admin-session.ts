import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

// Sessione admin: password unica in ADMIN_PASSWORD. Il cookie (sigillato
// da h3, chiave derivata dalla password) contiene solo l'id di una riga
// di admin_sessions: il logout la cancella, quindi un cookie copiato
// smette di funzionare. Cambiare la password chiude tutte le sessioni.

const SESSION_NAME = 'didap_admin'
const MAX_AGE = 60 * 60 * 24 * 7

export const adminPassword = () => process.env.ADMIN_PASSWORD ?? ''

const sessionKey = () =>
  createHash('sha256').update(`didap-admin:${adminPassword()}`).digest('hex')

const cookieSession = (event: H3Event) =>
  useSession<{ sid?: string }>(event, {
    name: SESSION_NAME,
    password: sessionKey(),
    maxAge: MAX_AGE,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: !import.meta.dev,
      path: '/',
    },
  })

export function passwordMatches(candidate: string) {
  const expected = adminPassword()
  if (!expected) return false
  const a = createHash('sha256').update(candidate).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export async function startAdminSession(event: H3Event) {
  const sql = await useDb()
  const sid = randomBytes(32).toString('hex')
  await sql`delete from admin_sessions where expires_at < now()`
  await sql`
    insert into admin_sessions (id, expires_at)
    values (${sid}, now() + make_interval(secs => ${MAX_AGE}))
  `
  const session = await cookieSession(event)
  await session.update({ sid })
}

export async function endAdminSession(event: H3Event) {
  const session = await cookieSession(event)
  const sid = session.data.sid
  if (sid && hasDatabase()) {
    const sql = await useDb()
    await sql`delete from admin_sessions where id = ${sid}`
  }
  await session.clear()
}

export async function isAdmin(event: H3Event) {
  if (!adminPassword() || !hasDatabase()) return false
  const session = await cookieSession(event)
  const sid = session.data.sid
  if (!sid) return false
  const sql = await useDb()
  const rows = await sql`
    select 1 from admin_sessions where id = ${sid} and expires_at > now()
  `
  return rows.length > 0
}

export async function requireAdmin(event: H3Event) {
  if (!(await isAdmin(event))) {
    throw createError({ statusCode: 401, statusMessage: 'Accesso non autorizzato' })
  }
}
