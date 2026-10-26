import { describe, expect, it } from 'vitest'
import { hashPassword, hashToken, newToken, verifyPassword } from '../server/utils/passwords'

describe('password', () => {
  it('produce hash diversi per la stessa password', async () => {
    const a = await hashPassword('una-password-lunga')
    const b = await hashPassword('una-password-lunga')
    expect(a).not.toBe(b)
    expect(a.startsWith('scrypt$')).toBe(true)
  })

  it('verifica la password giusta e rifiuta il resto', async () => {
    const stored = await hashPassword('una-password-lunga')
    expect(await verifyPassword('una-password-lunga', stored)).toBe(true)
    expect(await verifyPassword('sbagliata-sbagliata', stored)).toBe(false)
    expect(await verifyPassword('una-password-lunga', null)).toBe(false)
    expect(await verifyPassword('una-password-lunga', 'abc')).toBe(false)
  })
})

describe('token monouso', () => {
  it('hash coerente con il token', () => {
    const t = newToken()
    expect(hashToken(t.token)).toBe(t.hash)
    expect(t.hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('due token sono diversi', () => {
    expect(newToken().token).not.toBe(newToken().token)
  })
})
