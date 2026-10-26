import { z } from 'zod'

// Nuova cartella; con un nome già usato prende "(2)"
const folderSchema = z.object({ parentId: z.string().uuid().nullable(), name: z.string() }).strict()

export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const { parentId, name } = await readSchemaBody(event, folderSchema)
  // Bando con la cartella e cartella madre li controlla createFolder
  return createFolder(await useDb(), id, parentId, name)
})
