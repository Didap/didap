import { cleanFileName, MAX_FILE_BYTES } from '#shared/grant-files'

// Caricamento di uno o più file (campi "file") in una cartella del bando.
// Le dimensioni si guardano tutte prima di caricare il primo.

// I browser scrivono " e gli a capo del nome come %22, %0D, %0A
const browserName = (filename = '') => filename.replace(/%22/g, '"').replace(/%0[AD]/gi, ' ')
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const folderId = uuidQuery(event, 'folder')
  const user = await requireUser(event)
  const store = requireFileStore()
  const sql = await useDb()
  await requireGrantFolder(sql, id)
  const parts = (await readMultipartFormData(event))?.filter(p => p.name === 'file') ?? []
  if (!parts.length) throw createError({ statusCode: 400, statusMessage: 'Nessun file' })
  for (const p of parts) {
    if (!p.data.length) throw createError({ statusCode: 413, statusMessage: 'File vuoto' })
    if (p.data.length > MAX_FILE_BYTES) throw createError({ statusCode: 413, statusMessage: 'File oltre 10 MB' })
  }
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
