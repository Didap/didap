/*
  Template email per il form di contatto.
  HTML inline-styled, table-based per Outlook, palette completa Didap
  e font stack progressive: Apple Mail/iOS prendono Bricolage+Inter via
  Google Fonts <link>; Gmail/Outlook/Yahoo fall-back su Helvetica Neue
  /Arial mantenendo gerarchia tipografica e identità di brand.
*/

interface ContactData {
  name: string
  email: string
  company?: string
  projectType?: string
  fundingHelp?: 'have_budget' | 'need_help' | ''
  message: string
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  product: 'Un prodotto su misura',
  saas: 'Un gestionale o SaaS',
  app: "Un'app mobile",
  site: 'Un sito',
  other: 'Altro',
}

const FUNDING_LABELS: Record<string, string> = {
  have_budget: 'Budget coperto',
  need_help: 'Vuole consiglio su finanza agevolata',
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]!,
  )
}

function nl2br(s: string) {
  return escapeHtml(s).replace(/\n/g, '<br>')
}

const SITE_URL = process.env.NUXT_PUBLIC_SITE_URL || 'https://didap.it'

// Palette
const C = {
  paper: '#fbf4e2',
  paperSoft: '#f3ead0',
  ink: '#141414',
  inkSoft: '#3a3a3a',
  accent: '#c8412c',
  gold: '#e2a52b',
  finance: '#2e5d4a',
  white: '#ffffff',
}

// Font stack
const FONT_DISPLAY =
  "'Bricolage Grotesque','Inter',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif"
const FONT_BODY =
  "'Inter',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif"

const HEAD = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Inter:wght@400;500;600&display=swap');
    a { color: ${C.accent}; }
    .hover-ink:hover { color: ${C.ink} !important; }
  </style>
</head>`

// Decorative 4-square palette mark (ink / accent / gold / finance)
const PALETTE_MARK = (size = 14) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td width="${size}" height="${size}" style="background:${C.ink};line-height:0;font-size:0;">&nbsp;</td>
    <td width="${size}" height="${size}" style="background:${C.accent};line-height:0;font-size:0;">&nbsp;</td>
    <td width="${size}" height="${size}" style="background:${C.gold};line-height:0;font-size:0;">&nbsp;</td>
    <td width="${size}" height="${size}" style="background:${C.finance};line-height:0;font-size:0;">&nbsp;</td>
  </tr>
</table>`

// Full-width 4-color stripe at very bottom
const PALETTE_STRIPE = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td width="25%" height="6" style="background:${C.ink};line-height:0;font-size:0;">&nbsp;</td>
    <td width="25%" height="6" style="background:${C.accent};line-height:0;font-size:0;">&nbsp;</td>
    <td width="25%" height="6" style="background:${C.gold};line-height:0;font-size:0;">&nbsp;</td>
    <td width="25%" height="6" style="background:${C.finance};line-height:0;font-size:0;">&nbsp;</td>
  </tr>
</table>`

const BRAND_HEADER = `
<tr>
  <td style="background:${C.paperSoft};padding:36px 40px 28px;text-align:center;">
    <img src="${SITE_URL}/logo_esteso.svg" alt="Didap" height="60" style="display:inline-block;height:60px;width:auto;border:0;outline:none;text-decoration:none;">
  </td>
</tr>
<tr>
  <td style="background:${C.paperSoft};padding:0 40px 28px;text-align:center;">
    <div style="display:inline-block;">${PALETTE_MARK(10)}</div>
  </td>
</tr>`

function brandFooter() {
  return `
<tr>
  <td style="background:${C.paperSoft};padding:28px 40px;text-align:center;">
    <p style="margin:0 0 6px;font-family:${FONT_DISPLAY};font-size:18px;font-weight:800;color:${C.ink};letter-spacing:-0.01em;line-height:1;">Didap</p>
    <p style="margin:0 0 14px;font-family:${FONT_BODY};font-size:13px;color:${C.inkSoft};">
      Free the monkey ·
      <a href="${SITE_URL}" style="color:${C.accent};text-decoration:none;font-weight:500;">didap.it</a>
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;border-collapse:collapse;">
      <tr><td>${PALETTE_MARK(8)}</td></tr>
    </table>
  </td>
</tr>
<tr>
  <td style="line-height:0;font-size:0;">${PALETTE_STRIPE}</td>
</tr>`
}

/* ----------------- Auto-reply utente ----------------- */

export function userAutoReplyHtml(d: ContactData) {
  const fundingBox =
    d.fundingHelp === 'need_help'
      ? `
      <tr>
        <td style="background:${C.white};padding:8px 40px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;background:${C.finance};border-radius:10px;">
            <tr>
              <td style="padding:22px 28px;">
                <p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:11px;font-weight:700;color:${C.paper};text-transform:uppercase;letter-spacing:3px;">Finanza agevolata</p>
                <p style="margin:0;font-family:${FONT_BODY};font-size:15px;line-height:1.5;color:${C.paper};">
                  Hai chiesto un consiglio sulla finanza agevolata: mettiamo in copia il team di <strong style="color:${C.gold};">The Qube</strong>, il nostro partner. Li sentirai a stretto giro.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
      : ''

  return `${HEAD}
<body style="margin:0;padding:0;background:${C.paper};font-family:${FONT_BODY};color:${C.ink};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Grazie ${escapeHtml(d.name)}, ti rispondiamo entro 2 giorni lavorativi.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.paper};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:${C.white};max-width:600px;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(20,20,20,0.06);">

          ${BRAND_HEADER}

          <tr>
            <td style="background:${C.white};padding:40px 40px 0;">
              <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;font-weight:700;color:${C.accent};text-transform:uppercase;letter-spacing:3px;">Messaggio ricevuto</p>
              <p style="margin:0;font-family:${FONT_DISPLAY};font-size:48px;font-weight:800;color:${C.ink};letter-spacing:-0.03em;line-height:1.05;">
                Ciao ${escapeHtml(d.name)}.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:${C.white};padding:24px 40px 8px;">
              <p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:17px;line-height:1.55;color:${C.ink};">
                Grazie per averci scritto. Abbiamo ricevuto il tuo messaggio e ti rispondiamo <strong style="color:${C.ink};">entro 2 giorni lavorativi</strong>.
              </p>
              <p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:17px;line-height:1.55;color:${C.ink};">
                Se ti viene in mente qualcosa da aggiungere - un link, un riferimento, un esempio - rispondi a questa email: arriva direttamente sulla nostra casella.
              </p>
            </td>
          </tr>

          ${fundingBox}

          <tr>
            <td style="background:${C.white};padding:24px 40px 32px;">
              <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:17px;color:${C.ink};">A presto,</p>
              <p style="margin:0;font-family:${FONT_DISPLAY};font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Il team Didap</p>
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

export function userAutoReplyText(d: ContactData) {
  const fundingNote =
    d.fundingHelp === 'need_help'
      ? '\nFinanza agevolata - Hai chiesto un consiglio sulla finanza agevolata: mettiamo in copia il team di The Qube, il nostro partner. Li sentirai a stretto giro.\n'
      : ''

  return `Ciao ${d.name},

grazie per averci scritto. Abbiamo ricevuto il tuo messaggio e ti rispondiamo entro 2 giorni lavorativi.

Se ti viene in mente qualcosa da aggiungere - un link, un riferimento, un esempio - rispondi a questa email: arriva direttamente sulla nostra casella.
${fundingNote}
A presto,
Il team Didap

-
Didap · Free the monkey · ${SITE_URL}`
}

/* ----------------- Notifica admin ----------------- */

export function adminNotificationHtml(d: ContactData) {
  const rows: Array<[string, string]> = [
    ['Nome', escapeHtml(d.name)],
    [
      'Email',
      `<a href="mailto:${encodeURIComponent(d.email)}" style="color:${C.accent};text-decoration:none;">${escapeHtml(d.email)}</a>`,
    ],
  ]
  if (d.company) rows.push(['Azienda', escapeHtml(d.company)])
  if (d.projectType)
    rows.push([
      'Tipo',
      escapeHtml(PROJECT_TYPE_LABELS[d.projectType] ?? d.projectType),
    ])
  if (d.fundingHelp && FUNDING_LABELS[d.fundingHelp])
    rows.push(['Finanza', escapeHtml(FUNDING_LABELS[d.fundingHelp])])

  const rowsHtml = rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:10px 16px 10px 0;font-family:${FONT_BODY};font-size:11px;font-weight:700;color:${C.inkSoft};text-transform:uppercase;letter-spacing:2px;vertical-align:top;white-space:nowrap;width:90px;">${k}</td>
        <td style="padding:10px 0;font-family:${FONT_BODY};font-size:15px;color:${C.ink};">${v}</td>
      </tr>`,
    )
    .join('')

  return `${HEAD}
<body style="margin:0;padding:0;background:${C.paper};font-family:${FONT_BODY};color:${C.ink};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.paper};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:${C.white};max-width:600px;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(20,20,20,0.06);">

          ${BRAND_HEADER}

          <tr>
            <td style="background:${C.white};padding:32px 32px 0;">
              <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;font-weight:700;color:${C.accent};text-transform:uppercase;letter-spacing:3px;">Nuovo contatto · didap.it</p>
              <p style="margin:0;font-family:${FONT_DISPLAY};font-size:32px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;line-height:1.15;">
                ${escapeHtml(d.name)} ti ha scritto
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:${C.white};padding:24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${rowsHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:${C.white};padding:8px 32px 16px;">
              <p style="margin:0 0 10px;font-family:${FONT_BODY};font-size:11px;font-weight:700;color:${C.inkSoft};text-transform:uppercase;letter-spacing:2px;">Messaggio</p>
              <div style="font-family:${FONT_BODY};font-size:15px;line-height:1.6;color:${C.ink};background:${C.paperSoft};padding:18px 22px;border-radius:10px;">${nl2br(d.message)}</div>
            </td>
          </tr>

          <tr>
            <td style="background:${C.white};padding:16px 32px 32px;">
              <a href="mailto:${encodeURIComponent(d.email)}" style="display:inline-block;background:${C.ink};color:${C.paper};font-family:${FONT_BODY};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;padding:14px 26px;border-radius:999px;text-decoration:none;">Rispondi a ${escapeHtml(d.name)}</a>
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

export function adminNotificationText(d: ContactData) {
  const lines: string[] = [
    `Nuovo contatto da didap.it`,
    ``,
    `Nome: ${d.name}`,
    `Email: ${d.email}`,
  ]
  if (d.company) lines.push(`Azienda: ${d.company}`)
  if (d.projectType)
    lines.push(`Tipo: ${PROJECT_TYPE_LABELS[d.projectType] ?? d.projectType}`)
  if (d.fundingHelp && FUNDING_LABELS[d.fundingHelp])
    lines.push(`Finanza: ${FUNDING_LABELS[d.fundingHelp]}`)
  lines.push('', d.message)
  return lines.join('\n')
}
