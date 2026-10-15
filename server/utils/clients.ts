import { createError } from 'h3'
import type postgres from 'postgres'
import type { Client, ClientInput } from '#shared/clients'
import { pgCode } from './pg'

// Anagrafica clienti dei preventivi

type Sql = postgres.Sql

const notFound = () => createError({ statusCode: 404, statusMessage: 'Cliente non trovato' })

export function rowToClientInput(r: postgres.Row): ClientInput {
  return {
    name: r.name,
    vatNumber: r.vat_number,
    taxCode: r.tax_code,
    address: r.address,
    sdiPec: r.sdi_pec,
    contactName: r.contact_name,
    email: r.email,
    phone: r.phone,
    notes: r.notes,
  }
}

export const rowToClient = (r: postgres.Row): Client => ({ id: r.id, ...rowToClientInput(r) })

const toRow = (c: ClientInput) => ({
  name: c.name,
  vat_number: c.vatNumber,
  tax_code: c.taxCode,
  address: c.address,
  sdi_pec: c.sdiPec,
  contact_name: c.contactName,
  email: c.email,
  phone: c.phone,
  notes: c.notes,
})

export async function listClients(sql: Sql): Promise<Client[]> {
  const rows = await sql`select * from clients order by lower(name), created_at`
  return rows.map(rowToClient)
}

export async function getClient(sql: Sql, id: string): Promise<Client> {
  const [row] = await sql`select * from clients where id = ${id}`
  if (!row) throw notFound()
  return rowToClient(row)
}

export async function createClient(sql: Sql, input: ClientInput): Promise<Client> {
  const [row] = await sql`insert into clients ${sql(toRow(input))} returning *`
  return rowToClient(row!)
}

export async function updateClient(sql: Sql, id: string, input: ClientInput): Promise<Client> {
  const [row] = await sql`
    update clients set ${sql(toRow(input))}, updated_at = now()
    where id = ${id}
    returning *
  `
  if (!row) throw notFound()
  return rowToClient(row)
}

// Un cliente con preventivi non si elimina: lo ferma la chiave esterna
export async function deleteClient(sql: Sql, id: string): Promise<void> {
  let row
  try {
    [row] = await sql`delete from clients where id = ${id} returning id`
  }
  catch (err) {
    if (pgCode(err) === '23503') {
      throw createError({ statusCode: 409, statusMessage: 'Il cliente ha dei preventivi: non si può eliminare' })
    }
    throw err
  }
  if (!row) throw notFound()
}
