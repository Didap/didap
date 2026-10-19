import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useIndexedOptions } from '../app/composables/useIndexedOptions'

// Ponte posizione <-> valore per AppSelect e AdminToggleGroup
describe('useIndexedOptions', () => {
  const OPTIONS = [
    { value: '', label: 'Nessuno' },
    { value: 'live', label: 'Live' },
    { value: 'pilot', label: 'Pilot' },
  ]

  it("riconosce '' e null come voci vere", () => {
    const model = ref('')
    const { index, selected } = useIndexedOptions(() => OPTIONS, model)
    expect(index.value).toBe('0')
    expect(selected.value?.label).toBe('Nessuno')

    const client = ref<string | null>(null)
    const withNull = useIndexedOptions(
      () => [{ value: null, label: 'Scegli…' }, { value: 'a', label: 'A' }],
      client,
    )
    expect(withNull.index.value).toBe('0')
  })

  it("senza corrispondenza l'indice è '' e non undefined", () => {
    const model = ref('sconosciuto')
    const { index, selected } = useIndexedOptions(() => OPTIONS, model)
    expect(index.value).toBe('')
    expect(selected.value).toBeUndefined()
  })

  it('scegliere una posizione aggiorna il modello', () => {
    const model = ref('')
    const { index, select } = useIndexedOptions(() => OPTIONS, model)
    select('2')
    expect(model.value).toBe('pilot')
    expect(index.value).toBe('2')
  })

  it('ignora la deselezione e le posizioni non valide', () => {
    const model = ref('live')
    const { select } = useIndexedOptions(() => OPTIONS, model)
    for (const v of [undefined, '', '9', 3]) select(v)
    expect(model.value).toBe('live')
  })

  it('riscegliere la voce attiva non scrive il modello', () => {
    let writes = 0
    const value = ref('live')
    const model = {
      get value() {
        return value.value
      },
      set value(v: string) {
        writes++
        value.value = v
      },
    }
    const { select } = useIndexedOptions(() => OPTIONS, model as typeof value)
    select('1')
    expect(writes).toBe(0)
    select('2')
    expect(writes).toBe(1)
  })
})
