import { z } from 'zod'

// Rinomina ({ name }) o sposta ({ folderId }, null: la principale) una cartella o un file
const patchSchema = z.union([
  z.object({ name: z.string() }).strict(),
  z.object({ folderId: z.string().uuid().nullable() }).strict(),
])

export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const kind = entryKind(getRouterParam(event, 'kind'))
  const entryId = uuidParam(event, 'entryId')
  const body = await readSchemaBody(event, patchSchema)
  const sql = await useDb()
  // Il bando con la cartella lo controllano renameEntry e moveEntry
  if ('name' in body) await renameEntry(sql, id, kind, entryId, body.name)
  else await moveEntry(sql, id, kind, entryId, body.folderId)
  return { ok: true }
})
