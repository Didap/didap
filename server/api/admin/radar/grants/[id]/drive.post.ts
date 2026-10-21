// "Crea cartella su Drive": la cartella del bando col bando esportato e i
// suoi PDF; se esiste già, il suo link
export default defineEventHandler(async event => createGrantFolder(await useDb(), uuidParam(event)))
