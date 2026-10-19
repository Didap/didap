// Ponte tra le opzioni di un form e Select/ToggleGroup di Reka UI, che
// vogliono valori stringa non vuoti: ogni voce si riconosce per posizione,
// così anche '' e null sono scelte valide. Senza corrispondenza l'indice
// è '' e mai undefined, così Reka resta controllato dal genitore.
// Riscegliere la voce attiva non cambia niente (come il change nativo).
// Import espliciti: lo usano anche i test, fuori da Nuxt.

import { computed, type Ref } from 'vue'

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
    if (option && option.value !== model.value) model.value = option.value
  }

  return { index, selected, select }
}
