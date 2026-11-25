import { useElementSize } from '@vueuse/core'

/**
 * Il campo della chat cresce con il testo, fino a `max` px, poi scorre.
 * Vuoto: con `placeholder` si misura con il segnaposto, su una copia
 * nascosta (scriverlo nel campo vero ne cancellerebbe la cronologia di
 * annulla), così un segnaposto su due righe non si taglia; senza, il
 * campo resta su una riga, alto quanto il suo min-height. Si rimisura col
 * testo, con la larghezza e quando arriva il font.
 */
export function useAutosize(
  input: Ref<HTMLTextAreaElement | undefined>,
  text: Ref<string>,
  { max, placeholder = false }: { max: number, placeholder?: boolean },
) {
  const { width } = useElementSize(input)

  function measure(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    if (el.value || !placeholder) return el.value ? el.scrollHeight : 0
    const ghost = el.cloneNode() as HTMLTextAreaElement
    ghost.value = el.placeholder
    Object.assign(ghost.style, { position: 'absolute', visibility: 'hidden', height: 'auto', width: `${el.offsetWidth}px` })
    el.after(ghost)
    const h = ghost.scrollHeight
    ghost.remove()
    return h
  }

  function fit() {
    const el = input.value
    if (!el) return
    const h = measure(el)
    el.style.height = h ? `${Math.min(h, max)}px` : ''
    el.style.overflowY = h > max ? 'auto' : 'hidden'
  }

  watch([text, width, input], () => nextTick(fit))
  onMounted(() => {
    fit()
    document.fonts?.ready.then(fit)
  })
}
