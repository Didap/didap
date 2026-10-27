// Scollega un Claude: i suoi token smettono di valere subito. Un id non
// della persona dà 404.
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const user = await requireUser(event)
  await revokeLink(await useDb(), user.id, id)
  return { ok: true }
})
