// Scarica il PDF dell'ultima revisione dal link del cliente
export default defineEventHandler(async (event) => {
  const file = await getPublicPdf(await useDb(), getRouterParam(event, 'token') ?? '')
  if (!file) throw createError({ statusCode: 404, statusMessage: 'Non trovato' })
  return sendPdf(event, file, 'attachment')
})
