import type { AdminUser } from '#shared/users'
import { accountLink, sendAccountMail } from '../emails/account'

// Emette un nuovo invito. Con Resend manda la mail e non restituisce il link;
// senza Resend, o se l'invio fallisce, restituisce il link da dare a mano.
export async function sendInvite(user: AdminUser): Promise<string | null> {
  const token = await issueToken(await useDb(), user.id, 'invite')
  if (!hasMailer()) return accountLink(token)
  try {
    await sendAccountMail(user, 'invite', token)
    return null
  }
  catch (err) {
    console.error('[admin/users/invite]', err)
    return accountLink(token)
  }
}
