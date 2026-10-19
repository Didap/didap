// Ponte tra le opzioni di un form e Select/ToggleGroup di Reka UI, che
// vogliono valori stringa non vuoti: ogni voce si riconosce per posizione,
// così anche '' e null sono scelte valide. Senza corrispondenza l'indice
// è '' e mai undefined, così Reka resta controllato dal genitore.

export function useIndexedOptions<T, O extends { value: T }>(
  options: () => readonly O[],
  model: Ref<T>,
) {
  const index = computed(() => {
    const i = options().findIndex((o) => o.value === model.value)
    return i < 0 ? '' : String(i)
  })
  const selected = computed(() => (index.value === '' ? undefined : options()[Number(index.value)]))

  function select(i: unknown) {
    const option = typeof i === 'string' && i !== '' ? options()[Number(i)] : undefined
    if (option) model.value = option.value
  }

  return { index, selected, select }
}
