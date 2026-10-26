import { z } from 'zod'

// Nuova cartella; con un nome già usato prende "(2)"
const folderSchema = z.object({ parentId: z.string().uuid().nullable(), name: z.string() }).strict()

export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const { parentId, name } = await readSchemaBody(event, folderSchema)
  const sql = await useDb()
  await requireGrantFolder(sql, id)
  return createFolder(sql, id, parentId, name)
})
