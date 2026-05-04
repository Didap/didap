import { Resend } from 'resend'
import { z } from 'zod'

const ContactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  company: z.string().max(200).optional().or(z.literal('')),
  projectType: z.string().max(120).optional().or(z.literal('')),
  fundingHelp: z
    .enum(['have_budget', 'need_help'])
    .optional()
    .or(z.literal('')),
  message: z.string().min(1).max(5000),
  consent: z.literal(true),
  // honeypot — must be empty
  website: z.string().max(0).optional().or(z.literal('')),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = ContactSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'INVALID_PAYLOAD',
      data: { issues: parsed.error.issues },
    })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'EMAIL_NOT_CONFIGURED',
    })
  }

  const resend = new Resend(apiKey)
  const data = parsed.data

  const fromAddress = process.env.RESEND_FROM ?? 'Didap <noreply@didap.it>'
  const toAddress = process.env.CONTACT_RECIPIENT ?? 'amministrazione@didap.it'

  const fundingLabel =
    data.fundingHelp === 'have_budget'
      ? 'Budget coperto'
      : data.fundingHelp === 'need_help'
        ? 'Vuole consiglio su finanza agevolata (The Qube)'
        : null

  const lines = [
    `Nome: ${data.name}`,
    `Email: ${data.email}`,
    data.company ? `Azienda: ${data.company}` : null,
    data.projectType ? `Tipo: ${data.projectType}` : null,
    fundingLabel ? `Finanza: ${fundingLabel}` : null,
    '',
    data.message,
  ].filter((l): l is string => l !== null)

  const result = await resend.emails.send({
    from: fromAddress,
    to: toAddress,
    replyTo: data.email,
    subject: `Nuovo contatto da didap.it — ${data.name}`,
    text: lines.join('\n'),
  })

  if (result.error) {
    throw createError({
      statusCode: 502,
      statusMessage: 'EMAIL_DELIVERY_FAILED',
      data: { error: result.error.message },
    })
  }

  return { ok: true, id: result.data?.id }
})
