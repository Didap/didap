import {
  type CallToolResult,
  fromJsonSchema,
  type JsonSchemaType,
  type jsonSchemaValidator,
  McpServer,
  type ToolAnnotations,
} from '@modelcontextprotocol/server'
import { createError, isError } from 'h3'
import type postgres from 'postgres'
import { z } from 'zod'
import { draftAuthor, type DraftConflict } from '#shared/grant-draft'
import type { AdminUser } from '#shared/users'
import type { FileStore } from './file-store'
import { readDraft, saveDraftAndFill } from './grant-draft'
import { grantFolderContents } from './grant-files'
import { startGrantFolder } from './grant-folder'
import { grantSearchSchema, MAX_TOOL_TEXT, readGrantFile, readGrantText, searchGrants } from './mcp-bandi'
import { MCP_DRAFT_TOO_LONG, MCP_INSTRUCTIONS, MCP_PROMPT, MCP_TEXT_TOO_LONG, MCP_TOOLS, mcpApplicationPrompt } from './mcp-text'
import { readRadarSettings, setGrantLiked } from './radar'

// Il server MCP del connettore: nove strumenti sui bandi e sulla bozza della
// candidatura, e il prompt per prepararla. Uno nuovo a ogni richiesta HTTP
// (createMcpHandler), per la persona del token. Gli schemi JSON descrivono
// gli argomenti a Claude; li controlla zod, così i messaggi d'errore sono
// nostri e in italiano.

type Sql = postgres.Sql
type Run = (job: () => Promise<void>) => void

// Validatore dell'SDK che lascia passare tutto: decide zod nello strumento
const zodDecides: jsonSchemaValidator = {
  getValidator: () => input => ({ valid: true, data: input as never, errorMessage: undefined }),
}

const objectSchema = (properties: Record<string, JsonSchemaType>, required: string[] = []) =>
  fromJsonSchema({ type: 'object', properties, required, additionalProperties: false }, zodDecides)

const uuid = z.string().uuid()
const idJson = (description: string): JsonSchemaType => ({ type: 'string', format: 'uuid', description })
// Parte del testo lungo, da 1 (textPart dice se va oltre l'ultima)
const part = z.number().int().min(1).optional()
const partJson = (description: string): JsonSchemaType => ({ type: 'integer', minimum: 1, description })

const text = (t: string): CallToolResult => ({ content: [{ type: 'text', text: t }] })
const failure = (t: string): CallToolResult => ({ content: [{ type: 'text', text: t }], isError: true })
const json = (data: Record<string, unknown>): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(data) }],
  structuredContent: data,
})

const invalidArgs = (err: z.ZodError) =>
  `Argomenti non validi: ${[...new Set(err.issues.map(i => i.path.join('.') || 'argomenti'))].join(', ')}`

const READ_ONLY: ToolAnnotations = { readOnlyHint: true, openWorldHint: false }
const WRITE: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: false }

// Senza Cloudinary a Claude basta sapere che la cartella non c'è sul server,
// non quali variabili d'ambiente mancano
const NO_STORE = 'La cartella dei file non è configurata sul server.'

// "il 27/10/2026 alle 11:05", ora di Roma
const romeDay = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' })
const romeHour = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const when = (iso: string) => `il ${romeDay.format(new Date(iso))} alle ${romeHour.format(new Date(iso))}`

// Il 409 della bozza: chi ha salvato e quando. Senza `data` la bozza non c'è
// (Claude ha dato una versione a un bando senza bozza)
function draftConflict(data: DraftConflict | undefined): string {
  if (!data) return 'La bozza è cambiata o non esiste: rileggila con leggi_bozza e riparti da lì.'
  return `La bozza è cambiata (versione ${data.version}, salvata da ${draftAuthor(data)} ${when(data.savedAt)}): rileggila con leggi_bozza e riapplica le modifiche.`
}

// store: useFileStore, null senza Cloudinary. La bozza si salva anche senza;
// gli strumenti dei file no
export function buildMcpServer(deps: { sql: Sql, store: () => FileStore | null, user: AdminUser, run?: Run }): McpServer {
  const { sql, user } = deps
  const store = () => {
    const s = deps.store()
    if (!s) throw createError({ statusCode: 503, statusMessage: NO_STORE })
    return s
  }
  const server = new McpServer({ name: 'didap-bandi', version: '1.0.0' }, { instructions: MCP_INSTRUCTIONS })

  // Un errore h3 (404, 409, 503) torna a Claude come risultato con il suo
  // messaggio; il resto si scrive nel log e a Claude arriva un testo generico
  function tool<A>(
    name: keyof typeof MCP_TOOLS,
    input: { properties: Record<string, JsonSchemaType>, required?: string[] },
    args: z.ZodType<A, z.ZodTypeDef, unknown>,
    annotations: ToolAnnotations,
    handler: (a: A) => Promise<CallToolResult>,
  ) {
    const { title, description } = MCP_TOOLS[name]
    server.registerTool(name, { title, description, inputSchema: objectSchema(input.properties, input.required), annotations }, async (raw) => {
      const parsed = args.safeParse(raw ?? {})
      if (!parsed.success) return failure(invalidArgs(parsed.error))
      try {
        return await handler(parsed.data)
      }
      catch (err) {
        if (isError(err)) return failure(err.statusMessage || err.message)
        console.error(`[mcp] ${name} non riuscito (persona ${user.id})`, err)
        return failure('Errore interno: riprova tra poco.')
      }
    })
  }

  const t = MCP_TOOLS

  tool('cerca_bandi', {
    properties: {
      esito: {
        type: 'array',
        items: { type: 'string', enum: ['candidabile', 'da_verificare', 'escluso'] },
        description: t.cerca_bandi.args.esito,
      },
      solo_interessanti: { type: 'boolean', description: t.cerca_bandi.args.solo_interessanti },
      scadenza_entro_giorni: { type: 'integer', minimum: 1, maximum: 365, description: t.cerca_bandi.args.scadenza_entro_giorni },
      testo: { type: 'string', maxLength: 200, description: t.cerca_bandi.args.testo },
      fuori_dalla_ricerca: { type: 'boolean', description: t.cerca_bandi.args.fuori_dalla_ricerca },
    },
  }, z.object({
    esito: grantSearchSchema.shape.esito,
    solo_interessanti: grantSearchSchema.shape.soloInteressanti,
    scadenza_entro_giorni: grantSearchSchema.shape.scadenzaEntroGiorni,
    testo: grantSearchSchema.shape.testo,
    fuori_dalla_ricerca: grantSearchSchema.shape.fuoriDallaRicerca,
  }), READ_ONLY, async a => json(await searchGrants(sql, {
    esito: a.esito,
    soloInteressanti: a.solo_interessanti,
    scadenzaEntroGiorni: a.scadenza_entro_giorni,
    testo: a.testo,
    fuoriDallaRicerca: a.fuori_dalla_ricerca,
  })))

  tool('leggi_bando', {
    properties: { id: idJson(t.leggi_bando.args.id), parte: partJson(t.leggi_bando.args.parte) },
    required: ['id'],
  }, z.object({ id: uuid, parte: part }), READ_ONLY, async a => text(await readGrantText(sql, a.id, a.parte)))

  tool('profilo_azienda', { properties: {} }, z.object({}), READ_ONLY,
    async () => json((await readRadarSettings(sql)).profile))

  // FileEntry non porta la chiave dello store: nessun indirizzo Cloudinary
  tool('elenca_cartella', { properties: { id: idJson(t.elenca_cartella.args.id) }, required: ['id'] },
    z.object({ id: uuid }), READ_ONLY, async a => json(await grantFolderContents(sql, a.id)))

  tool('leggi_file', {
    properties: {
      id: idJson(t.leggi_file.args.id),
      file_id: idJson(t.leggi_file.args.file_id),
      parte: partJson(t.leggi_file.args.parte),
    },
    required: ['id', 'file_id'],
  }, z.object({ id: uuid, file_id: uuid, parte: part }), READ_ONLY,
  async a => ({ content: await readGrantFile(sql, store(), a.id, a.file_id, undefined, a.parte) }))

  tool('segna_interessante', {
    properties: {
      id: idJson(t.segna_interessante.args.id),
      interessante: { type: 'boolean', description: t.segna_interessante.args.interessante },
    },
    required: ['id', 'interessante'],
  }, z.object({ id: uuid, interessante: z.boolean() }), { ...WRITE, idempotentHint: true }, async (a) => {
    await setGrantLiked(sql, a.id, a.interessante)
    return text(a.interessante ? 'Bando segnato come interessante.' : 'Bando tolto dagli interessanti.')
  })

  // Mondo aperto: il riempimento scarica pagina e PDF dal sito del bando
  tool('crea_cartella_bando', { properties: { id: idJson(t.crea_cartella_bando.args.id) }, required: ['id'] },
    z.object({ id: uuid }), { ...WRITE, openWorldHint: true }, async (a) => {
      const { status } = await startGrantFolder(sql, store(), a.id, deps.run)
      return text(status === 'filling' ? 'Cartella creata: i file del bando arrivano tra poco.' : 'La cartella c\'era già.')
    })

  // Solo testo, niente structuredContent: un client che lo passasse al
  // modello al posto del content gli darebbe la versione senza il testo, e
  // un testo ricostruito salvato con una versione valida. Oltre MAX_TOOL_TEXT
  // né testo né versione: senza versione Claude non può salvarci sopra, e
  // salva_bozza lo rifiuta comunque
  tool('leggi_bozza', { properties: { id: idJson(t.leggi_bozza.args.id) }, required: ['id'] },
    z.object({ id: uuid }), READ_ONLY, async (a) => {
      const d = await readDraft(sql, a.id)
      if (!d) return text('Questo bando non ha ancora una bozza: scrivila con salva_bozza senza versione.')
      if (d.content.length > MAX_TOOL_TEXT) {
        return text(`${MCP_DRAFT_TOO_LONG} L'ha salvata ${draftAuthor(d)} ${when(d.savedAt)}.`)
      }
      return text(JSON.stringify({
        testo: d.content,
        versione: d.version,
        salvata_il: d.savedAt,
        salvata_da: d.savedBy,
        da_claude: d.byClaude,
        caratteri: d.content.length,
      }))
    })

  // Mondo aperto come crea_cartella_bando: al primo salvataggio la cartella
  // nasce e si riempie dal sito del bando
  tool('salva_bozza', {
    properties: {
      id: idJson(t.salva_bozza.args.id),
      testo: { type: 'string', maxLength: MAX_TOOL_TEXT, description: t.salva_bozza.args.testo },
      versione: { type: 'integer', minimum: 1, description: t.salva_bozza.args.versione },
    },
    required: ['id', 'testo'],
  }, z.object({ id: uuid, testo: z.string(), versione: z.number().int().min(1).optional() }),
  { ...WRITE, openWorldHint: true }, async (a) => {
    // Il limite di Claude, più stretto di quello del pannello: con il suo
    // messaggio e non "argomenti non validi"
    if (a.testo.length > MAX_TOOL_TEXT) return failure(MCP_TEXT_TOO_LONG)
    try {
      const { draft, folderCreated } = await saveDraftAndFill(sql, deps.store(), {
        grantId: a.id,
        content: a.testo,
        baseVersion: a.versione ?? null,
        savedBy: user.name,
        byClaude: true,
        maxCurrentChars: MAX_TOOL_TEXT,
      }, deps.run)
      const saved = `Bozza salvata (versione ${draft.version}). La trovi nel pannello, scheda Bozza del bando.`
      return text(folderCreated ? `${saved} Ho creato la cartella del bando e l'ho messo tra gli interessanti.` : saved)
    }
    catch (err) {
      if (isError(err) && err.statusCode === 409) return failure(draftConflict(err.data as DraftConflict | undefined))
      if (isError(err) && err.statusCode === 422) return failure(MCP_DRAFT_TOO_LONG)
      throw err
    }
  })

  const promptArgs = z.object({ bando: z.string().trim().min(1).max(300) })
  server.registerPrompt('prepara_candidatura', {
    title: MCP_PROMPT.title,
    description: MCP_PROMPT.description,
    argsSchema: objectSchema({ bando: { type: 'string', description: MCP_PROMPT.arg } }, ['bando']),
  }, (raw) => {
    const parsed = promptArgs.safeParse(raw ?? {})
    if (!parsed.success) throw new Error('Indica l\'id o il titolo del bando (al massimo 300 caratteri).')
    return { messages: [{ role: 'user', content: { type: 'text', text: mcpApplicationPrompt(parsed.data.bando) } }] }
  })

  return server
}
