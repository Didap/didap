// Le richieste arrivate dalla chat con Didi, le più recenti prima
export default defineEventHandler(async () => listDidiRequests(await useDb()))
