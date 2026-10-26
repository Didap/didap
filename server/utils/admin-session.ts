import type { H3Event } from 'h3'
import type { AdminUser } from '#shared/users'
import { createSession, deleteSession, sessionUser } from './users'

// Sessione admin per persona. Il cookie (sigillato da h3 con SESSION_SECRET)
// contiene solo l'id di una riga di admin_sessions: il logout la cancella,
// quindi un cookie copiato smette di funzionare.

declare module 'h3' {
  interface H3EventContext {
    adminUser?: AdminUser | null
  }
}

const SESSION_NAME = 'didap_admin'
const MAX_AGE = 60 * 60 * 24 * 7

// Vuota se manca o è troppo corta per sigillare il cookie
export function sessionSecret() {
  const secret = process.env.SESSION_SECRET ?? ''
  return secret.length >= 32 ? secret : ''
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
  if (!sessionSecret()) {
    throw createError({ statusCode: 503, statusMessage: 'Admin non configurato' })
  }
  const sid = await createSession(await useDb(), userId)
  const session = await cookieSession(event)
  await session.update({ sid })
  event.context.adminUser = undefined
}

export async function currentSessionId(event: H3Event): Promise<string | null> {
  if (!sessionSecret()) return null
  const session = await cookieSession(event)
  return session.data.sid ?? null
}

export async function endAdminSession(event: H3Event) {
  if (!sessionSecret()) return
  const session = await cookieSession(event)
  const sid = session.data.sid
  if (sid && hasDatabase()) await deleteSession(await useDb(), sid)
  await session.clear()
  event.context.adminUser = null
}

// Una lettura per richiesta, poi da event.context
export async function currentUser(event: H3Event): Promise<AdminUser | null> {
  if (event.context.adminUser !== undefined) return event.context.adminUser
  let user: AdminUser | null = null
  if (hasDatabase()) {
    const sid = await currentSessionId(event)
    if (sid) user = await sessionUser(await useDb(), sid)
  }
  event.context.adminUser = user
  return user
}

export async function requireUser(event: H3Event): Promise<AdminUser> {
  const user = await currentUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Accesso non autorizzato' })
  return user
}
