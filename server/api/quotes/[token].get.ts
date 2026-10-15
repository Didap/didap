import { romeDate } from '#shared/dates'

// Preventivo per il cliente: ultima revisione emessa. Fuori da
// /api/admin, quindi senza sessione: basta il token.
export default defineEventHandler(async (event) => {
  const found = await getPublicQuote(await useDb(), getRouterParam(event, 'token') ?? '', romeDate(new Date()))
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Non trovato' })
  return found
})
