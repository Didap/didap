// Elenco di una cartella del bando (senza ?folder: la principale)
export default defineEventHandler(async event =>
  listFolder(await useDb(), uuidParam(event), uuidQuery(event, 'folder')))
