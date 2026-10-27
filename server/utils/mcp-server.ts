import {
  type CallToolResult,
  fromJsonSchema,
  type JsonSchemaType,
  type jsonSchemaValidator,
  McpServer,
  type ToolAnnotations,
} from '@modelcontextprotocol/server'
import { isError } from 'h3'
import type postgres from 'postgres'
import { z } from 'zod'
import type { AdminUser } from '#shared/users'
import type { FileStore } from './file-store'
import { grantFolderContents } from './grant-files'
import { startGrantFolder } from './grant-folder'
import { grantSearchSchema, readGrantFile, readGrantText, searchGrants } from './mcp-bandi'
import { MCP_INSTRUCTIONS, MCP_PROMPT, MCP_TOOLS, mcpApplicationPrompt } from './mcp-text'
import { readRadarSettings, setGrantLiked } from './radar'

// Il server MCP del connettore: sette strumenti sui bandi e il prompt per
// candidarsi. Uno nuovo a ogni richiesta HTTP (createMcpHandler), per la
// persona del token. Gli schemi JSON descrivono gli argomenti a Claude; li
// controlla zod, così i messaggi d'errore sono nostri e in italiano.

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

export function buildMcpServer(deps: { sql: Sql, store: () => FileStore, user: AdminUser, run?: Run }): McpServer {
  const { sql, store, user } = deps
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

  tool('leggi_bando', { properties: { id: idJson(t.leggi_bando.args.id) }, required: ['id'] },
    z.object({ id: uuid }), READ_ONLY, async a => text(await readGrantText(sql, a.id)))

  tool('profilo_azienda', { properties: {} }, z.object({}), READ_ONLY,
    async () => json((await readRadarSettings(sql)).profile))

  // FileEntry non porta la chiave dello store: nessun indirizzo Cloudinary
  tool('elenca_cartella', { properties: { id: idJson(t.elenca_cartella.args.id) }, required: ['id'] },
    z.object({ id: uuid }), READ_ONLY, async a => json(await grantFolderContents(sql, a.id)))

  tool('leggi_file', {
    properties: { id: idJson(t.leggi_file.args.id), file_id: idJson(t.leggi_file.args.file_id) },
    required: ['id', 'file_id'],
  }, z.object({ id: uuid, file_id: uuid }), READ_ONLY,
  async a => ({ content: await readGrantFile(sql, store(), a.id, a.file_id) }))

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

  tool('crea_cartella_bando', { properties: { id: idJson(t.crea_cartella_bando.args.id) }, required: ['id'] },
    z.object({ id: uuid }), WRITE, async (a) => {
      const { status } = await startGrantFolder(sql, store(), a.id, deps.run)
      return text(status === 'filling' ? 'Cartella creata: i file del bando arrivano tra poco.' : 'La cartella c\'era già.')
    })

  const promptArgs = z.object({ bando: z.string().trim().min(1).max(300) })
  server.registerPrompt('come_candidarsi', {
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
