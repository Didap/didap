// I Claude collegati con l'account della persona in sessione, l'indirizzo del
// connettore (dal server, mai dall'Host della richiesta) e se la persona ha
// la pagina Bandi, senza la quale non può collegare Claude
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return {
    links: await listLinks(await useDb(), user.id),
    mcpUrl: mcpResourceUrl(),
    hasBandi: user.pages.includes('bandi'),
  }
})
