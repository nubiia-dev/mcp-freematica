import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_clientes';
const GET_TOOL_NAME = 'freematica_get_cliente';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de clientes de Freemática.',
  '',
  'Cada item tiene ~87 campos (COD_CLI, NOMBRE_CLI, NIF, FECHA_ALTA, etc.) más un campo `idReg` opaco (base64) que se usa para el endpoint singular `freematica_get_cliente`.',
  '',
  'Paginación 1-indexed: la primera página es page=1. Devuelve también `total` con el total de clientes en el dataset.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle completo de un cliente.',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en los items de freematica_list_clientes. NO usar COD_CLI ni otro código natural — el API devuelve not_found.',
].join('\n');

export function registerClientesTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listClientes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del cliente (campo "idReg" en los items de freematica_list_clientes).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const cliente = await client.getCliente(id);
        return ok(cliente) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
