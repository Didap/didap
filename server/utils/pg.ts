// Codice di errore di Postgres (23503 = chiave esterna violata, ...)
export const pgCode = (err: unknown) => (err as { code?: string }).code
