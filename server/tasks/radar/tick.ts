// Giro del radar bandi, ogni 15 minuti (nitro.scheduledTasks)
export default defineTask({
  meta: { name: 'radar:tick', description: 'Radar bandi: scarica, legge e manda la mail' },
  async run() {
    if (!hasDatabase()) return { result: 'no-db' }
    return { result: await radarTick(await useDb(), radarDeps()) }
  },
})
