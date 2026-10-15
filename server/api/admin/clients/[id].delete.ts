export default defineEventHandler(async (event) => {
  await deleteClient(await useDb(), uuidParam(event))
  return { ok: true }
})
