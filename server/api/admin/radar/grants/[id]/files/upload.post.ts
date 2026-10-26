import { cleanFileName } from '#shared/grant-files'

// Caricamento di uno o più file (campi "file") in una cartella del bando.
// Dimensione del corpo prima di leggerlo, poi numero e dimensione dei file
// tutti prima di caricare il primo.
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const folderId = uuidQuery(event, 'folder')
  const user = await requireUser(event)
  const store = requireFileStore()
  const sql = await useDb()
  await requireGrantFolder(sql, id)
  checkUploadLength(getRequestHeader(event, 'content-length'))
  const parts = (await readMultipartFormData(event))?.filter(p => p.name === 'file') ?? []
  checkUploadParts(parts.map(p => p.data.length))
  const added = []
  for (const p of parts) {
    added.push(await addFile(sql, store, {
      grantId: id,
      folderId,
      name: cleanFileName(browserName(p.filename), 'file'),
      mime: p.type || 'application/octet-stream',
      data: p.data,
      userId: user.id,
    }))
  }
  return added
})
