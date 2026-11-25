import type { ContactKind, ProjectType } from './contact'

// Le richieste arrivate dalla chat con Didi, come le vede /admin/richieste

export type DidiMessage = { role: 'user' | 'assistant', content: string }

export const REQUEST_STATUSES = ['new', 'done'] as const
export type RequestStatus = typeof REQUEST_STATUSES[number]

export interface DidiRequest {
  id: string
  name: string
  contact: string
  contactKind: ContactKind
  projectType: ProjectType | ''
  // L'idea del cliente spiegata dal modello, per il team
  summary: string
  transcript: DidiMessage[]
  locale: string
  // La notifica per email è partita
  emailSent: boolean
  status: RequestStatus
  createdAt: string
}
