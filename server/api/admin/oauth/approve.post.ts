// Consenti: ricontrolla tutto, crea il codice (60 secondi, una volta sola) e
// dà l'indirizzo di ritorno su cui il browser porta il codice a Claude
export default defineEventHandler(async (event) => {
  rateLimit('oauth-approve', event, { max: 30, windowMs: OAUTH_WINDOW_MS })
  const { query, client, user } = await readConsentRequest(event)
  if (!user.pages.includes('bandi')) {
    throw createError({ statusCode: 403, statusMessage: 'Il tuo account non ha accesso ai Bandi' })
  }
  let code
  try {
    code = await issueCode(await useDb(), {
      clientId: client.id,
      userId: user.id,
      redirectUri: query.redirect_uri,
      codeChallenge: query.code_challenge,
    })
  }
  catch (err) {
    // Client o persona spariti tra il controllo e l'insert (chiave esterna)
    if (pgCode(err) === '23503') {
      throw createError({ statusCode: 400, statusMessage: 'Richiesta di collegamento non valida' })
    }
    throw err
  }
  const redirect = new URL(query.redirect_uri)
  redirect.searchParams.set('code', code)
  if (query.state !== undefined) redirect.searchParams.set('state', query.state)
  return { redirect: redirect.toString() }
})
