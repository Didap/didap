import type { ProductOverride } from '#shared/product'

// Anteprima live di /admin: la scheda prodotto aperta in un iframe con
// ?preview=1 riceve la bozza non salvata e la mostra al posto dei dati
// salvati. Accetta messaggi solo dalla stessa origine.
type PreviewMessage =
  | { type: 'didap:preview'; slug: string; locale: string; data: ProductOverride }
  | { type: 'didap:scroll'; section: string }

export default defineNuxtPlugin(() => {
  const route = useRoute()
  if (window.parent === window || route.query.preview !== '1') return

  const preview = useProductPreview()

  window.addEventListener('message', (e: MessageEvent<PreviewMessage>) => {
    if (e.origin !== window.location.origin || !e.data?.type) return
    if (e.data.type === 'didap:preview') {
      const { slug, locale, data } = e.data
      preview.value = { slug, locale, data }
    }
    else if (e.data.type === 'didap:scroll') {
      document
        .querySelector(`[data-preview-section="${CSS.escape(e.data.section)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })

  // Clic su una sezione dell'anteprima: l'admin apre il blocco del form.
  // I link non portano altrove, l'anteprima resta sulla scheda.
  const style = document.createElement('style')
  style.textContent = `
    [data-preview-section] { cursor: pointer !important; transition: outline-color .15s; outline: 2px dashed transparent; outline-offset: -2px; }
    [data-preview-section]:hover { outline-color: #2e5d4a; }
    [data-preview-section] * { cursor: pointer !important; }
  `
  document.head.append(style)

  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement
      if (target.closest('a')) e.preventDefault()
      const section = target.closest<HTMLElement>('[data-preview-section]')?.dataset.previewSection
      if (section) {
        e.preventDefault()
        window.parent.postMessage({ type: 'didap:select', section }, window.location.origin)
      }
    },
    true,
  )

  window.parent.postMessage({ type: 'didap:preview-ready' }, window.location.origin)
})
