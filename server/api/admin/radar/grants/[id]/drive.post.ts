// "Crea cartella su Drive": parte in background (il pannello segue lo
// stato del bando); se la cartella c'è già, il suo link
export default defineEventHandler(async event => startGrantFolder(await useDb(), uuidParam(event)))
