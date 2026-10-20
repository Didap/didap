import { formatDate } from '#shared/dates'
import { formatEuro } from '#shared/money'
import type { QuoteSnapshot } from '#shared/quote'
import { BRAND_HEADER, brandFooter, C, escapeHtml, FONT_BODY, FONT_DISPLAY, HEAD } from './contact-templates'

// Mail al cliente con il preventivo confermato: PDF allegato e link alla
// pagina online. Stesso guscio delle altre mail di Didap.

export const quoteEmailSubject = (s: QuoteSnapshot) =>
  `Preventivo ${s.number}${s.title ? ` - ${s.title}` : ''}`

const greeting = (s: QuoteSnapshot) => `Gentile ${s.client.contactName || s.client.name},`

const validity = (s: QuoteSnapshot) => (s.content.validUntil ? formatDate(s.content.validUntil) : '')

export function quoteEmailHtml(s: QuoteSnapshot, url: string) {
  const p = (html: string) =>
    `<p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:16px;line-height:1.55;color:${C.ink};">${html}</p>`
  return `${HEAD}
<body style="margin:0;padding:0;background:${C.paper};font-family:${FONT_BODY};color:${C.ink};-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.paper};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:${C.white};max-width:600px;border-radius:16px;overflow:hidden;">
          ${BRAND_HEADER}
          <tr>
            <td style="background:${C.white};padding:36px 40px 8px;">
              <p style="margin:0 0 20px;font-family:${FONT_DISPLAY};font-size:30px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;line-height:1.1;">Preventivo ${escapeHtml(s.number)}</p>
              ${p(escapeHtml(greeting(s)))}
              ${p(`in allegato trova il nostro preventivo${s.title ? ` per <strong>${escapeHtml(s.title)}</strong>` : ''}, per un totale di <strong>${formatEuro(s.totals.total)}</strong> IVA inclusa${validity(s) ? `, valido fino al ${validity(s)}` : ''}.`)}
              ${p('Per accettarlo, lo firmi negli spazi in fondo al documento e ce lo rimandi rispondendo a questa mail.')}
            </td>
          </tr>
          <tr>
            <td style="background:${C.white};padding:4px 40px 32px;">
              <a href="${escapeHtml(url)}" style="display:inline-block;background:${C.ink};color:${C.white};font-family:${FONT_BODY};font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:999px;">Vedi il preventivo online</a>
            </td>
          </tr>
          <tr>
            <td style="background:${C.white};padding:0 40px 32px;">
              ${p(`Un saluto,<br><strong>${escapeHtml(s.company.name)}</strong>`)}
            </td>
          </tr>
          ${brandFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function quoteEmailText(s: QuoteSnapshot, url: string) {
  return `${greeting(s)}

in allegato trova il nostro preventivo ${s.number}${s.title ? ` per ${s.title}` : ''}, per un totale di ${formatEuro(s.totals.total)} IVA inclusa${validity(s) ? `, valido fino al ${validity(s)}` : ''}.

Per accettarlo, lo firmi negli spazi in fondo al documento e ce lo rimandi rispondendo a questa mail.

Il preventivo online: ${url}

Un saluto,
${s.company.name}
`
}
