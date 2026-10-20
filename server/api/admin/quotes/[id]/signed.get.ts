// La copia firmata dal cliente
export default defineEventHandler(async (event) =>
  sendPdf(event, await readSignedPdf(await useDb(), uuidParam(event)), 'inline'))
