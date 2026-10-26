import { z } from 'zod'
import { emailSchema } from '#shared/users'
import { sendAccountMail } from '../../../emails/account'

// Richiesta di reset: risponde sempre ok, così non rivela chi ha un account.
// Gli errori d'invio finiscono solo nel log.
const forgotSchema = z.object({ email: emailSchema })

export default defineEventHandler(async (event) => {
  rateLimit('forgot', event, { max: 5, windowMs: 10 * 60 * 1000 })
  const { email } = await readSchemaBody(event, forgotSchema)
  // Senza mailer nessun token nuovo: cancellerebbe un invito passato a mano
  if (!hasMailer()) return { ok: true }
  try {
    const found = await requestReset(await useDb(), email)
    if (found) {
      // Chi non ha ancora una password riceve di nuovo l'invito. Senza
      // attendere l'invio: il tempo di risposta non dice se l'email esiste
      sendAccountMail(found.user, found.kind, found.token)
        .catch(err => console.error('[admin/password/forgot]', err))
    }
  }
  catch (err) {
    console.error('[admin/password/forgot]', err)
  }
  return { ok: true }
})
