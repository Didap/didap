// I Claude collegati con l'account della persona in sessione
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return await listLinks(await useDb(), user.id)
})
