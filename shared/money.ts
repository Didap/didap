// Importi in centesimi interi e numeri scritti all'italiana
// (virgola per i decimali, punto per le migliaia).

export const MAX_CENTS = 10_000_000_000 // 100 milioni di euro

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: 'always',
})
const plain = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
})
const decimal = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 2,
  useGrouping: 'always',
})

// 123450 -> "1.234,50 €"
export const formatEuro = (cents: number) => euro.format(cents / 100)
// 123450 -> "1.234,50" (campi di input)
export const formatEuroPlain = (cents: number) => plain.format(cents / 100)
// 1.5 -> "1,5"
export const formatDecimal = (n: number) => decimal.format(n)

const clean = (input: string) => input.replace(/[\s €]/g, '')

const WITH_COMMA = /^(\d{1,3}(\.\d{3})+|\d+),\d{0,2}$/
const DOT_DECIMAL = /^\d+\.\d{1,2}$/
const INTEGER = /^(\d{1,3}(\.\d{3})+|\d+)$/

// Un solo modo di leggere i numeri scritti a mano, per euro, giorni e
// percentuali: virgola = decimali (con punti per le migliaia), "123.45"
// con 1-2 decimali = decimali, interi a gruppi di punti = migliaia
function normalizeNumber(input: string): number | null {
  const s = clean(input)
  let normalized: string
  if (WITH_COMMA.test(s)) normalized = s.replace(/\./g, '').replace(',', '.')
  else if (DOT_DECIMAL.test(s)) normalized = s
  else if (INTEGER.test(s)) normalized = s.replace(/\./g, '')
  else return null
  return Number(normalized)
}

// "1.234,50", "1234,5", "1234.50", "1.234" -> centesimi; null se non valido
export function parseEuroInput(input: string): number | null {
  const n = normalizeNumber(input)
  if (n === null) return null
  const cents = Math.round(n * 100)
  return cents <= MAX_CENTS ? cents : null
}

// Giorni: più di 0, a multipli di mezza giornata, al massimo 1000
export function parseDaysInput(input: string): number | null {
  const n = normalizeNumber(input)
  return n !== null && n > 0 && n <= 1000 && Number.isInteger(n * 2) ? n : null
}

// Percentuali tra 0 e 100, arrotondate al centesimo
export function parsePercentInput(input: string): number | null {
  const n = normalizeNumber(input)
  return n !== null && n <= 100 ? Math.round(n * 100) / 100 : null
}
