// Date e misure per le pagine admin, all'italiana

// ISO o timestamp: "15/10/26, 12:30"
export const formatDateTime = (iso: string | number) =>
  new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })

// 2026-10-15T10:30:00Z -> "15/10/2026"
export const formatDay = (iso: string) => new Date(iso).toLocaleDateString('it-IT')

const decimal = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })

// Costo stimato del modello: 0.0123 -> "≈ 0,012 USD" (null: modello senza prezzo)
export const formatDollars = (n: number | null) =>
  n === null ? 'prezzo n.d.' : `≈ ${n.toLocaleString('it-IT', { style: 'currency', currency: 'USD', minimumFractionDigits: n < 1 ? 3 : 2 })}`

// 1536 -> "1,5 KB"
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${decimal.format(n / 1024)} KB`
  return `${decimal.format(n / 1024 / 1024)} MB`
}
