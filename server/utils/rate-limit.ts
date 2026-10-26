import { createError, getRequestHeader, getRequestIP, type H3Event } from 'h3'

// Limite di tentativi in memoria, per istanza. Un contatore per bucket
// (login, reset, ...) e per chiave: ogni chiamata conta un tentativo.
// Con `extra` la chiave è l'IP più quel valore (per esempio l'email del login).

type Entry = { count: number, since: number }

// Oltre questo numero di chiavi in un bucket esce la più vecchia: la mappa
// non cresce senza limite anche con molti IP diversi
export const MAX_LIMIT_KEYS = 10_000

const buckets = new Map<string, Map<string, Entry>>()

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

// Un tentativo per `key` nel bucket; 429 oltre `max` nella finestra
export function limitAttempt(bucket: string, key: string, opts: { max: number, windowMs: number }, now = Date.now()) {
  let entries = buckets.get(bucket)
  if (!entries) buckets.set(bucket, entries = new Map())
  // Le chiavi stanno in ordine di inizio finestra (una chiave scaduta esce e
  // rientra in fondo): le scadute sono tutte all'inizio
  for (const [k, e] of entries) {
    if (now - e.since < opts.windowMs) break
    entries.delete(k)
  }
  const entry = entries.get(key)
  if (entry && entry.count >= opts.max) {
    throw createError({ statusCode: 429, statusMessage: 'Troppi tentativi, riprova più tardi' })
  }
  if (entry) {
    entry.count++
    return
  }
  if (entries.size >= MAX_LIMIT_KEYS) entries.delete(entries.keys().next().value!)
  entries.set(key, { count: 1, since: now })
}

export function clearAttempts(bucket: string, key: string) {
  buckets.get(bucket)?.delete(key)
}

// Quante chiavi tiene un bucket (per i test)
export const limitKeys = (bucket: string) => buckets.get(bucket)?.size ?? 0

export function rateLimit(bucket: string, event: H3Event, opts: { max: number, windowMs: number }, extra?: string) {
  limitAttempt(bucket, limitKey(event, extra), opts)
}

export function clearRateLimit(bucket: string, event: H3Event, extra?: string) {
  clearAttempts(bucket, limitKey(event, extra))
}
