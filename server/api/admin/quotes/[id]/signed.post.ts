// Carica la copia firmata dal cliente (PDF, facoltativa)
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const file = (await readMultipartFormData(event))?.find(p => p.name === 'file' && p.data?.length)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Nessun file' })
  await saveSignedPdf(await useDb(), id, { name: file.filename || 'Preventivo-firmato.pdf', data: file.data })
  return { ok: true }
})
