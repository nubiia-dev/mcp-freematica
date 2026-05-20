import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, okList } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_contactos_clientes';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de contactos de clientes (personas asociadas a clientes corporativos).',
  '',
  'Cada item incluye un campo `idReg` opaco (base64). En esta versión no exponemos un endpoint singular para contactos; si necesitas el detalle, contacta al mantenedor del MCP.',
  '',
  'Paginación 1-indexed.',
].join('\n');

export function registerContactosClientesTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listContactosClientes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
