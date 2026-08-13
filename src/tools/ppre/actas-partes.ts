import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import { PassthroughBodyShape } from '../../schemas/personal.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

export function registerPpreActasPartesTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  server.tool(
    'freematica_list_ppre_cabecera_actas_partes',
    [
      'Lista paginada de cabeceras de actas de partes (v2).',
      '',
      'Endpoint: GET /ppre/v2/partes/cabecera-actas-partes',
      '',
      'Cabeceras de las actas de partes de mantenimiento.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreCabeceraActasPartes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_ppre_lineas_actas_partes',
    [
      'Lista paginada de líneas de actas de partes (v2).',
      '',
      'Endpoint: GET /ppre/v2/partes/lineas-actas-partes',
      '',
      'Líneas de detalle de las actas de partes de mantenimiento.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreLineasActasPartes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  server.tool(
    'freematica_update_ppre_lineas_actas_partes',
    [
      'Importa/actualiza líneas de actas de partes (v2).',
      '',
      'Endpoint: PUT /ppre/v2/partes/importar-lineas-actas-partes/{idReg}',
      '',
      'El parámetro `idReg` debe ser el campo `idReg` de freematica_list_ppre_lineas_actas_partes.',
      'El body no tiene campos conocidos en la especificación; usa `camposAdicionales`.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('idReg opaco de las líneas de acta de parte (campo "idReg" en freematica_list_ppre_lineas_actas_partes).'),
      ...PassthroughBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePpreLineasActasPartes(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
