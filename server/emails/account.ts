import { resendMailer } from '../utils/mail'
import { BRAND_HEADER, brandFooter, C, escapeHtml, FONT_BODY, FONT_DISPLAY, HEAD, SITE_URL } from './contact-templates'

// Mail d'invito e di reset della password del pannello. Stesso guscio
// delle mail del radar.

type Kind = 'invite' | 'reset'

const COPY: Record<Kind, { label: string, subject: (name: string) => string, intro: string, cta: string, validity: string }> = {
  invite: {
    label: 'Invito',
    subject: name => `${name}, il tuo accesso al pannello Didap`,
    intro: 'Ti abbiamo dato accesso al pannello di Didap. Scegli una password per entrare.',
    cta: 'Scegli la password',
    validity: 'Il link vale 7 giorni e si può usare una volta sola.',
  },
  reset: {
    label: 'Password',
    subject: name => `${name}, reimposta la password del pannello Didap`,
    intro: 'Hai chiesto di reimpostare la password del pannello di Didap. Scegline una nuova dal link qui sotto.',
    cta: 'Reimposta la password',
    validity: 'Il link vale 1 ora e si può usare una volta sola. Se non l\'hai chiesto tu, ignora questa mail.',
  },
}

// Sempre sul dominio del sito, mai sull'Host della richiesta (forgot è pubblico)
export function accountLink(token: string) {
  return `${SITE_URL.replace(/\/$/, '')}/admin/password?token=${token}`
}

export function accountEmail(kind: Kind, opts: { name: string, url: string }) {
  const copy = COPY[kind]
  const url = escapeHtml(opts.url)
  const html = `${HEAD}
<body style="margin:0;padding:0;background:${C.paper};font-family:${FONT_BODY};color:${C.ink};-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.paper};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:${C.white};max-width:600px;border-radius:16px;overflow:hidden;">
          ${BRAND_HEADER}
          <tr>
            <td style="background:${C.white};padding:36px 40px 24px;">
              <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;font-weight:700;color:${C.accent};text-transform:uppercase;letter-spacing:3px;">${copy.label}</p>
              <p style="margin:0 0 12px;font-family:${FONT_DISPLAY};font-size:32px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;line-height:1.1;">Ciao ${escapeHtml(opts.name)}.</p>
              <p style="margin:0;font-family:${FONT_BODY};font-size:16px;line-height:1.5;color:${C.ink};">${copy.intro}</p>
            </td>
          </tr>
          <tr>
            <td style="background:${C.white};padding:0 40px 24px;">
              <a href="${url}" style="display:inline-block;background:${C.ink};color:${C.white};font-family:${FONT_BODY};font-size:15px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:10px;">${copy.cta}</a>
            </td>
          </tr>
          <tr>
            <td style="background:${C.white};padding:0 40px 32px;">
              <p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.inkSoft};">${copy.validity}</p>
              <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.5;color:${C.inkSoft};word-break:break-all;">Se il bottone non funziona, apri questo indirizzo: <a href="${url}" style="color:${C.accent};">${url}</a></p>
            </td>
          </tr>
          ${brandFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  const text = `Ciao ${opts.name},

${copy.intro}

${copy.cta}: ${opts.url}

${copy.validity}
`
  return { subject: copy.subject(opts.name), html, text }
}

// Manda alla persona la mail col link del token (invito o reset)
export function sendAccountMail(user: { name: string, email: string }, kind: Kind, token: string): Promise<void> {
  return resendMailer()({ to: [user.email], ...accountEmail(kind, { name: user.name, url: accountLink(token) }) })
}
