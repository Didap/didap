// Sposta l'elemento i di una posizione (-1 su, +1 giù); ai bordi non fa nulla
export function moveInArray<T>(list: T[], i: number, delta: -1 | 1) {
  const j = i + delta
  if (j < 0 || j >= list.length) return
  const [moved] = list.splice(i, 1)
  list.splice(j, 0, moved!)
}
