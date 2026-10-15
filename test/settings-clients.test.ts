import type postgres from 'postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { emptyClient } from '#shared/clients'
import { DEFAULT_SETTINGS } from '#shared/settings'
import { createClient, deleteClient, getClient, listClients, updateClient } from '../server/utils/clients'
import { DB_SCHEMA } from '../server/utils/schema'
import { readSettings, writeSettings } from '../server/utils/settings'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'

describe.skipIf(!TEST_DATABASE_URL)('impostazioni e clienti su Postgres', () => {
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

  it('lo schema si applica più volte senza errori', async () => {
    await sql.unsafe(DB_SCHEMA)
    await sql.unsafe(DB_SCHEMA)
  })

  it('senza impostazioni salvate restituisce i default', async () => {
    expect(await readSettings(sql)).toEqual(DEFAULT_SETTINGS)
  })

  it('salva e rilegge le impostazioni', async () => {
    const next = { ...DEFAULT_SETTINGS, company: { ...DEFAULT_SETTINGS.company, iban: 'IT60X0542811101000000123456' } }
    await writeSettings(sql, next)
    await writeSettings(sql, next)
    expect(await readSettings(sql)).toEqual(next)
  })

  it('crea, elenca in ordine alfabetico, modifica ed elimina', async () => {
    const b = await createClient(sql, { ...emptyClient(), name: 'beta srl' })
    const a = await createClient(sql, { ...emptyClient(), name: 'Alfa spa', vatNumber: 'IT01234567890' })
    expect((await listClients(sql)).map((c) => c.name)).toEqual(['Alfa spa', 'beta srl'])

    const updated = await updateClient(sql, a.id, { ...emptyClient(), name: 'Alfa spa', email: 'info@alfa.it' })
    expect(updated).toMatchObject({ id: a.id, email: 'info@alfa.it', vatNumber: '' })

    await deleteClient(sql, b.id)
    await expect(getClient(sql, b.id)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('modificare o eliminare un cliente inesistente dà 404', async () => {
    const missing = '00000000-0000-4000-8000-000000000000'
    await expect(updateClient(sql, missing, { ...emptyClient(), name: 'x' })).rejects.toMatchObject({ statusCode: 404 })
    await expect(deleteClient(sql, missing)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('deleteClient e chiave esterna', () => {
  it('un preventivo nato dopo il controllo dà 409, non 500', async () => {
    // Finto client: il controllo non trova nulla, poi la delete viola la chiave
    let calls = 0
    const fake = (() => {
      if (++calls === 1) return Promise.resolve([])
      return Promise.reject(Object.assign(new Error('violazione'), { code: '23503' }))
    }) as unknown as postgres.Sql
    await expect(deleteClient(fake, 'x')).rejects.toMatchObject({ statusCode: 409 })
  })
})
