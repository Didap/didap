import { romeDate } from '#shared/dates'

export default defineEventHandler(async () => listQuotes(await useDb(), romeDate(new Date())))
