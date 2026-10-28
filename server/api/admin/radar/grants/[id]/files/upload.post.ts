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
  // Anche addFile lo controlla, ma qui si fa prima di leggere il corpo (fino
  // a 100 MB in memoria): niente lettura per un bando senza cartella o una
  // cartella che non c'è
  await requireGrantFolder(sql, id, folderId)
  checkUploadLength(getRequestHeader(event, 'content-length'))
  const parts = (await readMultipartFormData(event))?.filter(p => p.name === 'file') ?? []
  checkUploadParts(parts.map(p => p.data.length))
  const added = []
  for (const p of parts) {
    const name = cleanFileName(browserName(p.filename), 'file')
    added.push(await addFile(sql, store, {
      grantId: id,
      folderId,
      name,
      mime: uploadMime(p.type, name),
      data: p.data,
      userId: user.id,
    }))
  }
  return added
})
