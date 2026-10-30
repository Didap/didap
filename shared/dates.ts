// Date del preventivo: giorni di calendario (YYYY-MM-DD) nel fuso di Roma

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// en-CA formatta già come YYYY-MM-DD
const romeDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const romeDate = (now: Date) => romeDay.format(now)
export const romeYear = (now: Date) => Number(romeDate(now).slice(0, 4))

const romeTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
// L'istante in cui Roma segna quel giorno e quell'ora ("HH:MM:SS"); null se
// il giorno non esiste. L'Italia è a UTC+1 o UTC+2: vale l'offset giusto.
export function romeLocalToDate(day: string, time: string): Date | null {
  const midnight = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== day) return null
  for (const offset of ['+02:00', '+01:00']) {
    const date = new Date(`${day}T${time}${offset}`)
    if (romeTime.format(date).endsWith(time)) return date
  }
  return null
}

// A mezzogiorno UTC il cambio dell'ora non sposta mai il giorno
export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// "2026-03-09" -> "09/03/2026"
export function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}
