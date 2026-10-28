import { createError, getQuery, getRouterParam, readBody, setResponseHeaders, type H3Event } from 'h3'
import type { z } from 'zod'

// Parametri, corpo e PDF delle API: id non validi danno 404, corpi non
// validi 422 con i dettagli di zod (come le API dei prodotti).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value: string) => UUID.test(value)

export function uuidParam(event: H3Event, name = 'id') {
  const value = getRouterParam(event, name) ?? ''
  if (!UUID.test(value)) throw createError({ statusCode: 404, statusMessage: 'Non trovato' })
  return value
}

// Id facoltativo nella query (?folder=...): assente è null, non valido 404
export function uuidQuery(event: H3Event, name: string): string | null {
  const value = getQuery(event)[name]
  if (value === undefined || value === '') return null
  if (typeof value !== 'string' || !UUID.test(value)) throw createError({ statusCode: 404, statusMessage: 'Non trovato' })
  return value
}

export async function readSchemaBody<T extends z.ZodTypeAny>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Dati non validi', data: parsed.error.flatten() })
  }
  return parsed.data
}

export function sendPdf(
  event: H3Event,
  file: { pdf: Buffer; filename: string },
  disposition: 'inline' | 'attachment',
) {
  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${disposition}; filename="${file.filename}"`,
  })
  return file.pdf
}
