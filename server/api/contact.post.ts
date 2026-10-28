import { z } from 'zod'
import { CONTACT_EMAIL, PROJECT_TYPES, contactKind } from '#shared/contact'
import { text } from '#shared/text'
import {
  adminNotificationHtml,
  adminNotificationText,
  userAutoReplyHtml,
  userAutoReplyText,
} from '../emails/contact-templates'

const ContactSchema = z.object({
  name: text(120).min(1),
  // Email o telefono, in un campo solo
  contact: text(200).refine((v) => contactKind(v) !== null),
  projectType: z.enum(PROJECT_TYPES).optional().or(z.literal('')),
  message: text(5000).min(1),
  // honeypot - must be empty
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

  if (!hasMailer()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'EMAIL_NOT_CONFIGURED',
    })
  }

  const resend = resendClient()
  const { contact, ...rest } = parsed.data
  const email = contactKind(contact) === 'email' ? contact : undefined
  const data = { ...rest, email, phone: email ? undefined : contact }

  const fromAddress = mailFrom()
  const toAddress = process.env.CONTACT_RECIPIENT ?? CONTACT_EMAIL

  // 1) Notifica admin (critica): con un'email, replyTo punta all'utente
  //    che ha scritto, così rispondere dalla casella va direttamente a lui.
  const adminResult = await resend.emails.send({
    from: fromAddress,
    to: toAddress,
    replyTo: email,
    subject: `Nuovo contatto da didap.it - ${data.name}`,
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

  // 2) Auto-reply utente (best-effort, solo a chi ha lasciato un'email):
  //    se Resend rifiuta l'indirizzo o l'invio fallisce per qualsiasi
  //    motivo, NON facciamo fallire la request - l'utente ha già
  //    completato la submission.
  if (email) {
    try {
      await resend.emails.send({
        from: fromAddress,
        to: email,
        replyTo: toAddress,
        subject: `Grazie ${data.name}, ti rispondiamo entro 2 giorni lavorativi`,
        text: userAutoReplyText(data),
        html: userAutoReplyHtml(data),
      })
    } catch (err) {
      console.error('[contact] auto-reply failed', err)
    }
  }

  return { ok: true, id: adminResult.data?.id }
})
