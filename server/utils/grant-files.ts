import { createError } from 'h3'
import type postgres from 'postgres'
import type { EntryKind, FileEntry, FolderEntry, FolderListing } from '#shared/grant-files'
import { entryNameSchema, MAX_FILE_BYTES, uniqueName } from '#shared/grant-files'
import { type FileStore, grantFileKey } from './file-store'

// Cartella del bando: sottocartelle e file su Postgres, i byte nel file store

type Sql = postgres.Sql

// Serializza le scritture sulla cartella di un bando (con hashtext dell'id)
const FILES_LOCK = 7_301_002

const grantNotFound = () => createError({ statusCode: 404, statusMessage: 'Bando non trovato' })
const folderNotFound = () => createError({ statusCode: 404, statusMessage: 'Cartella non trovata' })
const fileNotFound = () => createError({ statusCode: 404, statusMessage: 'File non trovato' })
const nameTaken = () => createError({ statusCode: 409, statusMessage: 'Esiste già un elemento con questo nome' })

function cleanName(name: string): string {
  const r = entryNameSchema.safeParse(name)
  if (!r.success) throw createError({ statusCode: 400, statusMessage: 'Nome non valido' })
  return r.data
}

const iso = (d: unknown) => new Date(d as string).toISOString()

function rowToFolder(r: postgres.Row): FolderEntry {
  return { id: r.id, name: r.name, createdAt: iso(r.created_at), fileCount: r.file_count ?? 0 }
}

function rowToFile(r: postgres.Row): FileEntry {
  return {
    id: r.id,
    name: r.name,
    mime: r.mime,
    bytes: r.bytes,
    createdAt: iso(r.created_at),
    uploadedBy: r.uploader ?? null,
  }
}

async function lockGrant(tx: Sql, grantId: string) {
  await tx`select pg_advisory_xact_lock(${FILES_LOCK}, hashtext(${grantId}))`
}

// La cartella esiste ed è di quel bando (null: la principale, basta il bando)
async function assertFolder(sql: Sql, grantId: string, folderId: string | null) {
  if (folderId === null) {
    const [g] = await sql`select 1 from radar_grants where id = ${grantId}`
    if (!g) throw grantNotFound()
    return
  }
  const [f] = await sql`select 1 from grant_folders where id = ${folderId} and grant_id = ${grantId}`
  if (!f) throw folderNotFound()
}

// Nome dell'elemento e cartella che lo contiene; 404 se non è di quel bando
async function findEntry(sql: Sql, grantId: string, kind: EntryKind, id: string): Promise<{ name: string, parent: string | null }> {
  if (kind === 'folder') {
    const [r] = await sql`select name, parent_id from grant_folders where id = ${id} and grant_id = ${grantId}`
    if (!r) throw folderNotFound()
    return { name: r.name, parent: r.parent_id }
  }
  const [r] = await sql`select name, folder_id from grant_files where id = ${id} and grant_id = ${grantId}`
  if (!r) throw fileNotFound()
  return { name: r.name, parent: r.folder_id }
}

async function namesIn(sql: Sql, grantId: string, folderId: string | null): Promise<Set<string>> {
  const rows = await sql`
    select name from grant_folders where grant_id = ${grantId} and parent_id is not distinct from ${folderId}
    union all
    select name from grant_files where grant_id = ${grantId} and folder_id is not distinct from ${folderId}
  `
  return new Set(rows.map(r => r.name as string))
}

// Il nome è già di un altro elemento della cartella (senza maiuscole)
async function isTaken(sql: Sql, grantId: string, folderId: string | null, name: string, kind: EntryKind, id: string) {
  const selfFolder = kind === 'folder' ? id : null
  const selfFile = kind === 'file' ? id : null
  const [r] = await sql`
    select 1 from grant_folders
    where grant_id = ${grantId} and parent_id is not distinct from ${folderId}
      and lower(name) = lower(${name}) and id is distinct from ${selfFolder}
    union all
    select 1 from grant_files
    where grant_id = ${grantId} and folder_id is not distinct from ${folderId}
      and lower(name) = lower(${name}) and id is distinct from ${selfFile}
    limit 1
  `
  return !!r
}

// Il tipo nell'indirizzo delle API (.../entries/:kind/:id); altro è 404
export function entryKind(value: string | undefined): EntryKind {
  if (value === 'folder' || value === 'file') return value
  throw createError({ statusCode: 404, statusMessage: 'Non trovato' })
}

// Le API scrivono solo nella cartella di un bando che ce l'ha (folder_at lo
// protegge dalla pulizia del radar)
export async function requireGrantFolder(sql: Sql, grantId: string): Promise<void> {
  const [g] = await sql`select folder_at from radar_grants where id = ${grantId}`
  if (!g) throw grantNotFound()
  if (!g.folder_at) throw createError({ statusCode: 409, statusMessage: 'Crea prima la cartella del bando' })
}

// Nomi presenti in una cartella, per il riempimento
export async function folderNames(sql: Sql, grantId: string, folderId: string | null): Promise<Set<string>> {
  await assertFolder(sql, grantId, folderId)
  return namesIn(sql, grantId, folderId)
}

export async function listFolder(sql: Sql, grantId: string, folderId: string | null): Promise<FolderListing> {
  const [grant] = await sql`select title from radar_grants where id = ${grantId}`
  if (!grant) throw grantNotFound()
  // Dalla cartella aperta fino alla principale
  const up = folderId === null
    ? []
    : await sql`
        with recursive up as (
          select id, parent_id, name, 0 as depth from grant_folders
          where id = ${folderId} and grant_id = ${grantId}
          union all
          select f.id, f.parent_id, f.name, up.depth + 1 from grant_folders f join up on f.id = up.parent_id
        )
        select id, name from up order by depth desc
      `
  if (folderId !== null && !up.length) throw folderNotFound()
  // fileCount: file della cartella e di tutte le sue discendenti
  const folders = await sql`
    with recursive tree as (
      select id as root, id from grant_folders
      where grant_id = ${grantId} and parent_id is not distinct from ${folderId}
      union all
      select t.root, f.id from grant_folders f join tree t on f.parent_id = t.id
    )
    select g.id, g.name, g.created_at,
      (select count(*)::int from grant_files fi join tree t on fi.folder_id = t.id where t.root = g.id) as file_count
    from grant_folders g
    where g.grant_id = ${grantId} and g.parent_id is not distinct from ${folderId}
    order by lower(g.name), g.name
  `
  const files = await sql`
    select fi.*, u.name as uploader from grant_files fi
    left join admin_users u on u.id = fi.uploaded_by
    where fi.grant_id = ${grantId} and fi.folder_id is not distinct from ${folderId}
    order by lower(fi.name), fi.name
  `
  return {
    path: [{ id: null, name: grant.title }, ...up.map(r => ({ id: r.id as string, name: r.name as string }))],
    folders: folders.map(rowToFolder),
    files: files.map(rowToFile),
  }
}

export async function createFolder(sql: Sql, grantId: string, parentId: string | null, name: string): Promise<FolderEntry> {
  const clean = cleanName(name)
  return await sql.begin(async (tx) => {
    const t = tx as unknown as Sql
    await lockGrant(t, grantId)
    await assertFolder(t, grantId, parentId)
    const free = uniqueName(await namesIn(t, grantId, parentId), clean)
    const [row] = await t`
      insert into grant_folders (grant_id, parent_id, name)
      values (${grantId}, ${parentId}, ${free})
      returning *
    `
    return rowToFolder(row!)
  }) as FolderEntry
}

// Prima i byte nello store, poi la riga; se la riga non entra, i byte escono
export async function addFile(
  sql: Sql,
  store: FileStore,
  f: { grantId: string, folderId: string | null, name: string, mime: string, data: Buffer, userId: string | null },
): Promise<FileEntry> {
  if (f.data.length > MAX_FILE_BYTES) throw createError({ statusCode: 413, statusMessage: 'File oltre 10 MB' })
  const clean = cleanName(f.name)
  // Controllo prima di caricare: niente byte inutili su una cartella sbagliata
  await assertFolder(sql, f.grantId, f.folderId)
  const key = grantFileKey(f.grantId)
  await store.put(key, f.data, clean)
  try {
    return await sql.begin(async (tx) => {
      const t = tx as unknown as Sql
      await lockGrant(t, f.grantId)
      await assertFolder(t, f.grantId, f.folderId)
      const free = uniqueName(await namesIn(t, f.grantId, f.folderId), clean)
      const [row] = await t`
        with ins as (
          insert into grant_files (grant_id, folder_id, name, mime, bytes, store_key, uploaded_by)
          values (${f.grantId}, ${f.folderId}, ${free}, ${f.mime}, ${f.data.length}, ${key}, ${f.userId})
          returning *
        )
        select ins.*, u.name as uploader from ins left join admin_users u on u.id = ins.uploaded_by
      `
      return rowToFile(row!)
    }) as FileEntry
  }
  catch (err) {
    await store.remove(key).catch(e => console.error(`File store: ${key} non rimosso`, e))
    throw err
  }
}

export async function renameEntry(sql: Sql, grantId: string, kind: EntryKind, id: string, name: string): Promise<void> {
  const clean = cleanName(name)
  await sql.begin(async (tx) => {
    const t = tx as unknown as Sql
    await lockGrant(t, grantId)
    const { parent } = await findEntry(t, grantId, kind, id)
    if (await isTaken(t, grantId, parent, clean, kind, id)) throw nameTaken()
    if (kind === 'folder') await t`update grant_folders set name = ${clean} where id = ${id}`
    else await t`update grant_files set name = ${clean} where id = ${id}`
  })
}

export async function moveEntry(
  sql: Sql,
  grantId: string,
  kind: EntryKind,
  id: string,
  targetFolderId: string | null,
): Promise<void> {
  await sql.begin(async (tx) => {
    const t = tx as unknown as Sql
    await lockGrant(t, grantId)
    const { name } = await findEntry(t, grantId, kind, id)
    await assertFolder(t, grantId, targetFolderId)
    if (kind === 'folder' && targetFolderId !== null) {
      // La destinazione non può essere la cartella stessa o una sua discendente
      const [inside] = await t`
        with recursive down as (
          select id from grant_folders where id = ${id}
          union all
          select f.id from grant_folders f join down d on f.parent_id = d.id
        )
        select 1 from down where id = ${targetFolderId}
      `
      if (inside) throw createError({ statusCode: 400, statusMessage: 'Non puoi spostare una cartella dentro sé stessa' })
    }
    if (await isTaken(t, grantId, targetFolderId, name, kind, id)) throw nameTaken()
    if (kind === 'folder') await t`update grant_folders set parent_id = ${targetFolderId} where id = ${id}`
    else await t`update grant_files set folder_id = ${targetFolderId} where id = ${id}`
  })
}

// Cancella le righe e poi i byte dallo store: un guasto dello store va nel
// log e non riporta indietro la cancellazione
export async function deleteEntry(
  sql: Sql,
  store: FileStore,
  grantId: string,
  kind: EntryKind,
  id: string,
): Promise<{ files: number }> {
  const keys = await sql.begin(async (tx) => {
    const t = tx as unknown as Sql
    await lockGrant(t, grantId)
    await findEntry(t, grantId, kind, id)
    if (kind === 'file') {
      const [row] = await t`delete from grant_files where id = ${id} returning store_key`
      return [row!.store_key as string]
    }
    const rows = await t`
      with recursive down as (
        select id from grant_folders where id = ${id}
        union all
        select f.id from grant_folders f join down d on f.parent_id = d.id
      )
      select store_key from grant_files where folder_id in (select id from down)
    `
    await t`delete from grant_folders where id = ${id}`
    return rows.map(r => r.store_key as string)
  }) as string[]
  for (const key of keys) {
    try {
      await store.remove(key)
    }
    catch (err) {
      console.error(`File store: ${key} non rimosso`, err)
    }
  }
  return { files: keys.length }
}

export async function readFileEntry(
  sql: Sql,
  grantId: string,
  fileId: string,
): Promise<{ name: string, mime: string, storeKey: string }> {
  const [row] = await sql`select name, mime, store_key from grant_files where id = ${fileId} and grant_id = ${grantId}`
  if (!row) throw fileNotFound()
  return { name: row.name, mime: row.mime, storeKey: row.store_key }
}
