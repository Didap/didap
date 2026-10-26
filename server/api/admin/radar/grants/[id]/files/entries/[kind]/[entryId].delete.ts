// Elimina una cartella (con tutto quello che contiene) o un file
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const kind = entryKind(getRouterParam(event, 'kind'))
  const entryId = uuidParam(event, 'entryId')
  const store = requireFileStore()
  const sql = await useDb()
  await requireGrantFolder(sql, id)
  return deleteEntry(sql, store, id, kind, entryId)
})
