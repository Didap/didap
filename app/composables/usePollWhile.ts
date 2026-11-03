import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'

// Rilegge ogni `ms` millisecondi finché `active` è vero e la scheda del
// browser si vede. Quando riparte (diventa attivo, o la scheda torna
// visibile) rilegge subito: un lavoro finito mentre la scheda era nascosta
// si vede senza aspettare il giro dopo.
export function usePollWhile(load: () => unknown, active: MaybeRefOrGetter<boolean>, ms: number) {
  const visible = useDocumentVisibility()
  const { pause, resume } = useIntervalFn(load, ms, { immediate: false, immediateCallback: true })
  watch(() => toValue(active) && visible.value === 'visible', on => (on ? resume() : pause()))
}
