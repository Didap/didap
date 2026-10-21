// Registro degli import, dal più recente
export default defineEventHandler(async () => listRuns(await useDb()))
