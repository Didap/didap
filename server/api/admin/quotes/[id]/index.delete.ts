// Solo bozze mai emesse
export default defineEventHandler(async (event) => {
  await deleteQuote(await useDb(), uuidParam(event))
  return { ok: true }
})
