import type { H3Event } from 'h3'
import type { AdminUser } from '#shared/users'
import { createSession, deleteSession, sessionUser } from './users'

// Sessione admin per persona. Il cookie (sigillato da h3 con SESSION_SECRET)
// contiene solo l'id di una riga di admin_sessions: il logout la cancella,
// quindi un cookie copiato smette di funzionare.

declare module 'h3' {
  interface H3EventContext {
    // La persona della sessione e l'id della riga, letti una volta per richiesta
    adminSession?: { user: AdminUser, sid: string } | null
  }
}

const SESSION_NAME = 'didap_admin'
const MAX_AGE = 60 * 60 * 24 * 7

// Vuota se manca o è troppo corta per sigillare il cookie
export function sessionSecret() {
  const secret = process.env.SESSION_SECRET ?? ''
  return secret.length >= 32 ? secret : ''
}

// Prima di aprire una sessione: senza chiave o senza database non partirebbe
export function requireAdminReady() {
  if (!sessionSecret()) {
    throw createError({ statusCode: 503, statusMessage: 'Admin non configurato' })
  }
  if (!hasDatabase()) {
    throw createError({ statusCode: 503, statusMessage: 'Database non configurato' })
  }
}

const cookieSession = (event: H3Event) =>
  useSession<{ sid?: string }>(event, {
    name: SESSION_NAME,
    password: sessionSecret(),
    maxAge: MAX_AGE,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: !import.meta.dev,
      path: '/',
    },
  })

export async function startAdminSession(event: H3Event, userId: string) {
  // Prima della riga in admin_sessions: senza chiave resterebbe orfana
  requireAdminReady()
  const sql = await useDb()
  const session = await cookieSession(event)
  // Il browser aveva già una sessione: la vecchia riga non deve restare valida
  if (session.data.sid) await deleteSession(sql, session.data.sid)
  const sid = await createSession(sql, userId)
  await session.update({ sid })
  event.context.adminSession = undefined
}

export async function endAdminSession(event: H3Event) {
  if (!sessionSecret()) return
  const session = await cookieSession(event)
  const sid = session.data.sid
  if (sid && hasDatabase()) await deleteSession(await useDb(), sid)
  await session.clear()
  event.context.adminSession = null
}

// Una lettura per richiesta, poi da event.context
async function currentSession(event: H3Event): Promise<{ user: AdminUser, sid: string } | null> {
  if (event.context.adminSession !== undefined) return event.context.adminSession
  let found: { user: AdminUser, sid: string } | null = null
  if (sessionSecret() && hasDatabase()) {
    const sid = (await cookieSession(event)).data.sid
    const user = sid ? await sessionUser(await useDb(), sid) : null
    if (sid && user) found = { user, sid }
  }
  event.context.adminSession = found
  return found
}

export async function currentUser(event: H3Event): Promise<AdminUser | null> {
  return (await currentSession(event))?.user ?? null
}

const unauthorized = () => createError({ statusCode: 401, statusMessage: 'Accesso non autorizzato' })

export async function requireUser(event: H3Event): Promise<AdminUser> {
  const user = await currentUser(event)
  if (!user) throw unauthorized()
  return user
}

// La persona e l'id della sua sessione (per chi tiene aperta solo questa)
export async function requireSession(event: H3Event): Promise<{ user: AdminUser, sid: string }> {
  const s = await currentSession(event)
  if (!s) throw unauthorized()
  return s
}
