import type { AdminUser } from '#shared/users'
import { accountEmail, accountLink } from '../emails/account'

// Emette un nuovo invito. Con Resend manda la mail e non restituisce il link;
// senza Resend, o se l'invio fallisce, restituisce il link da dare a mano.
export async function sendInvite(user: AdminUser): Promise<string | null> {
  const url = accountLink(await issueToken(await useDb(), user.id, 'invite'))
  if (!hasMailer()) return url
  try {
    await resendMailer()({ to: [user.email], ...accountEmail('invite', { name: user.name, url }) })
    return null
  }
  catch (err) {
    console.error('[admin/users/invite]', err)
    return url
  }
}
