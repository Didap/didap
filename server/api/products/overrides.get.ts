import { isProductLocale } from '#shared/product'

// Modifiche da /admin per tutti i prodotti di una lingua: { slug: data }.
// Senza database risponde vuoto e restano i contenuti markdown.
export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isProductLocale(locale)) {
    throw createError({ statusCode: 400, statusMessage: 'Lingua non valida' })
  }
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  if (!hasDatabase()) return {}

  try {
    const sql = await useDb()
    const rows = await sql`
      select slug, data from product_overrides where locale = ${locale}
    `
    return Object.fromEntries(rows.map((r) => [r.slug, r.data]))
  }
  catch (err) {
    console.error('[products/overrides]', err)
    return {}
  }
})
