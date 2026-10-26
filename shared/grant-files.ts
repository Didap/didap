import { z } from 'zod'

// Cartella dei file di un bando: limiti, nomi e righe dell'elenco

export const MAX_FILE_BYTES = 10 * 1024 * 1024

// Niente barre, caratteri di controllo, "." e ".."
export const entryNameSchema = z
  .string()
  .trim()
  .min(1, 'Nome non valido')
  .max(200, 'Nome non valido')
  .refine(n => n !== '.' && n !== '..' && !/[/\\\p{Cc}]/u.test(n), 'Nome non valido')

export type EntryKind = 'folder' | 'file'

// fileCount: anche i file delle sottocartelle
export type FolderEntry = { id: string, name: string, createdAt: string, fileCount: number }

// uploadedBy: nome della persona, null se messo dal radar
export type FileEntry = {
  id: string
  name: string
  mime: string
  bytes: number
  createdAt: string
  uploadedBy: string | null
}

// path parte dalla cartella principale (id null, nome = titolo del bando)
export type FolderListing = {
  path: { id: string | null, name: string }[]
  folders: FolderEntry[]
  files: FileEntry[]
}

// Nome libero nella cartella: "visura.pdf" occupato dà "visura (2).pdf", poi (3).
// Confronto senza maiuscole; ".env" non ha estensione.
export function uniqueName(taken: Set<string>, name: string): string {
  const used = new Set([...taken].map(n => n.toLowerCase()))
  if (!used.has(name.toLowerCase())) return name
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})${ext}`
    if (!used.has(candidate.toLowerCase())) return candidate
  }
}
