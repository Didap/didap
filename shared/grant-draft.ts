import { z } from 'zod'
import { titleSlug } from './radar'

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

// ---------- nel pannello ----------

// Chi ha salvato: "Ale", o "Ale via Claude"
export const draftAuthor = (d: { savedBy: string, byClaude: boolean }) => d.byClaude ? `${d.savedBy} via Claude` : d.savedBy

// "Scarica": bozza-<titolo del bando>.md, come bando-<titolo>.md di "Esporta per Claude"
export const draftFileName = (title: string, grantId: string) => `bozza-${titleSlug(title) || grantId}.md`

// Il campo di testo del browser dà sempre a capo semplici: la bozza salvata
// da Claude con \r\n non deve sembrare già modificata
export const normalizeDraft = (text: string) => text.replace(/\r\n?/g, '\n')

const AFTER_CONFLICT = 'Copia le tue modifiche, ricarica e riapplicale.'

// Salvataggio rifiutato (409): chi ha salvato nel frattempo e quando, l'ora
// sola se è oggi. Senza `data` (versione dichiarata ma bozza sparita) una
// frase generica. timeZone: quella del browser se non detta (i test la fissano).
export function draftConflictText(c: DraftConflict | null | undefined, now: Date, timeZone?: string): string {
  if (!c) return `La bozza è stata cambiata da qualcun altro. ${AFTER_CONFLICT}`
  const at = new Date(c.savedAt)
  const day = (d: Date) => d.toLocaleDateString('it-IT', { timeZone })
  const time = at.toLocaleTimeString('it-IT', { timeZone, hour: '2-digit', minute: '2-digit' })
  const when = day(at) === day(now) ? `alle ${time}` : `il ${at.toLocaleDateString('it-IT', { timeZone, day: 'numeric', month: 'numeric', year: '2-digit' })} alle ${time}`
  return `La bozza è stata cambiata da ${draftAuthor(c)} ${when}. ${AFTER_CONFLICT}`
}
