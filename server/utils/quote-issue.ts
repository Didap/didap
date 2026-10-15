import { randomBytes } from 'node:crypto'
import { createError } from 'h3'
import type postgres from 'postgres'
import { romeYear } from '#shared/dates'
import { buildSnapshot, draftInputSchema, issueProblems, quoteNumber, type QuoteSnapshot } from '#shared/quote'
import { parseSettings } from '#shared/settings'
import { rowToClientInput } from './clients'

// Emissione di una revisione in una sola transazione: numero (solo la
// prima volta), snapshot e PDF. Se qualcosa fallisce non resta nulla,
// né un numero consumato né una revisione a metà.

export type RenderPdf = (snapshot: QuoteSnapshot) => Promise<Buffer>

export async function issueQuote(sql: postgres.Sql, id: string, opts: { now: Date; render: RenderPdf }) {
  return sql.begin(async (tx) => {
    // Blocca il preventivo: due emissioni dello stesso vanno in fila
    const [q] = await tx`select * from quotes where id = ${id} for update`
    if (!q) throw createError({ statusCode: 404, statusMessage: 'Preventivo non trovato' })

    const draft = draftInputSchema.parse({ title: q.title, clientId: q.client_id, content: q.draft })
    const problems = issueProblems(draft)
    if (problems.length) {
      throw createError({ statusCode: 422, statusMessage: 'Preventivo incompleto', data: { problems } })
    }

    const [clientRow] = await tx`select * from clients where id = ${draft.clientId}`
    const [settingsRow] = await tx`select data from settings where id = 1`

    let year: number = q.year
    let seq: number = q.seq
    let token: string = q.token
    if (q.current_rev === 0) {
      // La riga del contatore resta bloccata fino al commit: due prime
      // emissioni contemporanee prendono numeri diversi
      year = romeYear(opts.now)
      const [counter] = await tx`
        insert into quote_counters (year, last_seq) values (${year}, 1)
        on conflict (year) do update set last_seq = quote_counters.last_seq + 1
        returning last_seq
      `
      seq = counter!.last_seq
      token = randomBytes(32).toString('base64url')
    }

    const rev: number = q.current_rev + 1
    const snapshot = buildSnapshot({
      number: quoteNumber(year, seq),
      rev,
      now: opts.now,
      title: draft.title,
      clientId: draft.clientId!,
      client: rowToClientInput(clientRow!),
      company: parseSettings(settingsRow?.data).company,
      content: draft.content,
    })
    const pdf = await opts.render(snapshot)

    await tx`
      insert into quote_revisions (quote_id, rev, snapshot, pdf, issued_at)
      values (${id}, ${rev}, ${tx.json(snapshot)}, ${pdf}, ${opts.now})
    `
    await tx`
      update quotes set
        year = ${year}, seq = ${seq}, token = ${token}, current_rev = ${rev},
        issued_draft = ${tx.json(draft)},
        status = case when status = 'draft' then 'sent' else status end,
        updated_at = now()
      where id = ${id}
    `
    return { rev, number: snapshot.number, token }
  })
}
