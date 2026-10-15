// Impostazioni dei preventivi: dati Didap e valori di partenza
export default defineEventHandler(async () => readSettings(await useDb()))
