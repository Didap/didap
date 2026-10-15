import { createError } from 'h3'
import type postgres from 'postgres'
import { emptyClient } from '#shared/clients'
import { addDays, romeDate } from '#shared/dates'
import {
  buildSnapshot,
  computeTotals,
  draftInputSchema,
  effectiveStatus,
  newDraftContent,
  quoteContentSchema,
  quoteNumber,
  type DraftInput,
  type QuoteDetail,
  type QuoteListRow,
  type QuoteSnapshot,
  type SettableStatus,
} from '#shared/quote'
import { rowToClientInput } from './clients'
import { pgCode } from './pg'
import { readSettings } from './settings'

// Preventivi in /admin: bozza, elenco, duplicazione, stato, anteprima.
// L'emissione è in quote-issue.ts, le letture pubbliche in quote-public.ts.

type Sql = postgres.Sql

const notFound = () => createError({ statusCode: 404, statusMessage: 'Preventivo non trovato' })
const iso = (d: Date | string) => new Date(d).toISOString()
const numberOf = (r: postgres.Row) => (r.year ? quoteNumber(r.year, r.seq) : null)

export const rowToDraft = (r: postgres.Row): DraftInput =>
  draftInputSchema.parse({ title: r.title, clientId: r.client_id, content: r.draft })

export async function createQuote(sql: Sql, now: Date): Promise<{ id: string }> {
  const { defaults } = await readSettings(sql)
  const content = newDraftContent(defaults, romeDate(now))
  const [row] = await sql`insert into quotes (draft) values (${sql.json(content)}) returning id`
  return { id: row!.id }
}

export async function getQuote(sql: Sql, id: string, today: string): Promise<QuoteDetail> {
  const [q] = await sql`select * from quotes where id = ${id}`
  if (!q) throw notFound()
  const revisions = await sql`
    select rev, issued_at,
      snapshot->'totals'->>'total' as total,
      snapshot->'content'->>'validUntil' as valid_until
    from quote_revisions where quote_id = ${id}
    order by rev desc
  `
  return {
    id: q.id,
    number: numberOf(q),
    token: q.token,
    status: q.status,
    displayStatus: effectiveStatus(q.status, revisions[0]?.valid_until ?? '', today),
    currentRev: q.current_rev,
    draft: rowToDraft(q),
    issuedDraft: q.issued_draft ? draftInputSchema.parse(q.issued_draft) : null,
    revisions: revisions.map((r) => ({ rev: r.rev, issuedAt: iso(r.issued_at), total: Number(r.total) })),
    updatedAt: iso(q.updated_at),
  }
}

export async function saveDraft(sql: Sql, id: string, input: DraftInput): Promise<{ updatedAt: string }> {
  try {
    const [row] = await sql`
      update quotes
      set title = ${input.title}, client_id = ${input.clientId},
        draft = ${sql.json(input.content)}, updated_at = now()
      where id = ${id}
      returning updated_at
    `
    if (!row) throw notFound()
    return { updatedAt: iso(row.updated_at) }
  }
  catch (err) {
    // 23503: il cliente scelto non esiste (più)
    if (pgCode(err) === '23503') {
      throw createError({ statusCode: 422, statusMessage: 'Cliente non trovato' })
    }
    throw err
  }
}

// Totale di una bozza non ancora emessa (0 se il contenuto non è valido)
function draftTotal(draft: unknown): number {
  const content = quoteContentSchema.safeParse(draft)
  return content.success ? computeTotals(content.data).total : 0
}

export async function listQuotes(sql: Sql, today: string): Promise<QuoteListRow[]> {
  const rows = await sql`
    select q.id, q.title, q.status, q.year, q.seq, q.updated_at,
      case when q.current_rev = 0 then q.draft end as draft,
      c.name as client_name,
      r.snapshot->'totals'->>'total' as issued_total,
      r.snapshot->'content'->>'validUntil' as valid_until
    from quotes q
    left join clients c on c.id = q.client_id
    left join quote_revisions r on r.quote_id = q.id and r.rev = q.current_rev
    order by q.updated_at desc
  `
  return rows.map((r) => {
    return {
      id: r.id,
      number: numberOf(r),
      title: r.title,
      clientName: r.client_name,
      total: r.issued_total != null ? Number(r.issued_total) : draftTotal(r.draft),
      status: r.status,
      displayStatus: effectiveStatus(r.status, r.valid_until ?? '', today),
      updatedAt: iso(r.updated_at),
    }
  })
}

// Esiste ma non si può: 409; non esiste: 404
async function conflictOrNotFound(sql: Sql, id: string, message: string): Promise<never> {
  const [exists] = await sql`select 1 from quotes where id = ${id}`
  throw exists ? createError({ statusCode: 409, statusMessage: message }) : notFound()
}

export async function deleteQuote(sql: Sql, id: string): Promise<void> {
  const [row] = await sql`delete from quotes where id = ${id} and current_rev = 0 returning id`
  if (!row) await conflictOrNotFound(sql, id, 'Un preventivo emesso non si può eliminare')
}

export async function setQuoteStatus(sql: Sql, id: string, status: SettableStatus): Promise<void> {
  const [row] = await sql`
    update quotes set status = ${status}, updated_at = now()
    where id = ${id} and current_rev > 0
    returning id
  `
  if (!row) await conflictOrNotFound(sql, id, 'Emetti il preventivo prima di cambiarne lo stato')
}

export async function duplicateQuote(sql: Sql, id: string, now: Date): Promise<{ id: string }> {
  const [q] = await sql`select title, client_id, draft from quotes where id = ${id}`
  if (!q) throw notFound()
  const { defaults } = await readSettings(sql)
  const content = {
    ...quoteContentSchema.parse(q.draft),
    validUntil: addDays(romeDate(now), defaults.validityDays),
  }
  const [row] = await sql`
    insert into quotes (title, client_id, draft)
    values (${q.title}, ${q.client_id}, ${sql.json(content)})
    returning id
  `
  return { id: row!.id }
}

// PDF della bozza prima di emetterla: stesso documento, numero provvisorio
export async function previewSnapshot(sql: Sql, id: string, now: Date): Promise<QuoteSnapshot> {
  const [q] = await sql`select * from quotes where id = ${id}`
  if (!q) throw notFound()
  const draft = rowToDraft(q)
  const [clientRow] = draft.clientId ? await sql`select * from clients where id = ${draft.clientId}` : []
  const settings = await readSettings(sql)
  return buildSnapshot({
    number: numberOf(q) ?? 'BOZZA',
    rev: q.current_rev + 1,
    now,
    title: draft.title,
    clientId: draft.clientId ?? '',
    client: clientRow ? rowToClientInput(clientRow) : { ...emptyClient(), name: 'Cliente da scegliere' },
    company: settings.company,
    content: draft.content,
  })
}
