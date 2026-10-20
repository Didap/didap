import { createError } from 'h3'
import type postgres from 'postgres'
import { pdfFilename, type QuoteSnapshot } from '#shared/quote'
import { quoteEmailHtml, quoteEmailSubject, quoteEmailText } from '../emails/quote-email'
import type { Mailer } from './mail'

// Invio al cliente dell'ultima revisione confermata: mail con il PDF
// allegato e il link pubblico. Si sblocca solo dopo la conferma.

export async function sendQuote(
  sql: postgres.Sql,
  id: string,
  opts: { mailer: Mailer, siteUrl: string, now: Date },
): Promise<{ to: string }> {
  const [q] = await sql`
    select q.status, q.token, q.current_rev, c.email as client_email, r.snapshot, r.pdf
    from quotes q
    left join clients c on c.id = q.client_id
    left join quote_revisions r on r.quote_id = q.id and r.rev = q.current_rev
    where q.id = ${id}
  `
  if (!q) throw createError({ statusCode: 404, statusMessage: 'Preventivo non trovato' })
  if (q.status !== 'confirmed' || !q.snapshot) {
    throw createError({ statusCode: 409, statusMessage: 'Si può inviare solo un preventivo confermato' })
  }
  const to = String(q.client_email ?? '').trim()
  if (!to) throw createError({ statusCode: 422, statusMessage: 'Il cliente non ha un indirizzo email' })

  const snapshot = q.snapshot as QuoteSnapshot
  const url = `${opts.siteUrl.replace(/\/$/, '')}/p/${q.token}`
  await opts.mailer({
    to: [to],
    subject: quoteEmailSubject(snapshot),
    html: quoteEmailHtml(snapshot, url),
    text: quoteEmailText(snapshot, url),
    replyTo: snapshot.company.email || undefined,
    attachments: [{ filename: pdfFilename(snapshot.number, snapshot.rev), content: q.pdf }],
  })
  await sql`
    update quotes set sent_at = ${opts.now}, sent_to = ${to}, sent_rev = ${q.current_rev}, updated_at = now()
    where id = ${id}
  `
  return { to }
}
