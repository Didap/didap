import { Resend } from 'resend'

// Invio mail con Resend: form contatti e radar bandi. Senza RESEND_API_KEY
// le mail non partono e chi le usa risponde 503.

export const hasMailer = () => !!process.env.RESEND_API_KEY
export const mailFrom = () => process.env.RESEND_FROM ?? 'Didap <noreply@didap.it>'
export const resendClient = () => new Resend(process.env.RESEND_API_KEY)

export type Mail = {
  to: string[]
  subject: string
  html: string
  text: string
  replyTo?: string
  attachments?: { filename: string, content: Buffer }[]
}
export type Mailer = (mail: Mail) => Promise<void>

export function resendMailer(): Mailer {
  const resend = resendClient()
  const from = mailFrom()
  return async (mail) => {
    const { error } = await resend.emails.send({ from, ...mail })
    if (error) throw new Error(`Invio non riuscito: ${error.message}`)
  }
}
