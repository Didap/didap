// "Aggiorna ora": il giro parte in background, il pannello segue lo stato
export default defineEventHandler(async (event) => {
  await radarRunNow(await useDb(), radarDeps())
  setResponseStatus(event, 202)
  return { started: true }
})
