import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreateOrdenTrabajoShape,
  UpdateOrdenTrabajoShape,
  buildOrdenTrabajoBody,
  type OrdenTrabajoFields,
} from '../../schemas/ppre.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

const idRegField = (context: string) =>
  z.string().min(1).describe(`idReg opaco del registro (campo "idReg" en la tool de listado de ${context}).`);

export function registerPpreOrdenesTrabajoTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  server.tool(
    'freematica_list_ppre_ordenes_trabajo',
    [
      'Lista paginada de órdenes de trabajo (v1).',
      '',
      'Endpoint: GET /ppre/v1/ordenes-trabajo',
      '',
      'Devuelve las órdenes de trabajo del módulo de Preventivos y Mantenimiento.',
      'Cada item incluye `idReg` opaco para usar en freematica_get_ppre_orden_trabajo.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreOrdenesTraba({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_ppre_orden_trabajo',
    [
      'Detalle de una orden de trabajo (v1).',
      '',
      'Endpoint: GET /ppre/v1/ordenes-trabajo/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_ppre_ordenes_trabajo.',
    ].join('\n'),
    { id: idRegField('freematica_list_ppre_ordenes_trabajo') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPpreOrdenTrabajo(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  server.tool(
    'freematica_create_ppre_orden_trabajo',
    [
      'Da de alta una orden de trabajo (v1).',
      '',
      'Endpoint: POST /ppre/v1/ordenes-trabajo — body VoOrdenTrabajo (AVI_*, PPC_*).',
      '',
      'Los campos no expuestos se pasan en camposAdicionales con su nombre nativo.',
      'Devuelve el registro creado.',
    ].join('\n'),
    CreateOrdenTrabajoShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildOrdenTrabajoBody(args as OrdenTrabajoFields);
        const result = await client.createPpreOrdenTrabajo(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_update_ppre_orden_trabajo',
    [
      'Actualiza una orden de trabajo existente (v1).',
      '',
      'Endpoint: PUT /ppre/v1/ordenes-trabajo/{idreg}.',
      'Solo se envían al API los campos informados.',
    ].join('\n'),
    UpdateOrdenTrabajoShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...rest }): Promise<CallToolResult> => {
      try {
        const body = buildOrdenTrabajoBody(rest as OrdenTrabajoFields);
        const result = await client.updatePpreOrdenTrabajo(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
