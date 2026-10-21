import { radarSearchSchema } from '#shared/radar'

// "Importa": i moduli e i comuni spuntati a sinistra. Il giro parte in
// background, il pannello segue lo stato e il registro.
const scopeSchema = radarSearchSchema.pick({ groups: true, comuni: true }).strict()

export default defineEventHandler(async (event) => {
  const scope = await readSchemaBody(event, scopeSchema)
  await radarRunNow(await useDb(), radarDeps(), scope)
  setResponseStatus(event, 202)
  return { started: true }
})
