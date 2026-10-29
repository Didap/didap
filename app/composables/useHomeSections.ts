/**
 * Voci della nav: ancore alle schermate della home. Da qualsiasi pagina
 * portano alla home e scorrono alla schermata: i prodotti partono da
 * CityFix, i progetti sono le card, i contatti la chiusura rossa.
 */
export const HOME_SECTIONS = {
  products: 'prodotti',
  projects: 'progetti',
  contact: 'contatti',
} as const

export const useHomeSections = () => {
  const { t } = useI18n()
  const localePath = useLocalePath()
  return computed(() => [
    { id: HOME_SECTIONS.products, label: t('nav.work') },
    { id: HOME_SECTIONS.projects, label: t('nav.projects') },
    { id: HOME_SECTIONS.contact, label: t('nav.contact') },
  ].map((s) => ({ ...s, to: { path: localePath('/'), hash: `#${s.id}` } })))
}
