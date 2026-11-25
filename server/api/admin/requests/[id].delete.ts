export default defineEventHandler(async (event) => {
  await deleteDidiRequest(await useDb(), uuidParam(event))
  return { ok: true }
})
