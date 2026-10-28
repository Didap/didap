export default defineEventHandler(async (event) => {
  const user = await getUser(await useDb(), uuidParam(event))
  // Reinvio solo a chi non ha ancora scelto la password
  if (user.status === 'attivo') throw createError({ statusCode: 409, statusMessage: 'Ha già scelto la password' })
  if (user.status === 'disattivato') throw createError({ statusCode: 409, statusMessage: 'Collaboratore disattivato' })
  return { inviteUrl: await sendInvite(user) }
})
