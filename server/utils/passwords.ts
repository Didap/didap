import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const SALT_BYTES = 16
const KEY_BYTES = 64

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_BYTES, (err, key) => (err ? reject(err) : resolve(key)))
  })
}

// Formato: scrypt$<salt base64url>$<hash base64url>
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const key = await derive(password, salt)
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1]!, 'base64url')
  const expected = Buffer.from(parts[2]!, 'base64url')
  if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false
  const key = await derive(password, salt)
  return timingSafeEqual(key, expected)
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Token monouso: al cliente va il token, nel database solo l'hash
export function newToken(): { token: string, hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}
