import { isProductLocale, isProductSlug } from '#shared/product'

// Ripristina il prodotto ai soli contenuti markdown
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const { locale } = getQuery(event)
  if (!isProductSlug(slug) || !isProductLocale(locale)) {
    throw createError({ statusCode: 400, statusMessage: 'Parametri non validi' })
  }
  const sql = await useDb()
  await sql`delete from product_overrides where slug = ${slug} and locale = ${locale}`
  return { ok: true }
})
