// I byte di un file, passando dal server: il browser non vede mai Cloudinary.
// PDF e immagini si aprono nel browser, il resto (e ?download=1) si scarica.
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const fileId = uuidParam(event, 'fileId')
  const store = requireFileStore()
  const file = await readFileEntry(await useDb(), id, fileId)
  const data = await store.get(file.storeKey)
  setResponseHeaders(event, fileHeaders(file.name, file.mime, getQuery(event).download === '1'))
  return data
})
