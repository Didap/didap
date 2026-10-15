import { z } from 'zod'
import { text } from './text'

// Anagrafica clienti dei preventivi

export const clientInputSchema = z
  .object({
    name: text(200).min(1, 'Ragione sociale obbligatoria'),
    vatNumber: text(40),
    taxCode: text(40),
    address: text(500),
    sdiPec: text(200),
    contactName: text(200),
    email: text(200),
    phone: text(60),
    notes: text(5000),
  })
  .strict()

export type ClientInput = z.infer<typeof clientInputSchema>
export type Client = ClientInput & { id: string }

export const emptyClient = (): ClientInput => ({
  name: '',
  vatNumber: '',
  taxCode: '',
  address: '',
  sdiPec: '',
  contactName: '',
  email: '',
  phone: '',
  notes: '',
})
