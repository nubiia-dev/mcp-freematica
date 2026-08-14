import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const LIST_TOOL_NAME = 'freematica_list_articulos_serie_lote';
const GET_TOOL_NAME = 'freematica_get_articulo_serie_lote';
const CREATE_TOOL_NAME = 'freematica_create_articulo_serie_lote';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de registros de serie/lote de artículos en Freemática.',
  '',
  'Endpoint: GET /part/v2/articulos-serie-lote',
  '',
  'Cada item incluye SER_COD_ARTICULO, SER_SERIE_LOTE, SER_FCH_COMPRA,',
  'SER_MESES_GARANTIA, SER_FCH_GARANTIA_COMPRA, SER_FCH_GARANTIA_CLI,',
  'SER_ULT_ALM_DESTINO, SER_COD_GRUPO_CLI, SER_ULT_CLI_DESTINO y opcionales',
  'numéricos, alfanuméricos, de fecha y de memo.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle de un registro de serie/lote de artículo por su `idReg` opaco.',
  '',
  'Endpoint: GET /part/v2/articulos-serie-lote/{idReg}',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` que aparece en',
  'freematica_list_articulos_serie_lote.',
].join('\n');

const CREATE_DESCRIPTION = [
  'Da de alta un registro de serie o lote para un artículo en Freemática.',
  '',
  'Endpoint: POST /part/v2/articulos-serie-lote',
  '',
  'Campos principales: SER_COD_GRUPO_ART (número), SER_COD_ARTICULO (código),',
  'SER_SERIE_LOTE (identificador de serie o lote), SER_FCH_COMPRA (fecha ISO),',
  'SER_MESES_GARANTIA (número), campos de garantía cliente/compra,',
  'SER_ULT_ALM_DESTINO, SER_COD_GRUPO_CLI, SER_ULT_CLI_DESTINO.',
  'Opcionales: SER_OPC_NUM1..5, SER_OPC_ALF1..5, SER_OPC_FCH1..5, SER_OPC_MEMO1..3.',
  'Devuelve el registro creado.',
].join('\n');

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del sub-módulo Artículos Serie/Lote.
 *
 * Tools de lectura (siempre disponibles):
 *  1. freematica_list_articulos_serie_lote — lista paginada
 *  2. freematica_get_articulo_serie_lote   — detalle por idReg
 *
 * Tools de escritura (solo si enableWrites=true):
 *  3. freematica_create_articulo_serie_lote — POST /part/v2/articulos-serie-lote
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerArticulosLoteTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_articulos_serie_lote
  // -------------------------------------------------------------------------
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listArticulosSerieLote({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_get_articulo_serie_lote
  // -------------------------------------------------------------------------
  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del registro de serie/lote (campo "idReg" en freematica_list_articulos_serie_lote).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const item = await client.getArticuloSerieLote(id);
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_create_articulo_serie_lote (escritura)
  // -------------------------------------------------------------------------
  if (!opts.enableWrites) return;

  server.tool(
    CREATE_TOOL_NAME,
    CREATE_DESCRIPTION,
    {
      fields: z
        .record(z.string(), z.unknown())
        .describe(
          'Campos nativos del registro de serie/lote (VoArticuloSerieLote). ' +
            'Campos principales: SER_COD_GRUPO_ART (number), SER_COD_ARTICULO (string), ' +
            'SER_SERIE_LOTE (string), SER_FCH_COMPRA (ISO date), SER_MESES_GARANTIA (number), ' +
            'SER_FCH_GARANTIA_COMPRA, SER_FCH_GARANTIA_CLI, SER_ULT_ALM_DESTINO, ' +
            'SER_COD_GRUPO_CLI (number), SER_ULT_CLI_DESTINO. ' +
            'Opcionales: SER_OPC_NUM1..5, SER_OPC_ALF1..5, SER_OPC_FCH1..5, SER_OPC_MEMO1..3.',
        ),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ fields }): Promise<CallToolResult> => {
      try {
        const created = await client.createArticuloSerieLote(fields as Record<string, unknown>);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
