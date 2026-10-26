import { randomBytes } from 'node:crypto'
import { createError } from 'h3'
import type postgres from 'postgres'
import type { AdminPage, AdminUser, AdminUserRow, UserCreate, UserStatus, UserUpdate } from '#shared/users'
import { ADMIN_PAGES } from '#shared/users'
import { DUMMY_HASH, hashPassword, hashToken, newToken, verifyPassword } from './passwords'
import { pgCode } from './pg'

// Persone del pannello: anagrafica, login e regole anti blocco

type Sql = postgres.Sql

// Serializza le modifiche che possono togliere l'ultimo gestore
const USERS_LOCK = 7_301_001

const notFound = () => createError({ statusCode: 404, statusMessage: 'Collaboratore non trovato' })
const conflict = (statusMessage: string) => createError({ statusCode: 409, statusMessage })

const normEmail = (email: string) => email.trim().toLowerCase()

function rowToUser(r: postgres.Row): AdminUser {
  return { id: r.id, name: r.name, email: r.email, pages: r.pages as AdminPage[] }
}

function rowToUserRow(r: postgres.Row): AdminUserRow {
  const status: UserStatus = !r.active ? 'disattivato' : r.password_hash ? 'attivo' : 'invito'
  return {
    ...rowToUser(r),
    status,
    createdAt: new Date(r.created_at).toISOString(),
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
  }
}

// Lettura ed elenco

export async function listUsers(sql: Sql): Promise<AdminUserRow[]> {
  const rows = await sql`select * from admin_users order by lower(name), created_at`
  return rows.map(rowToUserRow)
}

export async function getUser(sql: Sql, id: string): Promise<AdminUserRow> {
  const [row] = await sql`select * from admin_users where id = ${id}`
  if (!row) throw notFound()
  return rowToUserRow(row)
}

export async function createUser(sql: Sql, input: UserCreate): Promise<AdminUserRow> {
  try {
    const [row] = await sql`
      insert into admin_users (name, email, pages)
      values (${input.name}, ${normEmail(input.email)}, ${input.pages})
      returning *
    `
    return rowToUserRow(row!)
  }
  catch (err) {
    if (pgCode(err) === '23505') throw conflict('Email già usata')
    throw err
  }
}

// Regole anti blocco: restare sempre almeno un gestore attivo e con password

async function assertManagerLeft(tx: Sql) {
  const [{ n }] = await tx`
    select count(*)::int as n from admin_users
    where active and password_hash is not null and 'collaboratori' = any(pages)
  ` as unknown as [{ n: number }]
  if (n === 0) throw conflict('Deve restare almeno una persona attiva con accesso a Collaboratori')
}

export async function updateUser(sql: Sql, actorId: string, id: string, input: UserUpdate): Promise<AdminUserRow> {
  return await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${USERS_LOCK})`
    if (id === actorId && (!input.pages.includes('collaboratori') || !input.active)) {
      throw conflict('Non puoi toglierti l\'accesso a Collaboratori')
    }
    const [row] = await tx`
      update admin_users set name = ${input.name}, pages = ${input.pages}, active = ${input.active}
      where id = ${id}
      returning *
    `
    if (!row) throw notFound()
    if (!input.active) await tx`delete from admin_sessions where user_id = ${id}`
    await assertManagerLeft(tx as unknown as Sql)
    return rowToUserRow(row)
  }) as AdminUserRow
}

export async function deleteUser(sql: Sql, actorId: string, id: string): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${USERS_LOCK})`
    if (id === actorId) throw conflict('Non puoi eliminare il tuo account')
    const [row] = await tx`delete from admin_users where id = ${id} returning id`
    if (!row) throw notFound()
    await assertManagerLeft(tx as unknown as Sql)
  })
}

// Accesso e password

export async function checkLogin(sql: Sql, email: string, password: string): Promise<AdminUser | null> {
  const [row] = await sql`select * from admin_users where email = ${normEmail(email)} and active`
  // Senza persona o senza password scrypt gira lo stesso, su un hash fittizio
  if (!row?.password_hash) {
    await verifyPassword(password, DUMMY_HASH)
    return null
  }
  if (!(await verifyPassword(password, row.password_hash))) return null
  await sql`update admin_users set last_login_at = now() where id = ${row.id}`
  return rowToUser(row)
}

// Nuova password: invalida token e sessioni della persona
export async function setPassword(sql: Sql, id: string, password: string): Promise<void> {
  const hash = await hashPassword(password)
  await sql.begin(async (tx) => {
    const [row] = await tx`update admin_users set password_hash = ${hash} where id = ${id} returning id`
    if (!row) throw notFound()
    await tx`delete from admin_user_tokens where user_id = ${id}`
    await tx`delete from admin_sessions where user_id = ${id}`
  })
}

// Link d'invito e di reset: nel database solo l'hash, validi una volta

const INVITE_SECS = 60 * 60 * 24 * 7
const RESET_SECS = 60 * 60

const gone = () => createError({ statusCode: 410, statusMessage: 'Link scaduto o già usato' })

// Un solo token vivo per persona: il nuovo cancella i precedenti
export async function issueToken(sql: Sql, userId: string, kind: 'invite' | 'reset'): Promise<string> {
  const { token, hash } = newToken()
  const secs = kind === 'invite' ? INVITE_SECS : RESET_SECS
  await sql.begin(async (tx) => {
    await tx`delete from admin_user_tokens where user_id = ${userId}`
    await tx`
      insert into admin_user_tokens (hash, user_id, kind, expires_at)
      values (${hash}, ${userId}, ${kind}, now() + make_interval(secs => ${secs}))
    `
  })
  return token
}

export async function requestReset(sql: Sql, email: string): Promise<{ user: AdminUser, token: string } | null> {
  const [row] = await sql`select * from admin_users where email = ${normEmail(email)} and active`
  if (!row) return null
  return { user: rowToUser(row), token: await issueToken(sql, row.id, 'reset') }
}

export async function redeemToken(sql: Sql, token: string, password: string): Promise<AdminUser> {
  // Hash fuori dalla transazione: scrypt non tiene aperta la connessione
  const passwordHash = await hashPassword(password)
  return await sql.begin(async (tx) => {
    // Il delete consuma il token: due richieste insieme non lo usano due volte
    const [tok] = await tx`
      delete from admin_user_tokens
      where hash = ${hashToken(token)} and expires_at > now()
      returning user_id
    `
    if (!tok) throw gone()
    const [row] = await tx`
      update admin_users set password_hash = ${passwordHash}
      where id = ${tok.user_id} and active
      returning *
    `
    if (!row) throw gone()
    await tx`delete from admin_user_tokens where user_id = ${row.id}`
    await tx`delete from admin_sessions where user_id = ${row.id}`
    return rowToUser(row)
  }) as AdminUser
}

// Sessioni per persona

const SESSION_SECS = 60 * 60 * 24 * 7

export async function createSession(sql: Sql, userId: string): Promise<string> {
  const sid = randomBytes(32).toString('hex')
  await sql`delete from admin_sessions where expires_at < now()`
  await sql`
    insert into admin_sessions (id, expires_at, user_id)
    values (${sid}, now() + make_interval(secs => ${SESSION_SECS}), ${userId})
  `
  return sid
}

export async function sessionUser(sql: Sql, sid: string): Promise<AdminUser | null> {
  const [row] = await sql`
    select u.* from admin_sessions s
    join admin_users u on u.id = s.user_id
    where s.id = ${sid} and s.expires_at > now() and u.active
  `
  return row ? rowToUser(row) : null
}

export async function deleteSession(sql: Sql, sid: string): Promise<void> {
  await sql`delete from admin_sessions where id = ${sid}`
}

export async function deleteOtherSessions(sql: Sql, userId: string, keepSid: string): Promise<void> {
  await sql`delete from admin_sessions where user_id = ${userId} and id <> ${keepSid}`
}

// Cambio password dalla propria sessione: resta aperta solo questa
export async function changeOwnPassword(sql: Sql, user: AdminUser, sid: string, current: string, next: string): Promise<void> {
  const [row] = await sql`select password_hash from admin_users where id = ${user.id}`
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    // 400 e non 401: il 401 per l'interfaccia vuol dire sessione scaduta
    throw createError({ statusCode: 400, statusMessage: 'Password attuale errata' })
  }
  const hash = await hashPassword(next)
  await sql.begin(async (tx) => {
    await tx`update admin_users set password_hash = ${hash} where id = ${user.id}`
    await tx`delete from admin_user_tokens where user_id = ${user.id}`
  })
  await deleteOtherSessions(sql, user.id, sid)
}

// Prima persona da variabili d'ambiente: avvio su tabella vuota, o recupero con ADMIN_RESET
export async function ensureFirstAdmin(
  sql: Sql,
  env: { ADMIN_EMAIL?: string, ADMIN_PASSWORD?: string, ADMIN_RESET?: string },
): Promise<void> {
  const email = env.ADMIN_EMAIL ? normEmail(env.ADMIN_EMAIL) : ''
  const password = env.ADMIN_PASSWORD ?? ''
  if (!email || !password) return
  const reset = env.ADMIN_RESET === 'true'
  if (!reset) {
    const [{ n }] = await sql`select count(*)::int as n from admin_users` as unknown as [{ n: number }]
    if (n > 0) return
  }
  const hash = await hashPassword(password)
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${USERS_LOCK})`
    if (reset) {
      const [row] = await tx`
        insert into admin_users (name, email, password_hash, pages, active)
        values (${email}, ${email}, ${hash}, ${[...ADMIN_PAGES]}, true)
        on conflict (email) do update
          set password_hash = ${hash}, pages = ${[...ADMIN_PAGES]}, active = true
        returning id
      `
      await tx`delete from admin_sessions where user_id = ${row!.id}`
      await tx`delete from admin_user_tokens where user_id = ${row!.id}`
      console.warn('ADMIN_RESET attivo: togli la variabile dopo il recupero')
    }
    else {
      // Ricontrolla sotto lock: un altro avvio potrebbe aver già creato la persona
      const [{ n }] = await tx`select count(*)::int as n from admin_users` as unknown as [{ n: number }]
      if (n > 0) return
      await tx`
        insert into admin_users (name, email, password_hash, pages)
        values (${email}, ${email}, ${hash}, ${[...ADMIN_PAGES]})
      `
    }
  })
}
