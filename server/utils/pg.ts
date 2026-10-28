import type postgres from 'postgres'

type Sql = postgres.Sql

// Codice di errore di Postgres (23503 = chiave esterna violata, ...)
export const pgCode = (err: unknown) => (err as { code?: string }).code

// Transazione con `t` usabile come un Sql qualunque: per TypeScript il
// TransactionSql di postgres.js non lo è, il cast sta solo qui
export async function inTx<T>(sql: Sql, fn: (t: Sql) => Promise<T>): Promise<T> {
  return await sql.begin(tx => fn(tx as unknown as Sql)) as T
}
