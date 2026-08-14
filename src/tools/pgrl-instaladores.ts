import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

export function registerPgrlInstaladoresTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  server.tool(
    'freematica_list_instaladores',
    [
      'Devuelve la lista paginada de instaladores de Freemática.',
      '',
      'Los instaladores son técnicos o empresas que realizan instalaciones en clientes.',
      'Cada item incluye un campo `idReg` opaco para el endpoint singular.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listInstaladores({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_instalador',
    'Devuelve el detalle de un instalador. El parámetro `idReg` debe ser el campo `idReg` de freematica_list_instaladores.',
    {
      idReg: z.string().min(1).describe('Identificador opaco del instalador.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getInstalador(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_instalador_stocks',
    'Devuelve los stocks de un instalador. El parámetro `idReg` debe ser el campo `idReg` de freematica_list_instaladores.',
    {
      idReg: z.string().min(1).describe('Identificador opaco del instalador.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getInstaladorStocks(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_instalador_propuestas_compras',
    'Devuelve la lista paginada de propuestas de compra de un instalador. Paginación 1-indexed.',
    {
      idInstalador: z.string().min(1).describe('Identificador del instalador.'),
      ...PaginationSchema,
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idInstalador, page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listInstaladorPropuestasCompras(idInstalador, { page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_parte_instalacion',
    'Devuelve el detalle de un parte de instalación por su `idReg`.',
    {
      idReg: z.string().min(1).describe('Identificador opaco del parte de instalación.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getParteInstalacion(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  server.tool(
    'freematica_create_instalador_propuesta_compra',
    [
      'Crea una propuesta de compra para un instalador.',
      '',
      'Endpoint: POST /pgrl/v1/instaladores/{idInstalador}/propuestas-compras.',
    ].join('\n'),
    {
      idInstalador: z.string().min(1).describe('Identificador del instalador.'),
      fields: z.record(z.string(), z.unknown()).describe('Campos de la propuesta de compra.'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ idInstalador, fields }): Promise<CallToolResult> => {
      try {
        const created = await client.createInstaladorPropuestaCompra(idInstalador, fields);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
