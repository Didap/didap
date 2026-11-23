/**
 * L'header Range di una richiesta, per un file di `size` byte. Un solo
 * intervallo: "bytes=0-99", "bytes=100-" o "bytes=-500" (gli ultimi 500).
 * `null` quando l'header manca o non vale (più intervalli, fine prima
 * dell'inizio): si risponde con il file intero. 'unsatisfiable' quando
 * l'intervallo cade fuori dal file: 416.
 */
export function parseByteRange(
  header: string | undefined,
  size: number,
): { start: number, end: number } | 'unsatisfiable' | null {
  const m = header?.trim().match(/^bytes=(\d*)-(\d*)$/)
  if (!m || (!m[1] && !m[2])) return null
  // "bytes=-500": dal 500° byte prima della fine
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]))
  if (m[1] && m[2] && Number(m[2]) < start) return null
  if (start >= size) return 'unsatisfiable'
  return { start, end: m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1 }
}
