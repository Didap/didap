import { describe, expect, it } from 'vitest'
import { emptyClient } from '#shared/clients'
import {
  buildSnapshot,
  computeTotals,
  draftInputSchema,
  effectiveStatus,
  issueProblems,
  newDraftContent,
  quoteContentSchema,
  quoteNumber,
  stableStringify,
  type QuoteContent,
} from '#shared/quote'
import { DEFAULT_SETTINGS, parseSettings } from '#shared/settings'

const base = (): QuoteContent => newDraftContent(DEFAULT_SETTINGS.defaults, '2026-10-15')

describe('computeTotals', () => {
  it('somma voci a giorni e a corpo, sconto percentuale e IVA', () => {
    const content: QuoteContent = {
      ...base(),
      vatRate: 22,
      discount: { kind: 'percent', value: 10 },
      phases: [
        {
          id: 'p1', title: 'Design', description: '',
          items: [
            { id: 'a', kind: 'days', description: 'UI', days: 1.5, rate: 40000 },
            { id: 'b', kind: 'fixed', description: 'Licenze', amount: 25000 },
          ],
        },
        {
          id: 'p2', title: 'Sviluppo', description: '',
          items: [{ id: 'c', kind: 'days', description: 'Setup', days: 0.5, rate: 33333 }],
        },
      ],
    }
    expect(computeTotals(content)).toEqual({
      phases: [85000, 16667],
      subtotal: 101667,
      discount: 10167,
      taxable: 91500,
      vat: 20130,
      total: 111630,
    })
  })

  it('uno sconto fisso non supera l\'imponibile', () => {
    const content: QuoteContent = {
      ...base(),
      discount: { kind: 'amount', value: 999999 },
      phases: [{ id: 'p', title: '', description: '', items: [{ id: 'i', kind: 'fixed', description: 'x', amount: 1000 }] }],
    }
    expect(computeTotals(content)).toMatchObject({ discount: 1000, taxable: 0, vat: 0, total: 0 })
  })

  it('con IVA 0 il totale è l\'imponibile', () => {
    const content: QuoteContent = {
      ...base(),
      vatRate: 0,
      phases: [{ id: 'p', title: '', description: '', items: [{ id: 'i', kind: 'fixed', description: 'x', amount: 5000 }] }],
    }
    expect(computeTotals(content)).toMatchObject({ vat: 0, total: 5000 })
  })

  it('senza voci è tutto zero', () => {
    expect(computeTotals(base())).toEqual({ phases: [0], subtotal: 0, discount: 0, taxable: 0, vat: 0, total: 0 })
  })
})

describe('schemi', () => {
  it('accetta la bozza nuova', () => {
    expect(quoteContentSchema.safeParse(base()).success).toBe(true)
  })

  it('rifiuta giorni non a mezze giornate, importi negativi e chiavi sconosciute', () => {
    const withItem = (item: unknown) => ({ ...base(), phases: [{ id: 'p', title: '', description: '', items: [item] }] })
    expect(quoteContentSchema.safeParse(withItem({ id: 'i', kind: 'days', description: '', days: 0.3, rate: 100 })).success).toBe(false)
    expect(quoteContentSchema.safeParse(withItem({ id: 'i', kind: 'fixed', description: '', amount: -1 })).success).toBe(false)
    expect(quoteContentSchema.safeParse({ ...base(), extra: 1 }).success).toBe(false)
  })

  it('le impostazioni non valide tornano ai default', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings({ company: 'x' })).toEqual(DEFAULT_SETTINGS)
  })
})

describe('emissione', () => {
  it('elenca cosa manca', () => {
    const draft = { title: '', clientId: null, content: { ...base(), validUntil: '' } }
    expect(issueProblems(draft)).toEqual(['Scegli il cliente', 'Aggiungi almeno una voce', 'Imposta la scadenza'])
  })

  it('segnala voci senza descrizione', () => {
    const draft = draftInputSchema.parse({
      title: 'x',
      clientId: '00000000-0000-4000-8000-000000000000',
      content: { ...base(), phases: [{ id: 'p', title: '', description: '', items: [{ id: 'i', kind: 'fixed', description: ' ', amount: 1 }] }] },
    })
    expect(issueProblems(draft)).toEqual(['Ogni voce ha bisogno di una descrizione'])
  })

  it('una bozza completa non ha problemi', () => {
    const draft = {
      title: 'Sito',
      clientId: '00000000-0000-4000-8000-000000000000',
      content: { ...base(), phases: [{ id: 'p', title: '', description: '', items: [{ id: 'i', kind: 'fixed' as const, description: 'Sito', amount: 1 }] }] },
    }
    expect(issueProblems(draft)).toEqual([])
  })
})

describe('stato, numero, firma', () => {
  it('scade il giorno dopo la scadenza, solo se inviato', () => {
    expect(effectiveStatus('sent', '2026-10-15', '2026-10-15')).toBe('sent')
    expect(effectiveStatus('sent', '2026-10-15', '2026-10-16')).toBe('expired')
    expect(effectiveStatus('accepted', '2026-10-15', '2026-12-01')).toBe('accepted')
    expect(effectiveStatus('sent', '', '2026-12-01')).toBe('sent')
  })

  it('numera con almeno tre cifre', () => {
    expect(quoteNumber(2026, 14)).toBe('2026-014')
    expect(quoteNumber(2026, 1234)).toBe('2026-1234')
  })

  it('la firma non dipende dall\'ordine delle chiavi', () => {
    expect(stableStringify({ b: 1, a: { d: [2, { y: 1, x: 2 }], c: 3 } }))
      .toBe(stableStringify({ a: { c: 3, d: [2, { x: 2, y: 1 }] }, b: 1 }))
  })
})

describe('buildSnapshot', () => {
  it('toglie le fasi vuote e dà un titolo a quelle senza', () => {
    const content: QuoteContent = {
      ...base(),
      phases: [
        { id: 'vuota', title: 'Vuota', description: '', items: [] },
        { id: 'p1', title: '  ', description: '', items: [{ id: 'i', kind: 'fixed', description: 'x', amount: 1000 }] },
        { id: 'p2', title: 'Sviluppo', description: '', items: [{ id: 'j', kind: 'fixed', description: 'y', amount: 500 }] },
      ],
    }
    const s = buildSnapshot({
      number: '2026-001', rev: 1, now: new Date('2026-12-31T23:30:00Z'), title: 'Sito',
      clientId: 'c', client: { ...emptyClient(), name: 'Cliente' }, company: DEFAULT_SETTINGS.company, content,
    })
    expect(s.content.phases.map((p) => p.title)).toEqual(['Fase 1', 'Sviluppo'])
    expect(s.totals.phases).toEqual([1000, 500])
    expect(s.issuedDate).toBe('2027-01-01')
    expect(s.issuedAt).toBe('2026-12-31T23:30:00.000Z')
  })
})
