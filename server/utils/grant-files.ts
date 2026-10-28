import { createError } from 'h3'
import type postgres from 'postgres'
import type { EntryKind, FileEntry, FolderEntry, FolderListing, TreeRow } from '#shared/grant-files'
import { entryNameSchema, FILE_TOO_BIG, MAX_FILE_BYTES, uniqueName } from '#shared/grant-files'
import { type FileStore, grantFileKey } from './file-store'
import { inTx } from './pg'

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
    uploadedBy: r.uploaded_by_name ?? null,
  }
}

async function lockGrant(tx: Sql, grantId: string) {
  await tx`select pg_advisory_xact_lock(${FILES_LOCK}, hashtext(${grantId}))`
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

// Si scrive solo nella cartella di un bando che ce l'ha: folder_at lo protegge
// dalla pulizia del radar, che altrimenti cancella il bando e in cascata le
// righe, lasciando i file nello store. Il controllo sta dentro le scritture
// qui sotto, sotto il lucchetto del bando; le API non lo ripetono.
// `folderId`: anche che quella cartella sia del bando, nella stessa lettura.
export async function requireGrantFolder(sql: Sql, grantId: string, folderId: string | null = null): Promise<void> {
  const [g] = await sql`
    select folder_at,
      ${folderId}::uuid is null
        or exists (select 1 from grant_folders where id = ${folderId} and grant_id = ${grantId}) as folder_ok
    from radar_grants where id = ${grantId}
  `
  if (!g) throw grantNotFound()
  if (!g.folder_at) throw createError({ statusCode: 409, statusMessage: 'Crea prima la cartella del bando' })
  if (!g.folder_ok) throw folderNotFound()
}

// Ogni scrittura: transazione, lucchetto del bando e requireGrantFolder
// (`folderId`: la cartella in cui si scrive, che deve essere del bando)
function withGrantFolder<T>(sql: Sql, grantId: string, folderId: string | null, fn: (t: Sql) => Promise<T>): Promise<T> {
  return inTx(sql, async (t) => {
    await lockGrant(t, grantId)
    await requireGrantFolder(t, grantId, folderId)
    return fn(t)
  })
}

// Le quattro letture non dipendono l'una dall'altra: insieme, poi i 404
export async function listFolder(sql: Sql, grantId: string, folderId: string | null): Promise<FolderListing> {
  const [[grant], up, folders, files] = await Promise.all([
    sql`select title from radar_grants where id = ${grantId}`,
    // Dalla cartella aperta fino alla principale
    folderId === null
      ? []
      : sql`
          with recursive up as (
            select id, parent_id, name, 0 as depth from grant_folders
            where id = ${folderId} and grant_id = ${grantId}
            union all
            select f.id, f.parent_id, f.name, up.depth + 1 from grant_folders f join up on f.id = up.parent_id
          )
          select id, name from up order by depth desc
        `,
    // fileCount: file della cartella e di tutte le sue discendenti
    sql`
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
    `,
    sql`
      select * from grant_files
      where grant_id = ${grantId} and folder_id is not distinct from ${folderId}
      order by lower(name), name
    `,
  ])
  if (!grant) throw grantNotFound()
  if (folderId !== null && !up.length) throw folderNotFound()
  return {
    path: [{ id: null, name: grant.title }, ...up.map(r => ({ id: r.id as string, name: r.name as string }))],
    folders: folders.map(rowToFolder),
    files: files.map(rowToFile),
  }
}

// Tutte le cartelle del bando in una lettura, in ordine d'albero: ogni
// cartella prima delle sue figlie, le sorelle per nome come nell'elenco
export async function folderTree(sql: Sql, grantId: string): Promise<TreeRow[]> {
  const rows = await sql`
    with recursive ranked as (
      select id, parent_id, name,
        row_number() over (partition by parent_id order by lower(name), name, id) as rank
      from grant_folders where grant_id = ${grantId}
    ), tree as (
      select id, parent_id, name, array[rank] as path from ranked where parent_id is null
      union all
      select r.id, r.parent_id, r.name, t.path || r.rank from ranked r join tree t on r.parent_id = t.id
    )
    select id, parent_id, name from tree order by path
  `
  return rows.map(r => ({ id: r.id, parentId: r.parent_id, name: r.name }))
}

// Dentro la transazione, col lucchetto e i controlli già fatti
async function insertFolder(t: Sql, grantId: string, parentId: string | null, clean: string): Promise<FolderEntry> {
  const free = uniqueName(await namesIn(t, grantId, parentId), clean)
  const [row] = await t`
    insert into grant_folders (grant_id, parent_id, name)
    values (${grantId}, ${parentId}, ${free})
    returning *
  `
  return rowToFolder(row!)
}

export async function createFolder(sql: Sql, grantId: string, parentId: string | null, name: string): Promise<FolderEntry> {
  const clean = cleanName(name)
  return withGrantFolder(sql, grantId, parentId, t => insertFolder(t, grantId, parentId, clean))
}

// La cartella del riempimento ("Dal bando"): quella segnata sul bando, per id
// (anche rinominata o spostata), o se non c'è più una nuova nella principale,
// segnata. Sotto il lucchetto: due lavori non ne creano due. Con i nomi che
// contiene già, letti nella stessa transazione.
export async function grantSourceFolder(sql: Sql, grantId: string, name: string): Promise<{ id: string, names: Set<string> }> {
  const clean = cleanName(name)
  return withGrantFolder(sql, grantId, null, async (t) => {
    const [found] = await t`
      select f.id from radar_grants g join grant_folders f on f.id = g.folder_source_id and f.grant_id = g.id
      where g.id = ${grantId}
    `
    if (found) return { id: found.id as string, names: await namesIn(t, grantId, found.id) }
    const made = await insertFolder(t, grantId, null, clean)
    await t`update radar_grants set folder_source_id = ${made.id} where id = ${grantId}`
    return { id: made.id, names: new Set<string>() }
  })
}

type NewFile = { grantId: string, folderId: string | null, name: string, mime: string, data: Buffer, userId: string | null }

const removeKey = (store: FileStore, key: string) =>
  store.remove(key).catch(e => console.error(`File store: ${key} non rimosso`, e))

// Prima i byte nello store, poi la riga; se la riga non entra, i byte escono.
// Un nome occupato prende "(2)"; con `once` il file non si aggiunge (null).
async function storeFile(sql: Sql, store: FileStore, f: NewFile, once: boolean): Promise<FileEntry | null> {
  if (f.data.length > MAX_FILE_BYTES) throw createError({ statusCode: 413, statusMessage: FILE_TOO_BIG })
  const clean = cleanName(f.name)
  // Controllo prima di caricare: niente byte su un bando senza cartella o su
  // una cartella sbagliata. Si ripete sotto il lucchetto: il caricamento è
  // lungo e nel frattempo la cartella può sparire.
  await requireGrantFolder(sql, f.grantId, f.folderId)
  const key = grantFileKey(f.grantId)
  await store.put(key, f.data)
  let added: FileEntry | null
  try {
    added = await withGrantFolder(sql, f.grantId, f.folderId, async (t) => {
      const names = await namesIn(t, f.grantId, f.folderId)
      if (once && [...names].some(n => n.toLowerCase() === clean.toLowerCase())) return null
      // Il nome di chi carica si fissa qui: resta anche se la persona viene eliminata
      const [row] = await t`
        insert into grant_files (grant_id, folder_id, name, mime, bytes, store_key, uploaded_by, uploaded_by_name)
        values (
          ${f.grantId}, ${f.folderId}, ${uniqueName(names, clean)}, ${f.mime}, ${f.data.length}, ${key}, ${f.userId},
          (select name from admin_users where id = ${f.userId})
        )
        returning *
      `
      return rowToFile(row!)
    })
  }
  catch (err) {
    await removeKey(store, key)
    throw err
  }
  if (!added) await removeKey(store, key)
  return added
}

export async function addFile(sql: Sql, store: FileStore, f: NewFile): Promise<FileEntry> {
  return (await storeFile(sql, store, f, false))!
}

// Per il riempimento: se nella cartella c'è già un elemento con quel nome
// (anche messo da un altro lavoro mentre questo caricava) il file non si
// aggiunge e i suoi byte escono dallo store; null
export function addFileOnce(sql: Sql, store: FileStore, f: NewFile): Promise<FileEntry | null> {
  return storeFile(sql, store, f, true)
}

export async function renameEntry(sql: Sql, grantId: string, kind: EntryKind, id: string, name: string): Promise<void> {
  const clean = cleanName(name)
  await withGrantFolder(sql, grantId, null, async (t) => {
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
  await withGrantFolder(sql, grantId, targetFolderId, async (t) => {
    const { name } = await findEntry(t, grantId, kind, id)
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
  const keys = await withGrantFolder(sql, grantId, null, async (t) => {
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
  })
  for (const key of keys) await removeKey(store, key)
  return { files: keys.length }
}

export async function readFileEntry(
  sql: Sql,
  grantId: string,
  fileId: string,
): Promise<{ name: string, mime: string, bytes: number, storeKey: string }> {
  const [row] = await sql`select name, mime, bytes, store_key from grant_files where id = ${fileId} and grant_id = ${grantId}`
  if (!row) throw fileNotFound()
  return { name: row.name, mime: row.mime, bytes: Number(row.bytes), storeKey: row.store_key }
}

// Cartelle e file di tutta la cartella del bando in due letture (per Claude);
// 404 se il bando non c'è, 409 se non ha la cartella
export async function grantFolderContents(
  sql: Sql,
  grantId: string,
): Promise<{ folders: TreeRow[], files: (FileEntry & { folderId: string | null })[] }> {
  await requireGrantFolder(sql, grantId)
  const [folders, files] = await Promise.all([
    folderTree(sql, grantId),
    sql`select * from grant_files where grant_id = ${grantId} order by lower(name), name, id`,
  ])
  return { folders, files: files.map(r => ({ ...rowToFile(r), folderId: r.folder_id as string | null })) }
}
