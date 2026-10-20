// Toglie la copia firmata (il preventivo resta nel suo stato)
export default defineEventHandler(async (event) => {
  await removeSignedPdf(await useDb(), uuidParam(event))
  return { ok: true }
})
