// Upload di loghi e immagini prodotto, salvati nel database
const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set([
  'image/svg+xml',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
])

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file' && p.data?.length)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Nessun file' })
  if (!file.type || !ALLOWED.has(file.type)) {
    throw createError({ statusCode: 415, statusMessage: 'Formato non supportato' })
  }
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'File oltre 8 MB' })
  }

  const sql = await useDb()
  const rows = await sql`
    insert into assets (mime, filename, bytes)
    values (${file.type}, ${file.filename ?? null}, ${file.data})
    returning id
  `
  return { url: `/api/assets/${rows[0]!.id}` }
})
