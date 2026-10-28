import { describe, expect, it } from 'vitest'
import { cleanFileName } from '../shared/grant-files'
import { fileHeaders, inlineAllowed } from '../server/utils/file-response'

describe('fileHeaders', () => {
  it('PDF inline, nome ASCII ripulito e nome UTF-8 percent-encoded, senza sandbox', () => {
    const h = fileHeaders('Bando è "ok".pdf', 'application/pdf', false)
    expect(h['Content-Type']).toBe('application/pdf')
    expect(h['Content-Disposition']).toMatch(/^inline; /)
    expect(h['Content-Disposition']).toContain('filename*=UTF-8\'\'Bando%20%C3%A8%20%22ok%22.pdf')
    const ascii = /filename="([^"]*)"/.exec(h['Content-Disposition']!)![1]!
    expect(ascii).not.toMatch(/["\\]/)
    expect(ascii).toMatch(/^[\x20-\x7e]+$/)
    expect(ascii.endsWith('.pdf')).toBe(true)
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Cache-Control']).toBe('private, no-store')
    // La sandbox fermerebbe il visore PDF dell'anteprima
    expect(h['Content-Security-Policy']).toBeUndefined()
  })

  it('SVG e HTML sempre allegati, come byte generici', () => {
    for (const [name, mime] of [['x.svg', 'image/svg+xml'], ['x.html', 'text/html']] as const) {
      const h = fileHeaders(name, mime, false)
      expect(h['Content-Disposition']).toMatch(/^attachment; /)
      expect(h['Content-Type']).toBe('application/octet-stream')
      expect(h['X-Content-Type-Options']).toBe('nosniff')
      expect(h['Content-Security-Policy']).toBe('sandbox')
    }
  })

  it('con download anche il PDF è un allegato', () => {
    const h = fileHeaders('a.pdf', 'application/pdf', true)
    expect(h['Content-Disposition']).toBe('attachment; filename="a.pdf"; filename*=UTF-8\'\'a.pdf')
    expect(h['Content-Type']).toBe('application/octet-stream')
    expect(h['Content-Security-Policy']).toBe('sandbox')
    expect(h['Cache-Control']).toBe('private, no-store')
  })

  it('un nome tutto non ASCII ha comunque un filename', () => {
    const h = fileHeaders('日本.pdf', 'application/pdf', false)
    expect(h['Content-Disposition']).toMatch(/filename="[^"]+\.pdf"/)
  })
})

describe('inlineAllowed', () => {
  it('solo PDF e le quattro immagini', () => {
    for (const m of ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp']) {
      expect(inlineAllowed(m)).toBe(true)
    }
    for (const m of ['image/svg+xml', 'text/html', 'text/plain', 'application/octet-stream', '']) {
      expect(inlineAllowed(m)).toBe(false)
    }
  })
})

describe('cleanFileName', () => {
  it('toglie barre e caratteri di controllo, tiene l\'estensione', () => {
    expect(cleanFileName('a/b\nc.pdf', 'x')).toBe('a b c.pdf')
    expect(cleanFileName('  Visura  camerale.PDF ', 'x')).toBe('Visura camerale.PDF')
    const long = cleanFileName(`${'x'.repeat(400)}.docx`, 'x')
    expect(long.length).toBeLessThanOrEqual(160)
    expect(long.endsWith('.docx')).toBe(true)
  })

  it('nomi vuoti o impossibili danno il ripiego', () => {
    expect(cleanFileName('', 'file')).toBe('file')
    expect(cleanFileName('/.pdf', 'documento.pdf')).toBe('documento.pdf')
    expect(cleanFileName('..', 'file')).toBe('file')
    // Solo estensione: come per i PDF del bando, il ripiego
    expect(cleanFileName('.env', 'file')).toBe('file')
    // Un punto in mezzo a parole non è un'estensione
    expect(cleanFileName('Avviso n. 3 del 2024', 'file')).toBe('Avviso n. 3 del 2024')
  })
})
