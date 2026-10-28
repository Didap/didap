import { userCreateSchema } from '#shared/users'

export default defineEventHandler(async (event) => {
  const input = await readSchemaBody(event, userCreateSchema)
  const user = await createUser(await useDb(), input)
  return { user, inviteUrl: await sendInvite(user) }
})
