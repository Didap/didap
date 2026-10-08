// Serve gli asset caricati da /admin. Gli id sono immutabili, quindi
// cache lunga; CSP e sandbox evitano che un SVG esegua script.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const sql = await useDb()
  const rows = await sql`select mime, bytes from assets where id = ${id}`
  const asset = rows[0]
  if (!asset) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  setResponseHeaders(event, {
    'Content-Type': asset.mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  })
  return asset.bytes as Buffer
})
