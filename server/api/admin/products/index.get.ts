// Elenco delle modifiche salvate: per ogni prodotto e lingua, quando e
// con quale nome e stato (per mostrarli nell'elenco di /admin)
export default defineEventHandler(async () => {
  const sql = await useDb()
  const rows = await sql`
    select slug, locale, updated_at, data->>'title' as title, data->'status' as status
    from product_overrides
    order by updated_at desc
  `
  return rows.map((r) => ({
    slug: r.slug as string,
    locale: r.locale as string,
    updatedAt: r.updated_at as string,
    title: (r.title as string | null) ?? undefined,
    // undefined = non modificato, null = stato tolto
    status: r.status as 'live' | 'pilot' | 'pending' | null | undefined,
  }))
})
