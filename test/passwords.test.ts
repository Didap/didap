import { describe, expect, it } from 'vitest'
import { DUMMY_HASH, hashPassword, hashToken, newToken, verifyPassword } from '../server/utils/passwords'

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

  it('l\'hash fittizio è ben formato, così scrypt gira davvero', async () => {
    const [scheme, salt, key] = DUMMY_HASH.split('$')
    expect(scheme).toBe('scrypt')
    expect(Buffer.from(salt!, 'base64url')).toHaveLength(16)
    expect(Buffer.from(key!, 'base64url')).toHaveLength(64)
    expect(await verifyPassword('una-password-lunga', DUMMY_HASH)).toBe(false)
  })

  it('due token sono diversi', () => {
    expect(newToken().token).not.toBe(newToken().token)
  })
})
