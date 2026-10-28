// Messaggio leggibile da un errore di $fetch verso le API admin

export function adminErrorText(err: unknown): string {
  const e = err as {
    statusCode?: number
    statusMessage?: string
    data?: { data?: { problems?: string[] } }
  }
  if (e.statusCode === 401) {
    refreshAdminSession()
    return 'Sessione scaduta, accedi di nuovo'
  }
  // Pagina tolta nel frattempo: con la sessione aggiornata il guscio porta altrove
  if (e.statusCode === 403) refreshAdminSession()
  const problems = e.data?.data?.problems
  if (problems?.length) return problems.join(' · ')
  if (e.statusCode === 422 && e.statusMessage === 'Dati non validi') return 'Alcuni campi non sono validi'
  return e.statusMessage ?? 'Operazione non riuscita'
}
