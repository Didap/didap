// Una richiesta con la conversazione intera, quando si apre in /admin/richieste
export default defineEventHandler(async (event) => getDidiRequest(await useDb(), uuidParam(event)))
