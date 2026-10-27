import { draftSaveSchema } from '#shared/grant-draft'

// Salva la bozza dalla versione letta (null: prima bozza); se nel frattempo
// qualcuno ha salvato, 409 con la bozza attuale in `data`. Senza Cloudinary
// la bozza si salva lo stesso, senza riempire la cartella.
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const user = await requireUser(event)
  const { content, baseVersion } = await readSchemaBody(event, draftSaveSchema)
  const { draft } = await saveDraftAndFill(await useDb(), useFileStore(), {
    grantId: id,
    content,
    baseVersion,
    savedBy: user.name,
    byClaude: false,
  })
  return { draft }
})
