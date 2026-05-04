/**
 * Risolve il nome della collezione di Nuxt Content in base
 * al tipo (clients | work) e alla locale corrente.
 *
 * Le collezioni sono definite in /content.config.ts come:
 *   clients_it, clients_en, work_it, work_en
 */
export type ProjectKind = 'clients' | 'work'

export const useProjectCollection = (kind: ProjectKind) => {
  const { locale } = useI18n()
  return computed(
    () => `${kind}_${locale.value}` as `${ProjectKind}_${'it' | 'en'}`,
  )
}
