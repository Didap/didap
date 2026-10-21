// "Svuota i dati": via bandi e testi letti; impostazioni e registro restano
export default defineEventHandler(async () => ({ deleted: await radarWipe(await useDb()) }))
