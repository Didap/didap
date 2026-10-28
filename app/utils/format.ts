// Date e misure per le pagine admin, all'italiana

// ISO o timestamp: "15/10/26, 12:30"
export const formatDateTime = (iso: string | number) =>
  new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })

// 2026-10-15T10:30:00Z -> "15/10/2026"
export const formatDay = (iso: string) => new Date(iso).toLocaleDateString('it-IT')

const decimal = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })

// 1536 -> "1,5 KB"
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${decimal.format(n / 1024)} KB`
  return `${decimal.format(n / 1024 / 1024)} MB`
}
