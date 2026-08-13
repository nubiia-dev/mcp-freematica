import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreatePpreContratoShape,
  buildPpreContratoBody,
  type CreatePpreContratoFields,
} from '../../schemas/ppre.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

const idRegField = (context: string) =>
  z.string().min(1).describe(`idReg opaco del registro (campo "idReg" en la tool de listado de ${context}).`);

export function registerPpreContratosTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  server.tool(
    'freematica_list_ppre_contratos',
    [
      'Lista paginada de contratos de instalación/mantenimiento (v1).',
      '',
      'Endpoint: GET /ppre/v1/contratos',
      '',
      'Devuelve los contratos del módulo de Preventivos y Mantenimiento.',
      'Cada item incluye `idReg` opaco para usar en freematica_get_ppre_contrato_v1.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreContratos({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_ppre_contratos_v2',
    [
      'Lista paginada de contratos de instalación/mantenimiento (v2).',
      '',
      'Endpoint: GET /ppre/v2/contratos',
      '',
      'Versión v2 del listado de contratos ppre.',
      'Cada item incluye `idReg` opaco para usar en freematica_get_ppre_contrato_v2.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreContratosV2({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_ppre_contrato_v1',
    [
      'Detalle de un contrato de instalación/mantenimiento (v1).',
      '',
      'Endpoint: GET /ppre/v1/contratos/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_ppre_contratos.',
    ].join('\n'),
    { id: idRegField('freematica_list_ppre_contratos') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPpreContratoV1(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_ppre_contrato_v2',
    [
      'Detalle de un contrato de instalación/mantenimiento (v2).',
      '',
      'Endpoint: GET /ppre/v2/contratos/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_ppre_contratos_v2.',
    ].join('\n'),
    { id: idRegField('freematica_list_ppre_contratos_v2') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPpreContratoV2(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_ppre_contratos_instalacion',
    [
      'Lista paginada de contratos de instalación (v1).',
      '',
      'Endpoint: GET /ppre/v1/contratosInstalacion',
      '',
      'Contratos vinculados a instalaciones físicas.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreContratosInstalacion({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_ppre_tipos_contrato',
    [
      'Catálogo de tipos de contrato ppre (v2).',
      '',
      'Endpoint: GET /ppre/v2/tipos-contrato',
      '',
      'Devuelve el catálogo completo de tipos de contrato disponibles.',
      'Endpoint de catálogo, sin paginación.',
    ].join('\n'),
    {},
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreTiposContrato();
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  server.tool(
    'freematica_create_ppre_contrato',
    [
      'Da de alta un contrato de instalación/mantenimiento (v2).',
      '',
      'Endpoint: POST /ppre/v2/contratos — body VoContratoPpre (CON_*).',
      '',
      'Los campos no expuestos se pasan en camposAdicionales con su nombre nativo.',
      'Devuelve el registro creado.',
    ].join('\n'),
    CreatePpreContratoShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildPpreContratoBody(args as CreatePpreContratoFields);
        const result = await client.createPpreContrato(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
