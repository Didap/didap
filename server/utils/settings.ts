import type postgres from 'postgres'
import { parseSettings, type Settings } from '#shared/settings'

// Impostazioni dei preventivi: una riga sola (id = 1)

export async function readSettings(sql: postgres.Sql): Promise<Settings> {
  const [row] = await sql`select data from settings where id = 1`
  return parseSettings(row?.data)
}

export async function writeSettings(sql: postgres.Sql, data: Settings): Promise<void> {
  await sql`
    insert into settings (id, data, updated_at)
    values (1, ${sql.json(data)}, now())
    on conflict (id) do update set data = excluded.data, updated_at = now()
  `
}
