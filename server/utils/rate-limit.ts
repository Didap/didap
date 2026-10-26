import type { H3Event } from 'h3'

// Limite di tentativi per IP, in memoria e per istanza. Un contatore per
// bucket (login, reset, ...): ogni chiamata conta un tentativo. Con `extra`
// il contatore è per IP e quel valore (per esempio l'email del login).

const buckets = new Map<string, Map<string, { count: number, since: number }>>()

// Dietro il proxy di Coolify l'IP vero è l'ultimo di X-Forwarded-For:
// i valori precedenti li può scrivere il client
function clientIp(event: H3Event) {
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  return forwarded?.split(',').pop()?.trim()
    || getRequestIP(event)
    || 'unknown'
}

function limitKey(event: H3Event, extra?: string) {
  const ip = clientIp(event)
  return extra === undefined ? ip : `${ip}|${extra}`
}

export function rateLimit(bucket: string, event: H3Event, opts: { max: number, windowMs: number }, extra?: string) {
  let entries = buckets.get(bucket)
  if (!entries) buckets.set(bucket, entries = new Map())
  const key = limitKey(event, extra)
  const now = Date.now()
  // Pulizia delle finestre scadute
  for (const [k, e] of entries) {
    if (now - e.since >= opts.windowMs) entries.delete(k)
  }
  const entry = entries.get(key)
  if (entry && entry.count >= opts.max) {
    throw createError({ statusCode: 429, statusMessage: 'Troppi tentativi, riprova più tardi' })
  }
  if (entry) entry.count++
  else entries.set(key, { count: 1, since: now })
}

export function clearRateLimit(bucket: string, event: H3Event, extra?: string) {
  buckets.get(bucket)?.delete(limitKey(event, extra))
}
