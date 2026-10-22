import pdfmake from 'pdfmake'
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces'
import { formatDate } from '#shared/dates'
import { formatDecimal, formatEuro } from '#shared/money'
import { clientAddressLines, discountLabel, extraSections, itemAmount, type QuotePhase, type QuoteSnapshot } from '#shared/quote'

// PDF del preventivo, costruito con pdfmake dallo snapshot di una revisione.
// Font e logo arrivano da fuori (loadPdfAssets in Nitro, file nei test).

export type PdfAssets = {
  logoSvg: string
  sans: { normal: Buffer; bold: Buffer }
  // Obviously Wide per la parola "Preventivo"; senza, si usa sans bold
  wide: Buffer | null
  mono: { normal: Buffer; bold: Buffer }
}

// Oltre questo tempo il render fallisce e la transazione torna indietro
const PDF_TIMEOUT_MS = 20_000

const C = {
  ink: '#161412',
  muted: '#6f6a64',
  cream: '#fffbf2',
  green: '#2e5d4a',
  paper: '#fffbf2',
}

// Niente download né file locali: font e immagini passano solo dal
// file system virtuale di pdfmake
pdfmake.setUrlAccessPolicy(() => false)
pdfmake.setLocalAccessPolicy(() => false)

// pdfmake legge i font da un file system virtuale globale (non tipizzato
// in @types/pdfmake): ogni buffer si registra una volta con un nome suo
const vfs = (pdfmake as unknown as { virtualfs: { writeFileSync(name: string, data: Buffer): void } }).virtualfs
const vfsNames = new WeakMap<Buffer, string>()
let vfsCount = 0

function vfsName(data: Buffer) {
  let name = vfsNames.get(data)
  if (!name) {
    name = `font-${++vfsCount}`
    vfs.writeFileSync(name, data)
    vfsNames.set(data, name)
  }
  return name
}

function family(normal: Buffer, bold: Buffer) {
  const n = vfsName(normal)
  const b = vfsName(bold)
  return { normal: n, bold: b, italics: n, bolditalics: b }
}

const lines = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join('\n')

const money = (cents: number, extra: Record<string, unknown> = {}): TableCell => ({
  text: formatEuro(cents),
  font: 'Mono',
  alignment: 'right',
  noWrap: true,
  ...extra,
})

function phaseBlock(phase: QuotePhase, subtotal: number, index: number): Content[] {
  const head: TableCell[] = ['Descrizione', 'Giorni', 'Tariffa', 'Importo'].map((label, i) => ({
    text: label,
    style: 'th',
    alignment: i ? 'right' : 'left',
  }))
  const rows: TableCell[][] = phase.items.map((item) =>
    item.kind === 'days'
      ? [item.description, { text: formatDecimal(item.days), font: 'Mono', alignment: 'right' }, money(item.rate), money(itemAmount(item))]
      : [item.description, '', { text: 'a corpo', alignment: 'right', color: C.muted }, money(item.amount)],
  )
  return [
    { text: `${index + 1}. ${phase.title}`, style: 'h2' },
    ...(phase.description ? [{ text: phase.description, margin: [0, 0, 0, 6] } as Content] : []),
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: ['*', 42, 72, 80],
        body: [
          head,
          ...rows,
          [{ text: 'Subtotale fase', colSpan: 3, alignment: 'right', bold: true }, '', '', money(subtotal, { bold: true })],
        ],
      },
      layout: 'lightHorizontalLines',
    },
  ]
}

function summaryBlock(s: QuoteSnapshot): Content {
  const t = s.totals
  const d = s.content.discount
  const rows: TableCell[][] = [['Imponibile', money(t.subtotal)]]
  if (t.discount > 0) {
    rows.push([discountLabel(d), money(-t.discount)])
    rows.push(['Imponibile scontato', money(t.taxable)])
  }
  rows.push([`IVA ${formatDecimal(s.content.vatRate)}%`, money(t.vat)])
  const strong = { bold: true, fontSize: 12, color: C.paper, fillColor: C.green }
  rows.push([{ text: 'Totale', ...strong }, money(t.total, strong)])
  return {
    columns: [
      { width: '*', text: '' },
      { width: 240, table: { widths: ['*', 'auto'], body: rows }, layout: 'noBorders' },
    ],
    margin: [0, 22, 0, 0],
    unbreakable: true,
  }
}

// Spazio per le firme in fondo al documento: Didap e cliente, data e firma
function signatureLine(label: string): Content {
  return {
    stack: [
      { text: label, fontSize: 8, color: C.muted, margin: [0, 18, 0, 14] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.6, lineColor: C.muted }] },
    ],
  }
}

function signatureBlock(s: QuoteSnapshot): Content {
  const party = (title: string, name: string): Content => ({
    stack: [
      { text: title, bold: true },
      { text: name, fontSize: 8.5, color: C.muted },
      signatureLine('Data'),
      signatureLine('Firma'),
    ],
  })
  return {
    columns: [
      party(`Per ${s.company.name}`, ''),
      party('Per accettazione, il Cliente', s.client.name),
    ],
    columnGap: 40,
    margin: [0, 28, 0, 0],
    unbreakable: true,
  }
}

export function buildQuoteDoc(s: QuoteSnapshot, logoSvg: string): TDocumentDefinitions {
  const { company, client: c, content } = s
  const body: Content[] = [
    {
      columns: [
        { svg: logoSvg, width: 120 },
        {
          text: lines(
            company.name,
            company.address,
            company.vatNumber && `P.IVA ${company.vatNumber}`,
            company.taxCode && `C.F. ${company.taxCode}`,
            company.email,
            company.phone,
          ),
          alignment: 'right',
          fontSize: 8,
          color: C.muted,
        },
      ],
    },
    { text: 'Preventivo', font: 'Wide', bold: true, fontSize: 28, margin: [0, 28, 0, 6] },
    {
      columns: [
        { text: [{ text: 'N. ', color: C.muted }, { text: `${s.number} · rev. ${s.rev}`, font: 'Mono' }] },
        { text: [{ text: 'Data ', color: C.muted }, formatDate(s.issuedDate)] },
        { text: [{ text: 'Valido fino al ', color: C.muted }, content.validUntil ? formatDate(content.validUntil) : '-'] },
      ],
      fontSize: 9,
    },
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'Spett.le', fontSize: 8, color: C.muted },
            { text: c.name, bold: true, fontSize: 11 },
            {
              text: clientAddressLines(c).join('\n'),
              fontSize: 9,
            },
          ],
          fillColor: C.cream,
          margin: [10, 8, 10, 8],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 18, 0, 0],
    },
  ]

  if (s.title) body.push({ text: s.title, fontSize: 16, bold: true, margin: [0, 22, 0, 6] })
  if (content.intro) body.push({ text: content.intro })
  content.phases.forEach((phase, i) => body.push(...phaseBlock(phase, s.totals.phases[i] ?? 0, i)))
  body.push(summaryBlock(s))

  for (const [title, text] of extraSections(content)) {
    body.push({ text: title, style: 'h3' }, { text })
  }
  if (company.iban) {
    body.push({ text: [{ text: 'IBAN ', color: C.muted }, { text: company.iban, font: 'Mono' }], margin: [0, 14, 0, 0] })
  }
  if (s.legalNotes?.trim()) {
    body.push({ text: 'Note legali', style: 'h3' }, { text: s.legalNotes, fontSize: 7.5, color: C.muted })
  }
  body.push(signatureBlock(s))

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    info: { title: `Preventivo ${s.number}`, author: company.name, subject: s.title },
    defaultStyle: { font: 'Sans', fontSize: 9.5, lineHeight: 1.3, color: C.ink },
    styles: {
      h2: { fontSize: 12, bold: true, margin: [0, 18, 0, 4] },
      h3: { fontSize: 10, bold: true, margin: [0, 14, 0, 3] },
      th: { fontSize: 8, bold: true, color: C.muted },
    },
    footer: (page: number, pages: number) => ({
      columns: [
        { text: `${company.name} · Preventivo ${s.number} rev. ${s.rev}` },
        { text: `Pagina ${page} di ${pages}`, alignment: 'right' },
      ],
      margin: [40, 16, 40, 0],
      fontSize: 7,
      color: C.muted,
    }),
    content: body,
  }
}

export async function renderQuotePdf(s: QuoteSnapshot, assets: PdfAssets): Promise<Buffer> {
  const wide = assets.wide ?? assets.sans.bold
  // setFonts e createPdf senza await in mezzo: pdfmake legge i font
  // dentro createPdf, quindi render concorrenti non si mescolano
  pdfmake.setFonts({
    Sans: family(assets.sans.normal, assets.sans.bold),
    Wide: family(wide, wide),
    Mono: family(assets.mono.normal, assets.mono.bold),
  })
  const output = pdfmake.createPdf(buildQuoteDoc(s, assets.logoSvg))
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    // Senza timer uno stream che non finisce terrebbe aperta la transazione
    const timer = setTimeout(() => reject(new Error('Timeout nella generazione del PDF')), PDF_TIMEOUT_MS)
    const done = (settle: () => void) => {
      clearTimeout(timer)
      settle()
    }
    // Come getBuffer di pdfmake, ma con l'ascolto dell'errore
    output.getStream().then((stream) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => done(() => resolve(Buffer.concat(chunks))))
      stream.on('error', (err: Error) => done(() => reject(err)))
      stream.end()
    }, (err: Error) => done(() => reject(err)))
  })
}
