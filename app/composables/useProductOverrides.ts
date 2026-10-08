import type { ProductOverride } from '#shared/product'

/**
 * Modifiche salvate da /admin per i prodotti della lingua corrente,
 * come mappa { slug: campi }. Vanno sovrapposte al frontmatter markdown.
 */
export const useProductOverrides = () => {
  const { locale } = useI18n()
  return useAsyncData(
    () => `product-overrides-${locale.value}`,
    () =>
      $fetch<Record<string, ProductOverride>>('/api/products/overrides', {
        query: { locale: locale.value },
      }),
    { default: (): Record<string, ProductOverride> => ({}) },
  )
}

/** Frontmatter + modifiche admin: le chiavi salvate vincono. */
export const mergeProduct = <T extends object>(
  base: T,
  override: ProductOverride | undefined,
) => ({ ...base, ...(override ?? {}) }) as T & ProductOverride

/**
 * Bozza non salvata inviata da /admin all'anteprima (iframe con ?preview=1).
 * Vale solo in quella scheda del browser.
 */
export const useProductPreview = () =>
  useState<{ slug: string; locale: string; data: ProductOverride } | null>(
    'product-preview',
    () => null,
  )

/**
 * Prodotto (markdown + modifiche admin) per slug. Usato dalla scheda e
 * dalla nav: stesse chiavi, quindi i dati si caricano una volta sola.
 * Con slug vuoto non interroga nulla.
 */
export const useProductPage = async (slug: MaybeRefOrGetter<string>) => {
  const { locale } = useI18n()
  const collection = useProjectCollection('work')
  const preview = useProductPreview()

  // Entrambe registrate prima di qualsiasi await (useI18n richiede il setup)
  const baseRequest = useAsyncData(
    () => `work-${locale.value}-${toValue(slug)}`,
    () =>
      toValue(slug)
        ? queryCollection(collection.value)
            .where('stem', 'LIKE', `%/${toValue(slug)}`)
            .first()
        : Promise.resolve(null),
    { watch: [collection, () => toValue(slug)] },
  )
  const overridesRequest = useProductOverrides()
  const [{ data: base }, { data: overrides }] = await Promise.all([
    baseRequest,
    overridesRequest,
  ])

  const project = computed(() => {
    if (!base.value) return null
    const draft = preview.value
    const override
      = draft && draft.slug === toValue(slug) && draft.locale === locale.value
        ? draft.data
        : overrides.value?.[toValue(slug)]
    return mergeProduct(base.value, override)
  })

  return { base, overrides, project }
}
