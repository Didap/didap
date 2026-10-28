import { describe, expect, it } from 'vitest'
import { contactKind } from '#shared/contact'

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
    expect(contactKind('mario rossi')).toBeNull()
    expect(contactKind('12345')).toBeNull()
    expect(contactKind('+39 333 abc 4567')).toBeNull()
  })
})
