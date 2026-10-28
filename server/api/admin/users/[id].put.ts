import { userUpdateSchema } from '#shared/users'

export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const input = await readSchemaBody(event, userUpdateSchema)
  return updateUser(await useDb(), (await requireUser(event)).id, id, input)
})
