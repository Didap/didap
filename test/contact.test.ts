import { describe, expect, it } from 'vitest'
import { contactKind, mailtoHref, productFromQuery, projectTypeFromQuery, telHref, whatsappHref } from '#shared/contact'

describe('email o telefono', () => {
  it('riconosce un\'email', () => {
    expect(contactKind('mario@azienda.it')).toBe('email')
    expect(contactKind('  mario.rossi@azienda.co.uk ')).toBe('email')
  })

  it('riconosce un telefono scritto come capita', () => {
    expect(contactKind('333 123 4567')).toBe('phone')
    expect(contactKind('+39 080-123.45.67')).toBe('phone')
    expect(contactKind('(080) 1234567')).toBe('phone')
  })

  it('scarta il resto', () => {
    expect(contactKind('')).toBeNull()
    expect(contactKind('mario@')).toBeNull()
    expect(contactKind('mario@azienda..it')).toBeNull()
    expect(contactKind('mario@azienda.it.')).toBeNull()
    expect(contactKind('mario rossi')).toBeNull()
    expect(contactKind('12345')).toBeNull()
    expect(contactKind('+39 333 abc 4567')).toBeNull()
  })
})

describe('link e query', () => {
  it('tel: con solo cifre e il +', () => {
    expect(telHref('+39 080-123.45.67')).toBe('tel:+390801234567')
  })

  it('WhatsApp e mail con il testo già scritto', () => {
    expect(whatsappHref('+39 333 123 4567', 'Ciao, un sito?')).toBe('https://wa.me/393331234567?text=Ciao%2C%20un%20sito%3F')
    expect(whatsappHref('0039 333 123 4567', 'x')).toBe('https://wa.me/393331234567?text=x')
    expect(mailtoHref('a@b.it', 'Dal sito', 'Ciao & grazie')).toBe('mailto:a@b.it?subject=Dal%20sito&body=Ciao%20%26%20grazie')
  })

  it('la voce dalla query, solo se esiste', () => {
    expect(projectTypeFromQuery('grant')).toBe('grant')
    expect(projectTypeFromQuery('chat')).toBe('')
    expect(projectTypeFromQuery(['site'])).toBe('')
  })

  it('il prodotto dalla query, ripulito', () => {
    expect(productFromQuery('  Bin or Deal ')).toBe('Bin or Deal')
    expect(productFromQuery(['a', 'b'])).toBe('')
    expect(productFromQuery('x'.repeat(100))).toHaveLength(80)
  })
})
