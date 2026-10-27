import { createError } from 'h3'
import type postgres from 'postgres'
import type { DraftConflict, GrantDraft } from '#shared/grant-draft'
import type { FileStore } from './file-store'
import { startGrantFolder } from './grant-folder'
import { inTx } from './pg'

// Bozza della candidatura: una per bando, nel database (testo che cambia
// spesso, non va su Cloudinary). Pannello e Claude salvano "a partire dalla
// versione N" o "prima bozza": se nel frattempo ha salvato qualcun altro, 409
// con la bozza attuale e niente scritto. Così una correzione a mano non
// sparisce sotto una riscrittura fatta su un testo vecchio, e viceversa.
//
// `saveGrantDraft` e non `saveDraft`: Nitro importa da solo ogni export di
// server/utils e `saveDraft` c'è già, quello dei preventivi.

type Sql = postgres.Sql

type DraftRow = { content: string, version: number, saved_at: Date, saved_by: string, by_claude: boolean }

// maxCurrentChars: rifiuta (422) se la bozza salvata è più lunga, controllato
// sotto il lucchetto. Claude lavora solo su bozze che stanno in una risposta
export type GrantDraftInput = {
  grantId: string
  content: string
  baseVersion: number | null
  savedBy: string
  byClaude: boolean
  maxCurrentChars?: number
}

const notFound = () => createError({ statusCode: 404, statusMessage: 'Bando non trovato' })

const toDraft = (r: DraftRow): GrantDraft => ({
  content: r.content,
  version: r.version,
  savedAt: r.saved_at.toISOString(),
  savedBy: r.saved_by,
  byClaude: r.by_claude,
})

// La bozza del bando (null: non c'è ancora) e se il bando ha la cartella
export async function readDraftState(sql: Sql, grantId: string): Promise<{ draft: GrantDraft | null, hasFolder: boolean }> {
  const [row] = await sql<(DraftRow & { has_folder: boolean })[]>`
    select d.content, d.version, d.saved_at, d.saved_by, d.by_claude, g.folder_at is not null as has_folder
    from radar_grants g left join grant_drafts d on d.grant_id = g.id
    where g.id = ${grantId}
  `
  if (!row) throw notFound()
  return { draft: row.version == null ? null : toDraft(row), hasFolder: row.has_folder }
}

export async function readDraft(sql: Sql, grantId: string): Promise<GrantDraft | null> {
  return (await readDraftState(sql, grantId)).draft
}

// Salva il testo intero. Il lucchetto sulla riga del bando mette in fila i
// salvataggi dello stesso bando (anche la prima bozza, quando la riga della
// bozza non c'è ancora): il secondo vede la versione del primo e prende 409.
// Nella stessa transazione cartella e cuore, che proteggono il bando dalla
// pulizia del radar senza dipendere da Cloudinary.
export async function saveGrantDraft(sql: Sql, input: GrantDraftInput): Promise<{ draft: GrantDraft, folderCreated: boolean }> {
  const { grantId, content, baseVersion, savedBy, byClaude, maxCurrentChars } = input
  return inTx(sql, async (t) => {
    const [grant] = await t<{ folder_at: Date | null }[]>`select folder_at from radar_grants where id = ${grantId} for update`
    if (!grant) throw notFound()
    const [current] = await t<DraftRow[]>`
      select content, version, saved_at, saved_by, by_claude from grant_drafts where grant_id = ${grantId}
    `
    // Prima della versione: chi non può leggere la bozza non saprebbe che
    // farsene di un 409
    if (current && maxCurrentChars !== undefined && current.content.length > maxCurrentChars) {
      throw createError({ statusCode: 422, statusMessage: 'La bozza è troppo lunga' })
    }
    if ((current?.version ?? null) !== baseVersion) {
      // Versione dichiarata ma bozza assente: niente da mostrare, niente data
      const data: DraftConflict | undefined = current
        ? { version: current.version, savedAt: current.saved_at.toISOString(), savedBy: current.saved_by, byClaude: current.by_claude }
        : undefined
      throw createError({ statusCode: 409, statusMessage: 'La bozza è cambiata', data })
    }
    const [row] = await t<DraftRow[]>`
      insert into grant_drafts (grant_id, content, version, saved_by, by_claude)
      values (${grantId}, ${content}, ${(current?.version ?? 0) + 1}, ${savedBy}, ${byClaude})
      on conflict (grant_id) do update set content = excluded.content, version = excluded.version,
        saved_at = now(), saved_by = excluded.saved_by, by_claude = excluded.by_claude
      returning content, version, saved_at, saved_by, by_claude
    `
    await t`
      update radar_grants set folder_at = coalesce(folder_at, now()), liked_at = coalesce(liked_at, now())
      where id = ${grantId}
    `
    return { draft: toDraft(row!), folderCreated: grant.folder_at === null }
  })
}

// Salva e, se la cartella è nata ora e lo store c'è, la riempie come il
// bottone "Crea cartella del bando". Senza store (Cloudinary non
// configurato) la bozza si salva lo stesso: chi chiama passa useFileStore().
// Se il riempimento non parte la bozza è salvata comunque e lo si dice: l'errore
// va nel log, i file si riprendono con "Riprova" nella scheda File.
export async function saveDraftAndFill(
  sql: Sql,
  store: FileStore | null,
  input: GrantDraftInput,
  run?: (job: () => Promise<void>) => void,
): Promise<{ draft: GrantDraft, folderCreated: boolean }> {
  const saved = await saveGrantDraft(sql, input)
  if (saved.folderCreated && store) {
    try {
      await startGrantFolder(sql, store, input.grantId, run)
    }
    catch (err) {
      console.error(`[bozza] riempimento della cartella non partito (bando ${input.grantId})`, err)
    }
  }
  return saved
}
