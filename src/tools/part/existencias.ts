import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import { error, ok, okList } from '../helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const LIST_TOOL_NAME = 'freematica_list_stocks_serie_lote';
const GET_TOOL_NAME = 'freematica_get_stock_serie_lote';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de existencias de artículos por serie/lote en Freemática.',
  '',
  'Endpoint: GET /part/v2/stocks-serie-lote',
  '',
  'Cada item incluye información de stock por almacén y serie/lote: artículo,',
  'almacén, cantidad existente y referencia de serie/lote.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle de existencias de un artículo por serie/lote a partir de su `idReg`.',
  '',
  'Endpoint: GET /part/v2/stocks-serie-lote/{idReg}',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` que aparece en',
  'freematica_list_stocks_serie_lote.',
].join('\n');

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del sub-módulo Existencias (stocks por serie/lote).
 *
 * Tools de lectura (siempre disponibles):
 *  1. freematica_list_stocks_serie_lote — lista paginada de stocks por serie/lote
 *  2. freematica_get_stock_serie_lote   — detalle de un stock por idReg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerExistenciasTools(server: McpServer, client: FreematicaClient): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_stocks_serie_lote
  // -------------------------------------------------------------------------
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listStocksSerieLote({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_get_stock_serie_lote
  // -------------------------------------------------------------------------
  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del registro de stock por serie/lote (campo "idReg" en freematica_list_stocks_serie_lote).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const item = await client.getStockSerieLote(id);
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
