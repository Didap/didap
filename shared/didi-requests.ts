import type { ContactKind, ProjectType } from './contact'
import type { DidiMessage } from './didi'

// Le richieste arrivate dalla chat con Didi, come le vede /admin/richieste

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

// Nell'elenco di /admin/richieste la conversazione non serve: arriva
// quando si apre la richiesta
export type DidiRequestItem = Omit<DidiRequest, 'transcript'>
