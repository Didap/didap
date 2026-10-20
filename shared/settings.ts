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

// Una sezione alla volta, un campo alla volta: il valore salvato resta se
// lo schema del campo lo accetta, altrimenti si usa il default. Un cambio
// di schema non cancella i dati di Didap; le chiavi sconosciute cadono.
export function mergeSection<T extends Record<string, unknown>>(
  shape: Record<string, { safeParse(v: unknown): { success: boolean; data?: unknown } }>,
  stored: unknown,
  defaults: T,
): T {
  const source = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {}
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(shape)) {
    const parsed = shape[key]!.safeParse(source[key])
    out[key] = parsed.success ? parsed.data : defaults[key]
  }
  return out as T
}

// Niente salvato, o salvato con uno schema vecchio: i campi non validi
// ripartono dai default, gli altri restano
export function parseSettings(data: unknown): Settings {
  const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  return {
    company: mergeSection(companySchema.shape, source.company, DEFAULT_SETTINGS.company),
    defaults: mergeSection(settingsSchema.shape.defaults.shape, source.defaults, DEFAULT_SETTINGS.defaults),
  }
}
