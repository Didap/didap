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
