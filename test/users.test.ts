import type postgres from 'postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DB_SCHEMA } from '../server/utils/schema'
import { checkLogin, createUser, deleteUser, getUser, listUsers, setPassword, updateUser } from '../server/utils/users'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'

const PW = 'una-password-lunga'

describe.skipIf(!TEST_DATABASE_URL)('collaboratori su Postgres', () => {
  let sql: postgres.Sql
  beforeAll(async () => {
    sql = await openTestDb()
  })
  afterAll(async () => {
    await sql?.end()
  })
  beforeEach(async () => {
    await resetTestDb(sql)
  })

  // Persona con accesso a Collaboratori e password
  async function manager(name: string) {
    const u = await createUser(sql, { name, email: `${name.toLowerCase()}@didap.it`, pages: ['collaboratori'] })
    await setPassword(sql, u.id, PW)
    return u
  }

  const keep = (u: { name: string }) => ({ name: u.name, pages: ['collaboratori' as const], active: true })

  it('lo schema si applica due volte senza errori', async () => {
    await sql.unsafe(DB_SCHEMA)
    await sql.unsafe(DB_SCHEMA)
  })

  it('crea, elenca per nome e mostra lo stato', async () => {
    const b = await createUser(sql, { name: 'beta', email: 'b@didap.it', pages: ['prodotti'] })
    await createUser(sql, { name: 'Alfa', email: 'a@didap.it', pages: [] })
    expect((await listUsers(sql)).map(u => u.name)).toEqual(['Alfa', 'beta'])
    expect(b.status).toBe('invito')
    await setPassword(sql, b.id, PW)
    expect((await getUser(sql, b.id)).status).toBe('attivo')
  })

  it('una persona inesistente dà 404', async () => {
    await expect(getUser(sql, '00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('la stessa email con maiuscole diverse dà 409', async () => {
    await createUser(sql, { name: 'Mario', email: 'mario@didap.it', pages: [] })
    await expect(createUser(sql, { name: 'Altro', email: 'MARIO@didap.it', pages: [] })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('checkLogin normalizza l\'email e aggiorna lastLoginAt', async () => {
    const u = await createUser(sql, { name: 'Mario', email: 'mario@didap.it', pages: ['clienti'] })
    await setPassword(sql, u.id, PW)
    expect((await getUser(sql, u.id)).lastLoginAt).toBeNull()
    const found = await checkLogin(sql, '  Mario@Didap.IT ', PW)
    expect(found).toEqual({ id: u.id, name: 'Mario', email: 'mario@didap.it', pages: ['clienti'] })
    expect((await getUser(sql, u.id)).lastLoginAt).not.toBeNull()
  })

  it('checkLogin dà null con password sbagliata, disattivata o senza password', async () => {
    const a = await manager('A')
    const b = await manager('B')
    const c = await createUser(sql, { name: 'C', email: 'c@didap.it', pages: [] })
    expect(await checkLogin(sql, 'a@didap.it', 'sbagliata-sbagliata')).toBeNull()
    expect(await checkLogin(sql, 'nessuno@didap.it', PW)).toBeNull()
    expect(await checkLogin(sql, c.email, PW)).toBeNull()
    await updateUser(sql, a.id, b.id, { ...keep(b), active: false })
    expect(await checkLogin(sql, 'b@didap.it', PW)).toBeNull()
  })

  it('gestore unico: non può togliersi accesso, disattivarsi o eliminarsi', async () => {
    const a = await manager('A')
    await createUser(sql, { name: 'B', email: 'b@didap.it', pages: ['collaboratori'] })
    await expect(updateUser(sql, a.id, a.id, { ...keep(a), pages: [] })).rejects.toMatchObject({ statusCode: 409 })
    await expect(updateUser(sql, a.id, a.id, { ...keep(a), active: false })).rejects.toMatchObject({ statusCode: 409 })
    await expect(deleteUser(sql, a.id, a.id)).rejects.toMatchObject({ statusCode: 409 })
    expect((await getUser(sql, a.id)).pages).toEqual(['collaboratori'])
  })

  it('un terzo attore non può togliere collaboratori all\'unico gestore', async () => {
    const a = await manager('A')
    await createUser(sql, { name: 'B', email: 'b@didap.it', pages: ['collaboratori'] })
    const c = await manager('C')
    await updateUser(sql, a.id, c.id, { ...keep(c), active: false })
    await expect(updateUser(sql, c.id, a.id, { ...keep(a), pages: [] })).rejects.toMatchObject({ statusCode: 409 })
    await expect(deleteUser(sql, c.id, a.id)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('con due gestori: A disattiva B, poi non può togliersi collaboratori', async () => {
    const a = await manager('A')
    const b = await manager('B')
    const off = await updateUser(sql, a.id, b.id, { ...keep(b), active: false })
    expect(off.status).toBe('disattivato')
    await expect(updateUser(sql, a.id, a.id, { ...keep(a), pages: [] })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('eliminare un\'altra persona va bene se resta un gestore', async () => {
    const a = await manager('A')
    const b = await manager('B')
    await deleteUser(sql, a.id, b.id)
    await expect(getUser(sql, b.id)).rejects.toMatchObject({ statusCode: 404 })
    await expect(deleteUser(sql, a.id, b.id)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('disattivare cancella le sessioni della persona', async () => {
    const a = await manager('A')
    const b = await manager('B')
    await sql`insert into admin_sessions (id, expires_at, user_id) values ('sb', now() + interval '1 day', ${b.id})`
    await sql`insert into admin_sessions (id, expires_at, user_id) values ('sa', now() + interval '1 day', ${a.id})`
    await updateUser(sql, a.id, b.id, { ...keep(b), active: false })
    const left = await sql`select id from admin_sessions`
    expect(left.map(r => r.id)).toEqual(['sa'])
  })

  it('setPassword cancella token e sessioni della persona', async () => {
    const a = await manager('A')
    await sql`insert into admin_sessions (id, expires_at, user_id) values ('sa', now() + interval '1 day', ${a.id})`
    await sql`insert into admin_user_tokens (hash, user_id, kind, expires_at) values ('h', ${a.id}, 'reset', now() + interval '1 hour')`
    await setPassword(sql, a.id, 'nuova-password-lunga')
    expect(await sql`select 1 from admin_sessions`).toHaveLength(0)
    expect(await sql`select 1 from admin_user_tokens`).toHaveLength(0)
    expect(await checkLogin(sql, a.email, 'nuova-password-lunga')).not.toBeNull()
  })
})
