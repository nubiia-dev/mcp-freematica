import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList } from './helpers.js';

const LIST_TOOL = 'freematica_list_cargos_clientes';
const GET_TOOL = 'freematica_get_cargo_cliente';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de cargos de clientes de Freemática.',
  '',
  'Los cargos de clientes son las posiciones/roles de los contactos asociados a un cliente.',
  'Cada item incluye un campo `idReg` opaco para el endpoint singular.',
  '',
  'Paginación 1-indexed.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle de un cargo de cliente.',
  '',
  'El parámetro `idReg` DEBE ser el campo `idReg` que aparece en los items de freematica_list_cargos_clientes.',
].join('\n');

export function registerPgrlCargosClientesTools(
  server: McpServer,
  client: FreematicaClient,
): void {
  server.tool(
    LIST_TOOL,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listCargosClientes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    GET_TOOL,
    GET_DESCRIPTION,
    {
      idReg: z.string().min(1).describe('Identificador opaco del cargo de cliente (campo "idReg" en freematica_list_cargos_clientes).'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getCargoCliente(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
