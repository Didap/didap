export default defineEventHandler(async () => listUsers(await useDb()))
