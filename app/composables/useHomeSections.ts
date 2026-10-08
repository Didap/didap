/**
 * Voci della nav: ancore alle sezioni della home. Da qualsiasi pagina
 * portano alla home e scorrono alla sezione (vedi scroll-margin in main.css).
 */
export const HOME_SECTIONS = {
  products: 'prodotti',
  partners: 'partner',
  about: 'come-lavoriamo',
  contact: 'contatti',
} as const

export const useHomeSections = () => {
  const { t } = useI18n()
  const localePath = useLocalePath()
  return computed(() => [
    { id: HOME_SECTIONS.products, label: t('nav.work') },
    { id: HOME_SECTIONS.partners, label: t('nav.clients') },
    { id: HOME_SECTIONS.about, label: t('nav.about') },
    { id: HOME_SECTIONS.contact, label: t('nav.contact') },
  ].map((s) => ({ ...s, to: { path: localePath('/'), hash: `#${s.id}` } })))
}
