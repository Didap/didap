import { randomBytes } from 'node:crypto'
import { createError } from 'h3'
import type postgres from 'postgres'
import { romeDate, romeYear } from '#shared/dates'
import { buildSnapshot, issueProblems, quoteNumber, type QuoteSnapshot } from '#shared/quote'
import { rowToClientInput } from './clients'
import { rowToDraft } from './quotes'
import { readSettings } from './settings'

// Conferma (emissione) di una revisione in una sola transazione: numero
// (solo la prima volta), snapshot e PDF. Ogni nuova revisione torna
// "confermata": se era firmata, la versione nuova va firmata di nuovo. Se qualcosa fallisce non resta nulla,
// né un numero consumato né una revisione a metà.

export type RenderPdf = (snapshot: QuoteSnapshot) => Promise<Buffer>

export async function issueQuote(sql: postgres.Sql, id: string, opts: { now: Date; render: RenderPdf }) {
  // Fuori dalla transazione: readSettings vuole il client, non tx
  const settings = await readSettings(sql)
  return sql.begin(async (tx) => {
    // Blocca il preventivo: due emissioni dello stesso vanno in fila
    const [q] = await tx`select * from quotes where id = ${id} for update`
    if (!q) throw createError({ statusCode: 404, statusMessage: 'Preventivo non trovato' })

    const draft = rowToDraft(q)
    const problems = issueProblems(draft, romeDate(opts.now))
    if (problems.length) {
      throw createError({ statusCode: 422, statusMessage: 'Preventivo incompleto', data: { problems } })
    }

    const [clientRow] = await tx`select * from clients where id = ${draft.clientId}`

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
      company: settings.company,
      content: draft.content,
      legalNotes: settings.contract.legalNotes,
    })
    let pdf: Buffer
    try {
      pdf = await opts.render(snapshot)
    }
    catch (err) {
      // La transazione torna indietro: nessun numero consumato
      console.error('[quotes/issue]', err)
      throw createError({ statusCode: 500, statusMessage: 'Generazione del PDF non riuscita' })
    }

    await tx`
      insert into quote_revisions (quote_id, rev, snapshot, pdf, issued_at)
      values (${id}, ${rev}, ${tx.json(snapshot)}, ${pdf}, ${opts.now})
    `
    await tx`
      update quotes set
        year = ${year}, seq = ${seq}, token = ${token}, current_rev = ${rev},
        issued_draft = ${tx.json(draft)},
        status = 'confirmed',
        updated_at = now()
      where id = ${id}
    `
    return { rev, number: snapshot.number, token }
  })
}
