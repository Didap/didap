// "Controlla esito": il modello cerca l'esito sul web in background (il
// pannello segue lo stato del bando)
export default defineEventHandler(async (event) => {
  await startGrantOutcome(await useDb(), hasLlm() ? llmOutcomeFinder : null, uuidParam(event))
  return { checking: true }
})
