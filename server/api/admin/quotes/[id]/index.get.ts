import { romeDate } from '#shared/dates'

export default defineEventHandler(async (event) =>
  getQuote(await useDb(), uuidParam(event), romeDate(new Date())),
)
