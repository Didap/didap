import { Resend } from 'resend'
import { z } from 'zod'
import {
  adminNotificationHtml,
  adminNotificationText,
  userAutoReplyHtml,
  userAutoReplyText,
} from '../emails/contact-templates'

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

  // 1) Notifica admin (critica): replyTo punta all'utente che ha scritto,
  //    così rispondere dalla casella va direttamente a lui.
  const adminResult = await resend.emails.send({
    from: fromAddress,
    to: toAddress,
    replyTo: data.email,
    subject: `Nuovo contatto da didap.it — ${data.name}`,
    text: adminNotificationText(data),
    html: adminNotificationHtml(data),
  })

  if (adminResult.error) {
    throw createError({
      statusCode: 502,
      statusMessage: 'EMAIL_DELIVERY_FAILED',
      data: { error: adminResult.error.message },
    })
  }

  // 2) Auto-reply utente (best-effort): se Resend rifiuta l'indirizzo o
  //    l'invio fallisce per qualsiasi motivo, NON facciamo fallire la
  //    request — l'utente ha già completato la submission.
  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.email,
      replyTo: toAddress,
      subject: `Grazie ${data.name}, ti rispondiamo entro 2 giorni lavorativi`,
      text: userAutoReplyText(data),
      html: userAutoReplyHtml(data),
    })
  } catch (err) {
    console.error('[contact] auto-reply failed', err)
  }

  return { ok: true, id: adminResult.data?.id }
})
