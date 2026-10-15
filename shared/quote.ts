import { z } from 'zod'
import type { ClientInput } from './clients'
import { addDays, ISO_DATE, romeDate } from './dates'
import { formatDecimal, MAX_CENTS } from './money'
import type { Company, Settings } from './settings'
import { text } from './text'

// Preventivi: contenuto della bozza, totali, stati e controlli prima
// dell'emissione. Importi in centesimi interi; giorni a mezze giornate.

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]
// Stati che si impostano a mano dopo l'emissione
export const SETTABLE_STATUSES = ['sent', 'accepted', 'rejected'] as const
export type SettableStatus = (typeof SETTABLE_STATUSES)[number]
// "Scaduto" non si salva: si calcola dalla scadenza
export type DisplayStatus = QuoteStatus | 'expired'

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  draft: 'Bozza',
  sent: 'Inviato',
  accepted: 'Accettato',
  rejected: 'Rifiutato',
  expired: 'Scaduto',
}

const cents = z.number().int().min(0).max(MAX_CENTS)
// Id di fasi e voci, generati nel browser
const localId = z.string().regex(/^[a-z0-9]{1,24}$/)

const daysItemSchema = z
  .object({
    id: localId,
    kind: z.literal('days'),
    description: text(500),
    // 0 ammesso in bozza; l'emissione chiede almeno mezza giornata
    days: z.number().min(0).max(1000).refine((d) => Number.isInteger(d * 2), 'Solo mezze giornate'),
    rate: cents,
  })
  .strict()

const fixedItemSchema = z
  .object({
    id: localId,
    kind: z.literal('fixed'),
    description: text(500),
    amount: cents,
  })
  .strict()

export const itemSchema = z.discriminatedUnion('kind', [daysItemSchema, fixedItemSchema])

export const phaseSchema = z
  .object({
    id: localId,
    title: text(200),
    description: text(2000),
    items: z.array(itemSchema).max(100),
  })
  .strict()

const discountSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }).strict(),
  z.object({ kind: z.literal('percent'), value: z.number().min(0).max(100) }).strict(),
  z.object({ kind: z.literal('amount'), value: cents }).strict(),
])

export const quoteContentSchema = z
  .object({
    intro: text(5000),
    phases: z.array(phaseSchema).max(30),
    dayRate: cents,
    discount: discountSchema,
    vatRate: z.number().min(0).max(100),
    validUntil: z.union([z.literal(''), z.string().regex(ISO_DATE)]),
    timeline: text(5000),
    paymentTerms: text(5000),
    exclusions: text(5000),
    notes: text(5000),
  })
  .strict()

export const draftInputSchema = z
  .object({
    title: text(200),
    clientId: z.string().uuid().nullable(),
    content: quoteContentSchema,
  })
  .strict()

export const statusInputSchema = z
  .object({ status: z.enum(SETTABLE_STATUSES) })
  .strict()

export type QuoteItem = z.infer<typeof itemSchema>
export type QuotePhase = z.infer<typeof phaseSchema>
export type QuoteContent = z.infer<typeof quoteContentSchema>
export type DraftInput = z.infer<typeof draftInputSchema>

export type QuoteTotals = {
  phases: number[]
  subtotal: number
  discount: number
  taxable: number
  vat: number
  total: number
}

// Tutto ciò che serve a ridisegnare una revisione emessa, senza altre tabelle
export type QuoteSnapshot = {
  number: string
  rev: number
  issuedAt: string
  issuedDate: string
  title: string
  clientId: string
  client: ClientInput
  company: Company
  content: QuoteContent
  totals: QuoteTotals
}

// Riga dell'elenco /admin/preventivi
export type QuoteListRow = {
  id: string
  number: string | null
  title: string
  clientName: string | null
  total: number
  status: QuoteStatus
  displayStatus: DisplayStatus
  updatedAt: string
}

// Dettaglio di un preventivo in /admin
export type QuoteDetail = {
  id: string
  number: string | null
  token: string | null
  status: QuoteStatus
  displayStatus: DisplayStatus
  currentRev: number
  draft: DraftInput
  issuedDraft: DraftInput | null
  revisions: { rev: number; issuedAt: string; total: number }[]
  updatedAt: string
}

export const TOKEN_PATTERN = /^[\w-]{43}$/

export const newLocalId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 12)

export function newDraftContent(defaults: Settings['defaults'], today: string): QuoteContent {
  return {
    intro: '',
    phases: [{ id: newLocalId(), title: '', description: '', items: [] }],
    dayRate: defaults.dayRate,
    discount: { kind: 'none' },
    vatRate: defaults.vatRate,
    validUntil: addDays(today, defaults.validityDays),
    timeline: '',
    paymentTerms: defaults.paymentTerms,
    exclusions: defaults.exclusions,
    notes: defaults.notes,
  }
}

export const itemAmount = (item: QuoteItem) =>
  item.kind === 'days' ? Math.round(item.days * item.rate) : item.amount

export function computeTotals(content: QuoteContent): QuoteTotals {
  const phases = content.phases.map((p) => p.items.reduce((sum, i) => sum + itemAmount(i), 0))
  const subtotal = phases.reduce((a, b) => a + b, 0)
  const d = content.discount
  const discount
    = d.kind === 'percent'
      ? Math.round((subtotal * d.value) / 100)
      : d.kind === 'amount'
        ? Math.min(d.value, subtotal)
        : 0
  const taxable = subtotal - discount
  const vat = Math.round((taxable * content.vatRate) / 100)
  return { phases, subtotal, discount, taxable, vat, total: taxable + vat }
}

// Cosa manca per poter emettere (vuoto = si può). today: data di Roma, YYYY-MM-DD
export function issueProblems(draft: DraftInput, today: string): string[] {
  const problems: string[] = []
  const items = draft.content.phases.flatMap((p) => p.items)
  if (!draft.clientId) problems.push('Scegli il cliente')
  if (!items.length) problems.push('Aggiungi almeno una voce')
  if (items.some((i) => !i.description.trim())) problems.push('Ogni voce ha bisogno di una descrizione')
  if (items.some((i) => i.kind === 'days' && i.days <= 0)) problems.push('Le voci a giorni vogliono almeno mezza giornata')
  if (!draft.content.validUntil) problems.push('Imposta la scadenza')
  else if (draft.content.validUntil < today) problems.push('La scadenza è già passata')
  return problems
}

// Scaduto: inviato e oltre la scadenza (il giorno di scadenza vale ancora)
export function effectiveStatus(status: QuoteStatus, validUntil: string, today: string): DisplayStatus {
  return status === 'sent' && validUntil !== '' && validUntil < today ? 'expired' : status
}

export const quoteNumber = (year: number, seq: number) => `${year}-${String(seq).padStart(3, '0')}`

export const pdfFilename = (number: string, rev: number) => `Preventivo-${number}-rev${rev}.pdf`

// JSON con chiavi ordinate: confronta bozze che tornano da jsonb (che
// riordina le chiavi) con quelle del browser
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  )
}

// Snapshot di una revisione. Le fasi senza voci non compaiono nel
// documento; quelle senza titolo diventano "Fase N".
export function buildSnapshot(input: {
  number: string
  rev: number
  now: Date
  title: string
  clientId: string
  client: ClientInput
  company: Company
  content: QuoteContent
}): QuoteSnapshot {
  const phases = input.content.phases
    .filter((p) => p.items.length > 0)
    .map((p, i) => ({ ...p, title: p.title.trim() || `Fase ${i + 1}` }))
  const content = { ...input.content, phases }
  return {
    number: input.number,
    rev: input.rev,
    issuedAt: input.now.toISOString(),
    issuedDate: romeDate(input.now),
    title: input.title,
    clientId: input.clientId,
    client: input.client,
    company: input.company,
    content,
    totals: computeTotals(content),
  }
}

// Snapshot per il link pubblico: il cliente vede solo la propria anagrafica
// essenziale. Note interne, email, telefono e id restano fuori. Le revisioni
// emesse le contengono ancora (sono immutabili), quindi il taglio va fatto in lettura.
// La tariffa giornaliera di default è interna e non compare nel documento.
export type PublicSnapshot = Omit<QuoteSnapshot, 'clientId' | 'client' | 'content'> & {
  content: Omit<QuoteContent, 'dayRate'>
  client: Pick<ClientInput, 'name' | 'address' | 'vatNumber' | 'taxCode' | 'sdiPec' | 'contactName'>
}

export function toPublicSnapshot(s: QuoteSnapshot): PublicSnapshot {
  const { dayRate: _dayRate, ...content } = s.content
  return {
    number: s.number,
    rev: s.rev,
    issuedAt: s.issuedAt,
    issuedDate: s.issuedDate,
    title: s.title,
    client: {
      name: s.client.name,
      address: s.client.address,
      vatNumber: s.client.vatNumber,
      taxCode: s.client.taxCode,
      sdiPec: s.client.sdiPec,
      contactName: s.client.contactName,
    },
    company: s.company,
    content,
    totals: s.totals,
  }
}

// Righe dell'anagrafica cliente nel documento (pagina pubblica e PDF)
export function clientAddressLines(
  c: Pick<ClientInput, 'address' | 'vatNumber' | 'taxCode' | 'sdiPec' | 'contactName'>,
): string[] {
  return [
    c.address,
    c.vatNumber && `P.IVA ${c.vatNumber}`,
    c.taxCode && `C.F. ${c.taxCode}`,
    c.sdiPec && `SDI/PEC ${c.sdiPec}`,
    c.contactName && `Alla c.a. di ${c.contactName}`,
  ].filter(Boolean)
}

export const discountLabel = (d: QuoteContent['discount']) =>
  d.kind === 'percent' ? `Sconto ${formatDecimal(d.value)}%` : 'Sconto'

// Sezioni finali di testo libero: quelle vuote non compaiono
export function extraSections(
  content: Pick<QuoteContent, 'timeline' | 'paymentTerms' | 'exclusions' | 'notes'>,
): [string, string][] {
  const sections: [string, string][] = [
    ['Tempi', content.timeline],
    ['Condizioni di pagamento', content.paymentTerms],
    ['Esclusioni', content.exclusions],
    ['Note', content.notes],
  ]
  return sections.filter(([, body]) => body.trim())
}
