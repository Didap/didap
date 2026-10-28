// "Svuota i dati": via bandi e testi letti, tranne i bandi con cartella;
// impostazioni e registro restano
export default defineEventHandler(async () => radarWipe(await useDb()))
