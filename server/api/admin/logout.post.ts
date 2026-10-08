export default defineEventHandler(async (event) => {
  await endAdminSession(event)
  return { ok: true }
})
