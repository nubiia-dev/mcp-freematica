import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreateMarcajeShape,
  UpdateMarcajeShape,
  buildMarcajeBody,
  type MarcajeFields,
} from '../../schemas/ppre.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

export function registerPpreMarcajesTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  server.tool(
    'freematica_list_ppre_marcajes',
    [
      'Lista paginada de marcajes de presencia (v1).',
      '',
      'Endpoint: GET /ppre/v1/marcajes',
      '',
      'Marcajes de entrada/salida del personal de mantenimiento.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreMarcajes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_ppre_marcajes_v2',
    [
      'Lista paginada de marcajes de presencia (v2).',
      '',
      'Endpoint: GET /ppre/v2/marcajes',
      '',
      'Versión v2 de los marcajes del personal de mantenimiento.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreMarcajesV2({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  server.tool(
    'freematica_create_ppre_marcaje',
    [
      'Registra un marcaje de presencia (v1).',
      '',
      'Endpoint: POST /ppre/v1/guardar',
      '',
      'Registra un nuevo marcaje (entrada, salida, novedad, etc.) del personal de mantenimiento.',
      'Devuelve el registro creado.',
    ].join('\n'),
    CreateMarcajeShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildMarcajeBody(args as MarcajeFields);
        const result = await client.createPpreMarcaje(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_update_ppre_marcaje_v1',
    [
      'Actualiza un marcaje de presencia (v1).',
      '',
      'Endpoint: PUT /ppre/v1/actualizar/{idReg}',
      '',
      'El parámetro `idReg` debe ser el campo `idReg` de freematica_list_ppre_marcajes.',
    ].join('\n'),
    UpdateMarcajeShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...rest }): Promise<CallToolResult> => {
      try {
        const body = buildMarcajeBody(rest as MarcajeFields);
        const result = await client.updatePpreMarcajeV1(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_update_ppre_marcaje_v2',
    [
      'Actualiza un marcaje de presencia (v2).',
      '',
      'Endpoint: PUT /ppre/v2/actualizar/{idReg}',
      '',
      'El parámetro `idReg` debe ser el campo `idReg` de freematica_list_ppre_marcajes_v2.',
    ].join('\n'),
    UpdateMarcajeShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...rest }): Promise<CallToolResult> => {
      try {
        const body = buildMarcajeBody(rest as MarcajeFields);
        const result = await client.updatePpreMarcajeV2(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
