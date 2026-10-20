import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { emptyClient } from '#shared/clients'
import { buildSnapshot, newDraftContent, type QuoteContent, type QuoteSnapshot } from '#shared/quote'
import { DEFAULT_SETTINGS } from '#shared/settings'
import type { PdfAssets } from '../../server/utils/quote-pdf'

// Dati di esempio per i test del PDF

const asset = (path: string) => readFileSync(fileURLToPath(new URL(`../../server/assets/${path}`, import.meta.url)))

export function testPdfAssets(): PdfAssets {
  return {
    logoSvg: asset('pdf/logo.svg').toString('utf8'),
    sans: { normal: asset('fonts/fallback/inter-400.woff'), bold: asset('fonts/fallback/inter-700.woff') },
    wide: null,
    mono: { normal: asset('fonts/fallback/jetbrains-mono-400.woff'), bold: asset('fonts/fallback/jetbrains-mono-500.woff') },
  }
}

export function sampleSnapshot(patch: Partial<QuoteContent> = {}): QuoteSnapshot {
  const content: QuoteContent = {
    ...newDraftContent(DEFAULT_SETTINGS.defaults, '2026-10-15'),
    intro: 'Rifacimento del sito istituzionale.',
    phases: [
      {
        id: 'p1',
        title: 'Design',
        description: 'Interfaccia e prototipo.',
        items: [
          { id: 'a', kind: 'days', description: 'Wireframe', days: 2, rate: 40000 },
          { id: 'b', kind: 'fixed', description: 'Licenze font', amount: 15000 },
        ],
      },
    ],
    ...patch,
  }
  return buildSnapshot({
    number: '2026-001',
    rev: 1,
    now: new Date('2026-10-15T10:00:00Z'),
    title: 'Nuovo sito',
    clientId: '00000000-0000-4000-8000-000000000000',
    client: { ...emptyClient(), name: 'Comune di Prova', address: 'Piazza Grande 1\n72100 Brindisi', vatNumber: '00123456789' },
    company: { ...DEFAULT_SETTINGS.company, address: 'Via Roma 1, Brindisi', iban: 'IT60X0542811101000000123456' },
    content,
    legalNotes: '',
  })
}

// Le pagine di un PDF di pdfkit: un dizionario "/Type /Page" ciascuna
export const pageCount = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length
