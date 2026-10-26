export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  await deleteUser(await useDb(), (await requireUser(event)).id, id)
  return { ok: true }
})
