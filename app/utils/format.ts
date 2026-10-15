// Date per le pagine admin, all'italiana

// ISO o timestamp: "15/10/26, 12:30"
export const formatDateTime = (iso: string | number) =>
  new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })

// 2026-10-15T10:30:00Z -> "15/10/2026"
export const formatDay = (iso: string) => new Date(iso).toLocaleDateString('it-IT')
