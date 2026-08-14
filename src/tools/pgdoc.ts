import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, okList, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio PGDOC (documentos electrónicos).
 *
 * Tools de lectura (siempre activas):
 *  1. freematica_list_pgdoc_edocs → GET /pgdoc/v2/edocs/docs
 *
 * Descartado: GET /pgdoc/v2/edocs/file/:idReg — devuelve binario (PDF/imagen);
 * no es apto para tool MCP (no serializable como texto JSON).
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (no hay writes en este módulo).
 */
export function registerPgdocTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  void opts;

  // -------------------------------------------------------------------------
  // 1. freematica_list_pgdoc_edocs
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pgdoc_edocs',
    'Lista paginada de documentos electrónicos.\n\nEndpoint: GET /pgdoc/v2/edocs/docs',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPgdocEdocs({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
