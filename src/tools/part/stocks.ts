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

const LIST_TOOL_NAME = 'freematica_list_stocks';
const GET_TOOL_NAME = 'freematica_get_stock';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de stocks de artículos (existencias por almacén) en Freemática.',
  '',
  'Endpoint: GET /part/v1/stocks',
  '',
  'Cada item incluye COD_GRUPO_ART, COD_ALMACEN, COD_ARTICULO y las cantidades',
  'de existencias (EXIST_1, EXIST_2), así como el `idReg` opaco para usar en',
  'freematica_get_stock.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle de stock de un artículo por su `idReg` opaco.',
  '',
  'Endpoint: GET /part/v1/stocks/{idreg}',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` que aparece en',
  'freematica_list_stocks.',
].join('\n');

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del sub-módulo Stocks (existencias por artículo/almacén).
 *
 * Tools de lectura (siempre disponibles):
 *  1. freematica_list_stocks — lista paginada de stocks
 *  2. freematica_get_stock   — detalle de stock por idReg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerStocksTools(server: McpServer, client: FreematicaClient): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_stocks
  // -------------------------------------------------------------------------
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listStocks({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_get_stock
  // -------------------------------------------------------------------------
  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del registro de stock (campo "idReg" en freematica_list_stocks).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const item = await client.getStock(id);
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
