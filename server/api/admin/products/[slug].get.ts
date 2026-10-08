import { isProductLocale, isProductSlug } from '#shared/product'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const { locale } = getQuery(event)
  if (!isProductSlug(slug) || !isProductLocale(locale)) {
    throw createError({ statusCode: 400, statusMessage: 'Parametri non validi' })
  }
  const sql = await useDb()
  const rows = await sql`
    select data, updated_at from product_overrides
    where slug = ${slug} and locale = ${locale}
  `
  return rows[0] ? { data: rows[0].data, updatedAt: rows[0].updated_at } : null
})
