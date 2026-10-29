import { productFromQuery, projectTypeFromQuery } from '#shared/contact'

// Andare verso /contact da una pagina del sito apre il modulo sopra la
// pagina invece di cambiarla: bottoni, link nei testi, navigateTo. Con
// ctrl, cmd o shift il link apre /contact in una nuova scheda senza
// passare dal router, e /contact funziona da sola per chi arriva da fuori.
// Ogni altro cambio di pagina (privacy, indietro) chiude il modulo.
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const routeBaseName = useRouteBaseName()
  const { open, openContact } = useContactDialog()

  const isContact = (route: Parameters<typeof routeBaseName>[0]) => routeBaseName(route) === 'contact'

  router.beforeEach((to, from) => {
    // Al primo caricamento (stessa pagina) e su /contact il modulo c'è già
    if (to.path === from.path || !isContact(to) || isContact(from)) return
    openContact(productFromQuery(to.query.product), projectTypeFromQuery(to.query.type))
    return false
  })

  router.afterEach((_to, _from, failure) => {
    if (!failure) open.value = false
  })
})
