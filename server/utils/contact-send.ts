import { createError } from 'h3'
import { CONTACT_EMAIL } from '#shared/contact'
import {
  adminNotificationHtml,
  adminNotificationText,
  type ContactData,
  userAutoReplyHtml,
  userAutoReplyText,
} from '../emails/contact-templates'

// Il contatto arrivato dal sito: dal modulo o dalla chat con Didi
// (`source`, che cambia l'oggetto della mail). Prima la notifica a noi,
// che è quella che conta; poi, solo per il modulo, la risposta automatica
// a chi ha scritto, se ha lasciato un'email: a chi parla con Didi la
// conferma la dà Didi nella chat.
export async function sendContact(data: ContactData, { source = 'form' }: { source?: 'form' | 'didi' } = {}) {
  if (!hasMailer()) {
    throw createError({ statusCode: 503, statusMessage: 'EMAIL_NOT_CONFIGURED' })
  }

  const resend = resendClient()
  const email = data.contact.kind === 'email' ? data.contact.value : undefined
  const fromAddress = mailFrom()
  const toAddress = process.env.CONTACT_RECIPIENT ?? CONTACT_EMAIL

  // 1) Notifica admin (critica): con un'email, replyTo punta all'utente
  //    che ha scritto, così rispondere dalla casella va direttamente a lui.
  const adminResult = await resend.emails.send({
    from: fromAddress,
    to: toAddress,
    replyTo: email,
    subject: source === 'didi'
      ? `Nuova idea da Didi su didap.it - ${data.name}`
      : `Nuovo contatto da didap.it - ${data.name}`,
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
  if (email && source === 'form') {
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

  return { id: adminResult.data?.id }
}
