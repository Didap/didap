// Ogni link a /contact apre il modulo sopra la pagina invece di cambiarla:
// bottoni della nav, della home, delle schede e anche i link nei testi.
// Il link resta un link vero: con ctrl, cmd o shift apre la pagina in una
// nuova scheda, e /contact funziona da sola per chi ci arriva da fuori.
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { openContact } = useContactDialog()

  const isContact = (name: unknown) => String(name ?? '').startsWith('contact___')

  document.addEventListener(
    'click',
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement).closest('a')
      if (!a || a.target === '_blank' || a.origin !== window.location.origin) return
      const to = router.resolve(a.pathname + a.search)
      // Sulla pagina /contact il modulo c'è già
      if (!isContact(to.name) || isContact(router.currentRoute.value.name)) return
      // In cattura, prima di NuxtLink: con defaultPrevented non naviga
      e.preventDefault()
      const product = to.query.product
      openContact(typeof product === 'string' ? product.trim().slice(0, 80) : '')
    },
    true,
  )
})
