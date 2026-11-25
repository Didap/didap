import { z } from 'zod'
import { PROJECT_TYPES, contactKind } from '#shared/contact'
import { text } from '#shared/text'

const ContactSchema = z.object({
  name: text(120).min(1),
  // Email o telefono, in un campo solo: con il tipo accanto
  contact: text(200).transform((value, ctx) => {
    const kind = contactKind(value)
    if (kind) return { value, kind }
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Email o telefono non valido' })
    return z.NEVER
  }),
  projectType: z.enum(PROJECT_TYPES).optional().or(z.literal('')),
  message: text(5000).min(1),
  // honeypot - must be empty
  website: z.string().max(0).optional().or(z.literal('')),
})

export default defineEventHandler(async (event) => {
  const data = await readSchemaBody(event, ContactSchema)
  const { id } = await sendContact(data)
  return { ok: true, id }
})
