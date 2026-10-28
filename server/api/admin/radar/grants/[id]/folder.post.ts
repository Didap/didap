// "Crea cartella del bando": la crea e parte il riempimento in background
// (il pannello segue lo stato del bando); se è già riempita, "ready"
export default defineEventHandler(async event => startGrantFolder(await useDb(), requireFileStore(), uuidParam(event)))
