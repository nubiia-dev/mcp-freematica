import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import { PassthroughBodyShape } from '../../schemas/personal.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

const idRegField = (context: string) =>
  z.string().min(1).describe(`idReg opaco del registro (campo "idReg" en la tool de listado de ${context}).`);

export function registerPpreFichasInstalacionTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  server.tool(
    'freematica_list_ppre_fichas_instalacion',
    [
      'Lista fichas de instalación (v1).',
      '',
      'Endpoint: GET /ppre/v1/fichas-instalacion (o /ppre/v1/fichas-instalacion/{idReg} si se proporciona idReg).',
      '',
      'Si se proporciona `idReg`, el idReg forma parte del path y actúa como filtro.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    {
      ...PaginationSchema,
      idReg: z.string().optional().describe('idReg opaco de la ficha de instalación. Si se proporciona, forma parte del path.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreFichasInstalacion({ page, items, idReg });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_ppre_ficha_tecnica',
    [
      'Detalle de una ficha técnica (v1).',
      '',
      'Endpoint: GET /ppre/v1/ficha-tecnica/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_ppre_fichas_instalacion.',
    ].join('\n'),
    { id: idRegField('freematica_list_ppre_fichas_instalacion') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPpreFichaTecnica(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_ppre_componentes_ficha_tecnica',
    [
      'Lista componentes de una ficha técnica (v1).',
      '',
      'Endpoint: GET /ppre/v1/fichas-tecnicas/{idreg}/componentes',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_ppre_fichas_instalacion.',
    ].join('\n'),
    {
      id: idRegField('freematica_list_ppre_fichas_instalacion'),
      ...PaginationSchema,
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id, page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreComponentesFichaTecnica(id, { page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  server.tool(
    'freematica_create_ppre_ficha_instalacion_material',
    [
      'Da de alta material en una ficha de instalación (v1).',
      '',
      'Endpoint: POST /ppre/v1/fichas-instalacion-material',
      '',
      'El body no tiene campos conocidos en la especificación; usa `camposAdicionales`.',
      'Devuelve el registro creado.',
    ].join('\n'),
    PassthroughBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPpreFichaInstalacionMaterial(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_update_ppre_ficha_instalacion',
    [
      'Actualiza una ficha de instalación (v1).',
      '',
      'Endpoint: PUT /ppre/v1/fichas-instalacion/{idReg}',
      '',
      'El parámetro `idReg` debe ser el campo `idReg` de freematica_list_ppre_fichas_instalacion.',
      'El body no tiene campos conocidos en la especificación; usa `camposAdicionales`.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('idReg opaco de la ficha de instalación (campo "idReg" en freematica_list_ppre_fichas_instalacion).'),
      ...PassthroughBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePpreFichaInstalacion(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
