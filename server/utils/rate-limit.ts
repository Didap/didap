import type { H3Event } from 'h3'

// Limite di tentativi per IP, in memoria e per istanza. Un contatore per
// bucket (login, reset, ...): ogni chiamata conta un tentativo.

const buckets = new Map<string, Map<string, { count: number, since: number }>>()

// Dietro il proxy di Coolify l'IP vero è l'ultimo di X-Forwarded-For:
// i valori precedenti li può scrivere il client
function clientIp(event: H3Event) {
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  return forwarded?.split(',').pop()?.trim()
    || getRequestIP(event)
    || 'unknown'
}

export function rateLimit(bucket: string, event: H3Event, opts: { max: number, windowMs: number }) {
  let entries = buckets.get(bucket)
  if (!entries) buckets.set(bucket, entries = new Map())
  const ip = clientIp(event)
  const now = Date.now()
  // Pulizia delle finestre scadute
  for (const [key, e] of entries) {
    if (now - e.since >= opts.windowMs) entries.delete(key)
  }
  const entry = entries.get(ip)
  if (entry && entry.count >= opts.max) {
    throw createError({ statusCode: 429, statusMessage: 'Troppi tentativi, riprova più tardi' })
  }
  if (entry) entry.count++
  else entries.set(ip, { count: 1, since: now })
}

export function clearRateLimit(bucket: string, event: H3Event) {
  buckets.get(bucket)?.delete(clientIp(event))
}
