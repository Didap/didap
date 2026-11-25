import { z } from 'zod'
import { REQUEST_STATUSES } from '#shared/didi-requests'

// Segna una richiesta come gestita, o di nuovo da gestire
const BodySchema = z.object({ status: z.enum(REQUEST_STATUSES) })

export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const { status } = await readSchemaBody(event, BodySchema)
  return setDidiRequestStatus(await useDb(), id, status)
})
