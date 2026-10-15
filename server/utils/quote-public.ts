import type postgres from 'postgres'
import { effectiveStatus, pdfFilename, TOKEN_PATTERN, type QuoteSnapshot } from '#shared/quote'

// Letture per il link pubblico /p/:token, sempre sull'ultima revisione
// emessa. Token malformati o sconosciuti danno null (404 generico).

type Sql = postgres.Sql
type Pdf = { pdf: Buffer; filename: string }

export async function getPublicQuote(
  sql: Sql,
  token: string,
  today: string,
): Promise<{ snapshot: QuoteSnapshot; expired: boolean } | null> {
  if (!TOKEN_PATTERN.test(token)) return null
  const [row] = await sql`
    select q.status, r.snapshot
    from quotes q
    join quote_revisions r on r.quote_id = q.id and r.rev = q.current_rev
    where q.token = ${token}
  `
  if (!row) return null
  const snapshot = row.snapshot as QuoteSnapshot
  return { snapshot, expired: effectiveStatus(row.status, snapshot.content.validUntil, today) === 'expired' }
}

export async function getPublicPdf(sql: Sql, token: string): Promise<Pdf | null> {
  if (!TOKEN_PATTERN.test(token)) return null
  const [row] = await sql`
    select r.pdf, r.rev, r.snapshot->>'number' as number
    from quotes q
    join quote_revisions r on r.quote_id = q.id and r.rev = q.current_rev
    where q.token = ${token}
  `
  return row ? { pdf: row.pdf, filename: pdfFilename(row.number, row.rev) } : null
}

export async function getRevisionPdf(sql: Sql, id: string, rev: number): Promise<Pdf | null> {
  const [row] = await sql`
    select pdf, rev, snapshot->>'number' as number
    from quote_revisions where quote_id = ${id} and rev = ${rev}
  `
  return row ? { pdf: row.pdf, filename: pdfFilename(row.number, row.rev) } : null
}
