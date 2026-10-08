import type { MediaSlot } from '#shared/product'

// Scambio di immagini tra slot di /admin trascinandole una sull'altra.
// Stato condiviso a livello di modulo: usato solo nel browser.
type Slot = { get: () => MediaSlot; set: (v: MediaSlot) => void }
const dragging = shallowRef<Slot | null>(null)

export const SLOT_DRAG_TYPE = 'application/x-didap-slot'

export const useSlotSwap = (get: () => MediaSlot, set: (v: MediaSlot) => void) => {
  const self: Slot = { get, set }
  return {
    start: () => (dragging.value = self),
    end: () => (dragging.value = null),
    /** true se si sta trascinando un altro slot */
    canDrop: computed(() => !!dragging.value && dragging.value.get !== get),
    drop() {
      const from = dragging.value
      dragging.value = null
      if (!from || from.get === get) return false
      const a = get()
      const b = from.get()
      set({ ...b })
      from.set({ ...a })
      return true
    },
  }
}
