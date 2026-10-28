// Elimina una cartella (con tutto quello che contiene) o un file
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const kind = entryKind(getRouterParam(event, 'kind'))
  const entryId = uuidParam(event, 'entryId')
  const store = requireFileStore()
  // Il bando con la cartella lo controlla deleteEntry
  return deleteEntry(await useDb(), store, id, kind, entryId)
})
