import { z } from 'zod'

// Bozza della candidatura: una per bando, in Markdown, condivisa tra il
// pannello e Claude. Ogni salvataggio dice da che versione parte (null:
// prima bozza); se nel frattempo qualcuno ha salvato, è rifiutato.

export const MAX_DRAFT_CHARS = 200_000

// savedBy: nome di chi ha salvato, fissato al salvataggio (byClaude: tramite Claude)
export type GrantDraft = { content: string, version: number, savedAt: string, savedBy: string, byClaude: boolean }

export const draftSaveSchema = z.object({
  content: z.string().max(MAX_DRAFT_CHARS, `Bozza oltre ${MAX_DRAFT_CHARS} caratteri`),
  baseVersion: z.number().int().min(1).nullable(),
}).strict()

export type DraftSave = z.infer<typeof draftSaveSchema>

// Il `data` del 409: la bozza attuale, senza testo
export type DraftConflict = { version: number, savedAt: string, savedBy: string, byClaude: boolean }
