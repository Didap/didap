export default defineEventHandler(async (event) =>
  duplicateQuote(await useDb(), uuidParam(event), new Date()),
)
