import { formatWholeEuro } from '#shared/money'
import { ELIGIBILITY_LABELS, SOURCE_LABELS, type EvaluatedGrant } from '#shared/radar'
import { BRAND_HEADER, brandFooter, C, escapeHtml, FONT_BODY, FONT_DISPLAY, HEAD, SITE_URL } from './contact-templates'

// Mail di riepilogo del radar: bandi nuovi candidabili, poi quelli con
// requisiti da verificare. Stesso guscio delle mail del form contatti.

const SETTINGS_URL = `${SITE_URL}/admin/bandi`

const headline = (n: number) => (n === 1 ? '1 bando nuovo per te' : `${n} bandi nuovi per te`)

export const digestSubject = (grants: EvaluatedGrant[]) => `Radar bandi: ${headline(grants.length)}`

// Scadenza, importo e agevolazione: le stesse righe in HTML e in testo
function facts(g: EvaluatedGrant): [string, string][] {
  const deadline = g.deadline
    ? new Date(g.deadline).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric' })
    : 'a sportello / non indicata'
  const rows: [string, string][] = [['Scadenza', deadline]]
  if (g.maxAmount) rows.push(['Fino a', formatWholeEuro(g.maxAmount)])
  if (g.funding) rows.push(['Agevolazione', g.funding])
  return rows
}

const toVerify = (g: EvaluatedGrant) => g.requirements.filter((_, i) => g.evaluations[i]!.outcome === 'to_verify')

function grantHtml(g: EvaluatedGrant) {
  const pill = g.eligibility === 'eligible' ? C.finance : C.gold
  const row = ([label, value]: [string, string]) =>
    `<p style="margin:0 0 4px;font-family:${FONT_BODY};font-size:14px;color:${C.ink};"><strong>${label}:</strong> ${escapeHtml(value)}</p>`
  const toCheck = toVerify(g).map(r => `<li style="margin:0 0 4px;">${escapeHtml(r.label)}</li>`).join('')
  return `
<tr>
  <td style="background:${C.white};padding:0 40px 20px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;border:1px solid #e8e1cc;border-radius:12px;">
      <tr>
        <td style="padding:20px 22px;">
          <p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:11px;font-weight:700;color:${pill};text-transform:uppercase;letter-spacing:2px;">${ELIGIBILITY_LABELS[g.eligibility]} · ${escapeHtml(SOURCE_LABELS[g.source] ?? g.source)}</p>
          <p style="margin:0 0 6px;font-family:${FONT_DISPLAY};font-size:19px;font-weight:800;line-height:1.25;color:${C.ink};">${escapeHtml(g.title)}</p>
          <p style="margin:0 0 10px;font-family:${FONT_BODY};font-size:13px;color:${C.inkSoft};">${escapeHtml(g.issuer)}</p>
          <p style="margin:0 0 12px;font-family:${FONT_BODY};font-size:15px;line-height:1.5;color:${C.ink};">${escapeHtml(g.summary)}</p>
          ${facts(g).map(row).join('')}
          ${toCheck ? `<p style="margin:12px 0 4px;font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${C.ink};">Da verificare:</p><ul style="margin:0;padding-left:18px;font-family:${FONT_BODY};font-size:13px;color:${C.inkSoft};">${toCheck}</ul>` : ''}
          <p style="margin:14px 0 0;font-family:${FONT_BODY};font-size:14px;"><a href="${escapeHtml(g.url)}" style="color:${C.accent};font-weight:600;">Apri il bando</a></p>
        </td>
      </tr>
    </table>
  </td>
</tr>`
}

export function digestHtml(grants: EvaluatedGrant[]) {
  const eligible = grants.filter(g => g.eligibility === 'eligible').length
  const intro = eligible === grants.length
    ? 'Il radar ha trovato bandi nuovi compatibili con i parametri impostati.'
    : `Il radar ha trovato bandi nuovi: ${eligible} compatibili con i parametri, gli altri hanno requisiti da controllare a mano.`
  return `${HEAD}
<body style="margin:0;padding:0;background:${C.paper};font-family:${FONT_BODY};color:${C.ink};-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.paper};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:${C.white};max-width:600px;border-radius:16px;overflow:hidden;">
          ${BRAND_HEADER}
          <tr>
            <td style="background:${C.white};padding:36px 40px 24px;">
              <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;font-weight:700;color:${C.accent};text-transform:uppercase;letter-spacing:3px;">Radar bandi</p>
              <p style="margin:0 0 12px;font-family:${FONT_DISPLAY};font-size:32px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;line-height:1.1;">${headline(grants.length)}</p>
              <p style="margin:0;font-family:${FONT_BODY};font-size:16px;line-height:1.5;color:${C.ink};">${intro}</p>
            </td>
          </tr>
          ${grants.map(grantHtml).join('')}
          <tr>
            <td style="background:${C.white};padding:4px 40px 32px;">
              <p style="margin:0;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.inkSoft};">Parametri, destinatari e frequenza si cambiano dal <a href="${SETTINGS_URL}" style="color:${C.accent};">pannello del radar</a>.</p>
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

export function digestText(grants: EvaluatedGrant[]) {
  const blocks = grants.map(g => [
    `${ELIGIBILITY_LABELS[g.eligibility].toUpperCase()} - ${g.title}`,
    g.issuer,
    g.summary,
    ...facts(g).map(([label, value]) => `${label}: ${value}`),
    ...toVerify(g).map(r => `Da verificare: ${r.label}`),
    g.url,
  ].filter(Boolean).join('\n'))
  return `${digestSubject(grants)}\n\n${blocks.join('\n\n')}\n\nPannello: ${SETTINGS_URL}\n`
}
