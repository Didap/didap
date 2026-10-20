// "Invia ora": manda subito la mail coi bandi nuovi, se ce ne sono
export default defineEventHandler(async () => ({ sent: await radarDigestNow(await useDb(), radarDeps()) }))
