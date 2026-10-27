// Pagina di consenso: la richiesta di Claude è valida? Il corpo è la query
// di /oauth/authorize. Risponde chi chiede, chi è la persona e dove si torna
export default defineEventHandler(async (event) => {
  const { query, client, user } = await readConsentRequest(event)
  return {
    clientName: client.name,
    redirectHost: new URL(query.redirect_uri).host,
    user: { name: user.name, email: user.email },
    hasBandi: user.pages.includes('bandi'),
  }
})
