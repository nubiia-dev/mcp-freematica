import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import { error, ok, okList } from '../helpers.js';

const idRegField = (context: string) =>
  z.string().min(1).describe(`idReg opaco del registro (campo "idReg" en la tool de listado de ${context}).`);

export function registerPprePartesTools(
  server: McpServer,
  client: FreematicaClient,
): void {
  server.tool(
    'freematica_list_ppre_partes',
    [
      'Lista paginada de partes de mantenimiento (v1).',
      '',
      'Endpoint: GET /ppre/v1/partes',
      '',
      'Partes de trabajo del módulo de Preventivos y Mantenimiento.',
      'Cada item incluye `idReg` opaco para usar en freematica_get_ppre_parte.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPprePartes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_ppre_parte',
    [
      'Detalle de un parte de mantenimiento (v1).',
      '',
      'Endpoint: GET /ppre/v1/partes/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_ppre_partes.',
    ].join('\n'),
    { id: idRegField('freematica_list_ppre_partes') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPpreParte(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_ppre_parte_componentes_ficha_tecnica',
    [
      'Componentes de ficha técnica de un parte de mantenimiento.',
      '',
      'Endpoint: GET /ppre/v1/partes/{idreg}/componentes-ficha-tecnica',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_ppre_partes.',
    ].join('\n'),
    { id: idRegField('freematica_list_ppre_partes') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPpreParteComponentesFichaTecnica(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_ppre_parte_ultimas_intervenciones',
    [
      'Últimas intervenciones de un parte de mantenimiento.',
      '',
      'Endpoint: GET /ppre/v1/partes/{idreg}/ultimas-intervenciones',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_ppre_partes.',
    ].join('\n'),
    {
      id: idRegField('freematica_list_ppre_partes'),
      ...PaginationSchema,
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id, page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreParteUltimasIntervenciones(id, { page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_ppre_partes_orden_trabajo',
    [
      'Lista paginada de partes vinculados a órdenes de trabajo (v2).',
      '',
      'Endpoint: GET /ppre/v2/partes/partes-orden-trabajo',
      '',
      'Partes asociados a órdenes de trabajo.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPprePartesOrdenTrabajo({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_ppre_partes_fin_mantenedor',
    [
      'Lista paginada de partes fin de mantenedor (v2).',
      '',
      'Endpoint: GET /ppre/v2/partes/partes-fin-mantenedor',
      '',
      'Partes finalizados por el mantenedor.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPprePartesFinMantenedor({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
