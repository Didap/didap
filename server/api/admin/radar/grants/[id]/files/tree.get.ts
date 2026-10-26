// Tutte le cartelle del bando in una lettura, in ordine d'albero (per "Sposta in...")
export default defineEventHandler(async event =>
  folderTree(await useDb(), uuidParam(event)))
