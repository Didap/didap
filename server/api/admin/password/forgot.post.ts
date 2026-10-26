import { z } from 'zod'
import { emailSchema } from '#shared/users'
import { accountEmail, accountLink } from '../../../emails/account'

// Richiesta di reset: risponde sempre ok, così non rivela chi ha un account.
// Gli errori d'invio finiscono solo nel log.
const forgotSchema = z.object({ email: emailSchema })

export default defineEventHandler(async (event) => {
  rateLimit('forgot', event, { max: 5, windowMs: 10 * 60 * 1000 })
  const { email } = await readSchemaBody(event, forgotSchema)
  try {
    const found = await requestReset(await useDb(), email)
    if (found && hasMailer()) {
      const mail = accountEmail('reset', { name: found.user.name, url: accountLink(found.token) })
      // Senza attendere l'invio: il tempo di risposta non dice se l'email esiste
      resendMailer()({ to: [found.user.email], ...mail })
        .catch(err => console.error('[admin/password/forgot]', err))
    }
  }
  catch (err) {
    console.error('[admin/password/forgot]', err)
  }
  return { ok: true }
})
