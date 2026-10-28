import { describe, expect, it } from 'vitest'
import { contactKind, productFromQuery, telHref } from '#shared/contact'

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

  it('il prodotto dalla query, ripulito', () => {
    expect(productFromQuery('  Bin or Deal ')).toBe('Bin or Deal')
    expect(productFromQuery(['a', 'b'])).toBe('')
    expect(productFromQuery('x'.repeat(100))).toHaveLength(80)
  })
})
