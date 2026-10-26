import { createError } from 'h3'
import type postgres from 'postgres'
import type { AdminPage, AdminUser, AdminUserRow, UserCreate, UserStatus, UserUpdate } from '#shared/users'
import { hashPassword, verifyPassword } from './passwords'
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
  // verifyPassword gestisce anche la password assente
  if (!row || !(await verifyPassword(password, row.password_hash))) return null
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
