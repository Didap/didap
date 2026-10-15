import {
  isProductLocale,
  isProductSlug,
  productOverrideSchema,
} from '#shared/product'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const { locale } = getQuery(event)
  if (!isProductSlug(slug) || !isProductLocale(locale)) {
    throw createError({ statusCode: 400, statusMessage: 'Parametri non validi' })
  }

  await requireProduct(event, slug)

  const data = await readSchemaBody(event, productOverrideSchema)

  const sql = await useDb()
  const rows = await sql`
    insert into product_overrides (slug, locale, data, updated_at)
    values (${slug}, ${locale}, ${sql.json(data)}, now())
    on conflict (slug, locale)
    do update set data = excluded.data, updated_at = now()
    returning updated_at
  `
  return { ok: true, updatedAt: rows[0]?.updated_at }
})
