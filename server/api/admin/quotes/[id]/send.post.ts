// Manda al cliente l'ultima revisione confermata (PDF allegato e link)
export default defineEventHandler(async (event) => {
  if (!hasMailer()) throw createError({ statusCode: 503, statusMessage: 'Email non configurata (RESEND_API_KEY)' })
  const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || getRequestURL(event).origin
  return sendQuote(await useDb(), uuidParam(event), { mailer: resendMailer(), siteUrl, now: new Date() })
})
