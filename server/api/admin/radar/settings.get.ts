// Parametri dell'azienda e impostazioni della mail del radar
export default defineEventHandler(async () => readRadarSettings(await useDb()))
