// Nuova bozza con i valori di partenza delle impostazioni
export default defineEventHandler(async () => createQuote(await useDb(), new Date()))
