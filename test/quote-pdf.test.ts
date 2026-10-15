import { describe, expect, it } from 'vitest'
import type { QuoteItem } from '#shared/quote'
import { buildQuoteDoc, renderQuotePdf } from '../server/utils/quote-pdf'
import { pageCount, sampleSnapshot, testPdfAssets } from './helpers/fixtures'

const assets = testPdfAssets()

describe('renderQuotePdf', () => {
  it('genera un PDF di una pagina per un preventivo corto', async () => {
    const pdf = await renderQuotePdf(sampleSnapshot(), assets)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pageCount(pdf)).toBe(1)
  })

  it('va su più pagine con molte voci', async () => {
    const items = (n: number): QuoteItem[] =>
      Array.from({ length: n }, (_, i) => ({
        id: `i${i}`,
        kind: 'days',
        description: `Attività ${i}: ${'analisi, sviluppo e verifica '.repeat(4)}`,
        days: 1.5,
        rate: 40000,
      }))
    const phases = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, title: `Fase ${i}`, description: '', items: items(25) }))
    const pdf = await renderQuotePdf(sampleSnapshot({ phases }), assets)
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(3)
  })

  it('non si rompe con caratteri che il font non ha', async () => {
    const pdf = await renderQuotePdf(sampleSnapshot({
      intro: 'Lancio 🚀 a Łódź con “virgolette” e € ő',
      notes: 'Ciao 👋',
    }), assets)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  })
})

describe('buildQuoteDoc', () => {
  it('omette sezioni vuote e righe di sconto a zero', () => {
    const json = JSON.stringify(buildQuoteDoc(sampleSnapshot(), assets.logoSvg))
    expect(json).not.toContain('Esclusioni')
    expect(json).not.toContain('Sconto')
    expect(json).toContain('Wireframe')
    expect(json).toContain('a corpo')
  })

  it('mostra sconto, testi finali e IBAN quando ci sono', () => {
    const json = JSON.stringify(buildQuoteDoc(sampleSnapshot({
      discount: { kind: 'percent', value: 10 },
      exclusions: 'Hosting',
      paymentTerms: '50% alla firma',
    }), assets.logoSvg))
    expect(json).toContain('Sconto 10%')
    expect(json).toContain('Imponibile scontato')
    expect(json).toContain('Esclusioni')
    expect(json).toContain('50% alla firma')
    expect(json).toContain('IT60X0542811101000000123456')
  })

  it('scrive pagina X di Y nel piè di pagina', () => {
    const doc = buildQuoteDoc(sampleSnapshot(), assets.logoSvg)
    const footer = (doc.footer as (page: number, pages: number) => unknown)(2, 5)
    expect(JSON.stringify(footer)).toContain('Pagina 2 di 5')
  })
})
