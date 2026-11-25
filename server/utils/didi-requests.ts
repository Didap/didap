import { createError } from 'h3'
import type postgres from 'postgres'
import type { DidiRequest, DidiRequestItem, RequestStatus } from '#shared/didi-requests'

// Le richieste della chat con Didi: le scrive /api/didi, le legge
// /admin/richieste

type Sql = postgres.Sql

const notFound = () => createError({ statusCode: 404, statusMessage: 'Richiesta non trovata' })

const rowToItem = (r: postgres.Row): DidiRequestItem => ({
  id: r.id,
  name: r.name,
  contact: r.contact,
  contactKind: r.contact_kind,
  projectType: r.project_type,
  summary: r.summary,
  locale: r.locale,
  emailSent: r.email_sent,
  status: r.status,
  createdAt: new Date(r.created_at).toISOString(),
})

const rowToRequest = (r: postgres.Row): DidiRequest => ({ ...rowToItem(r), transcript: r.transcript })

export type NewDidiRequest = Omit<DidiRequest, 'id' | 'status' | 'createdAt'>

export async function createDidiRequest(sql: Sql, input: NewDidiRequest): Promise<string> {
  const [row] = await sql`
    insert into didi_requests ${sql({
      name: input.name,
      contact: input.contact,
      contact_kind: input.contactKind,
      project_type: input.projectType,
      summary: input.summary,
      transcript: sql.json(input.transcript),
      locale: input.locale,
      email_sent: input.emailSent,
    })}
    returning id
  `
  return row!.id
}

// Le più recenti prima, senza la conversazione
export async function listDidiRequests(sql: Sql): Promise<DidiRequestItem[]> {
  const rows = await sql`
    select id, name, contact, contact_kind, project_type, summary, locale, email_sent, status, created_at
    from didi_requests order by created_at desc limit 500
  `
  return rows.map(rowToItem)
}

export async function getDidiRequest(sql: Sql, id: string): Promise<DidiRequest> {
  const [row] = await sql`select * from didi_requests where id = ${id}`
  if (!row) throw notFound()
  return rowToRequest(row)
}

export async function setDidiRequestStatus(sql: Sql, id: string, status: RequestStatus): Promise<DidiRequestItem> {
  const [row] = await sql`update didi_requests set status = ${status} where id = ${id} returning *`
  if (!row) throw notFound()
  return rowToItem(row)
}

export async function deleteDidiRequest(sql: Sql, id: string): Promise<void> {
  const [row] = await sql`delete from didi_requests where id = ${id} returning id`
  if (!row) throw notFound()
}
