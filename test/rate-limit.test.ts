import { describe, expect, it } from 'vitest'
import { clearAttempts, limitAttempt, limitKeys, MAX_LIMIT_KEYS } from '../server/utils/rate-limit'

const opts = { max: 3, windowMs: 1000 }
const tooMany = expect.objectContaining({ statusCode: 429 })

describe('limitAttempt', () => {
  it('oltre max nella finestra: 429; finita la finestra si riparte', () => {
    for (let i = 0; i < 3; i++) limitAttempt('t-base', 'ip', opts, 0)
    expect(() => limitAttempt('t-base', 'ip', opts, 500)).toThrow(tooMany)
    // Un'altra chiave ha il suo contatore
    limitAttempt('t-base', 'altro', opts, 500)
    limitAttempt('t-base', 'ip', opts, 1000)
  })

  it('clearAttempts azzera solo quella chiave', () => {
    for (let i = 0; i < 3; i++) {
      limitAttempt('t-clear', 'a', opts, 0)
      limitAttempt('t-clear', 'b', opts, 0)
    }
    clearAttempts('t-clear', 'a')
    limitAttempt('t-clear', 'a', opts, 1)
    expect(() => limitAttempt('t-clear', 'b', opts, 1)).toThrow(tooMany)
  })

  it('le chiavi scadute escono dalla mappa', () => {
    for (let i = 0; i < 100; i++) limitAttempt('t-prune', `ip${i}`, opts, i)
    expect(limitKeys('t-prune')).toBe(100)
    // A 1050 sono scadute quelle partite fino a 50: ne restano 49 più la nuova
    limitAttempt('t-prune', 'nuovo', opts, 1050)
    expect(limitKeys('t-prune')).toBe(50)
  })

  it('la mappa non supera MAX_LIMIT_KEYS: esce la chiave più vecchia', () => {
    const long = { max: 3, windowMs: 1e9 }
    for (let i = 0; i < MAX_LIMIT_KEYS + 5; i++) limitAttempt('t-cap', `ip${i}`, long, i)
    expect(limitKeys('t-cap')).toBe(MAX_LIMIT_KEYS)
  })

  // Come il login: per IP ed email (8, azzerato dal successo) e per IP in tutto (50)
  it('login: un IP non prova più di 50 volte anche cambiando email', () => {
    const win = { windowMs: 10 * 60 * 1000 }
    const attempt = (email: string) => {
      limitAttempt('t-login-ip', '1.2.3.4', { max: 50, ...win }, 0)
      limitAttempt('t-login', `1.2.3.4|${email}`, { max: 8, ...win }, 0)
    }
    for (let i = 0; i < 50; i++) attempt(`p${i}@didap.it`)
    expect(() => attempt('altra@didap.it')).toThrow(tooMany)
    // Un successo azzera solo il contatore dell'email
    clearAttempts('t-login', '1.2.3.4|p0@didap.it')
    expect(() => attempt('p0@didap.it')).toThrow(tooMany)
  })
})
