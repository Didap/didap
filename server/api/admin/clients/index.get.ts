export default defineEventHandler(async () => listClients(await useDb()))
