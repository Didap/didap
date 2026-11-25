import { createError } from 'h3'
import type postgres from 'postgres'
import type { ContactKind, ProjectType } from '#shared/contact'
import type { DidiMessage, DidiRequest, RequestStatus } from '#shared/didi-requests'

// Le richieste della chat con Didi: le scrive /api/didi, le legge
// /admin/richieste

type Sql = postgres.Sql

const notFound = () => createError({ statusCode: 404, statusMessage: 'Richiesta non trovata' })

const rowToRequest = (r: postgres.Row): DidiRequest => ({
  id: r.id,
  name: r.name,
  contact: r.contact,
  contactKind: r.contact_kind,
  projectType: r.project_type,
  summary: r.summary,
  transcript: r.transcript,
  locale: r.locale,
  emailSent: r.email_sent,
  status: r.status,
  createdAt: new Date(r.created_at).toISOString(),
})

export interface NewDidiRequest {
  name: string
  contact: string
  contactKind: ContactKind
  projectType: ProjectType | ''
  summary: string
  transcript: DidiMessage[]
  locale: string
}

export async function createDidiRequest(sql: Sql, input: NewDidiRequest): Promise<DidiRequest> {
  const [row] = await sql`
    insert into didi_requests ${sql({
      name: input.name,
      contact: input.contact,
      contact_kind: input.contactKind,
      project_type: input.projectType,
      summary: input.summary,
      transcript: sql.json(input.transcript),
      locale: input.locale,
    })}
    returning *
  `
  return rowToRequest(row!)
}

export async function markDidiRequestEmailed(sql: Sql, id: string): Promise<void> {
  await sql`update didi_requests set email_sent = true where id = ${id}`
}

// Le più recenti prima
export async function listDidiRequests(sql: Sql): Promise<DidiRequest[]> {
  const rows = await sql`select * from didi_requests order by created_at desc limit 500`
  return rows.map(rowToRequest)
}

export async function setDidiRequestStatus(sql: Sql, id: string, status: RequestStatus): Promise<DidiRequest> {
  const [row] = await sql`update didi_requests set status = ${status} where id = ${id} returning *`
  if (!row) throw notFound()
  return rowToRequest(row)
}

export async function deleteDidiRequest(sql: Sql, id: string): Promise<void> {
  const [row] = await sql`delete from didi_requests where id = ${id} returning id`
  if (!row) throw notFound()
}
