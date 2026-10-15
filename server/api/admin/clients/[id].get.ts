export default defineEventHandler(async (event) => getClient(await useDb(), uuidParam(event)))
