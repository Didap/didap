// PDF di una revisione emessa, così com'era
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const rev = Number(getRouterParam(event, 'rev'))
  if (!Number.isInteger(rev) || rev < 1) throw createError({ statusCode: 404, statusMessage: 'Non trovato' })
  const file = await getRevisionPdf(await useDb(), id, rev)
  if (!file) throw createError({ statusCode: 404, statusMessage: 'Revisione non trovata' })
  return sendPdf(event, file, 'inline')
})
