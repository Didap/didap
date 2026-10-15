import { z } from 'zod'
import { MAX_CENTS } from './money'
import { text } from './text'

// Impostazioni dei preventivi: dati di Didap stampati nei documenti e
// valori di partenza copiati in ogni nuova bozza.

export const companySchema = z
  .object({
    name: text(200),
    vatNumber: text(40),
    taxCode: text(40),
    address: text(500),
    email: text(200),
    phone: text(60),
    iban: text(60),
  })
  .strict()

export const settingsSchema = z
  .object({
    company: companySchema,
    defaults: z
      .object({
        dayRate: z.number().int().min(0).max(MAX_CENTS),
        vatRate: z.number().min(0).max(100),
        validityDays: z.number().int().min(1).max(365),
        paymentTerms: text(5000),
        exclusions: text(5000),
        notes: text(5000),
      })
      .strict(),
  })
  .strict()

export type Company = z.infer<typeof companySchema>
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  company: { name: 'Didap', vatNumber: '', taxCode: '', address: '', email: '', phone: '', iban: '' },
  defaults: { dayRate: 0, vatRate: 22, validityDays: 30, paymentTerms: '', exclusions: '', notes: '' },
}

// Niente salvato, o salvato con uno schema vecchio: si riparte dai default
export function parseSettings(data: unknown): Settings {
  const parsed = settingsSchema.safeParse(data)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}
