import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreateCasoShape,
  UpdateCasoShape,
  buildCasoBody,
  type CasoFields,
} from '../../schemas/pcrm.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

const idRegField = z
  .string()
  .min(1)
  .describe('idReg opaco del caso (campo "idReg" en freematica_list_pcrm_casos).');

/**
 * Registra las tools MCP del área de Casos CRM (tickets de soporte/incidencias).
 *
 * Cubre los endpoints GET /pcrm/v2/casos, GET /pcrm/v2/tipos-casos,
 * GET /pcrm/v2/subtipos-casos y las operaciones de escritura POST/PUT.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerPcrmCasosTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // freematica_list_pcrm_casos
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pcrm_casos',
    [
      'Lista paginada de casos CRM (tickets de soporte e incidencias de clientes).',
      '',
      'Endpoint: GET /pcrm/v2/casos',
      '',
      'Cada item incluye `idReg` opaco para usar en freematica_get_pcrm_caso.',
      'Los casos pueden tener estado P (Pendiente), A (Abierto), F (Finalizado) o C (Cancelado).',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPcrmCasos({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_pcrm_caso
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pcrm_caso',
    [
      'Detalle de un caso CRM.',
      '',
      'Endpoint: GET /pcrm/v2/casos/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_pcrm_casos.',
    ].join('\n'),
    { id: idRegField },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPcrmCaso(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_pcrm_tipos_casos
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pcrm_tipos_casos',
    [
      'Catálogo paginado de tipos de caso CRM.',
      '',
      'Endpoint: GET /pcrm/v2/tipos-casos',
      '',
      'Devuelve los tipos de caso disponibles. Cada item incluye `idReg` opaco.',
      'Usa freematica_get_pcrm_tipo_caso para el detalle de un tipo concreto.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPcrmTiposCasos({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_pcrm_tipo_caso
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pcrm_tipo_caso',
    [
      'Detalle de un tipo de caso CRM.',
      '',
      'Endpoint: GET /pcrm/v2/tipos-casos/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_pcrm_tipos_casos.',
    ].join('\n'),
    {
      id: z.string().min(1).describe('idReg opaco del tipo de caso (campo "idReg" en freematica_list_pcrm_tipos_casos).'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPcrmTipoCaso(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_pcrm_subtipos_casos
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pcrm_subtipos_casos',
    [
      'Catálogo paginado de subtipos de caso CRM.',
      '',
      'Endpoint: GET /pcrm/v2/subtipos-casos',
      '',
      'Devuelve los subtipos de caso disponibles. Cada item incluye `idReg` opaco.',
      'Usa freematica_get_pcrm_subtipo_caso para el detalle de un subtipo concreto.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPcrmSubtiposCasos({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_pcrm_subtipo_caso
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pcrm_subtipo_caso',
    [
      'Detalle de un subtipo de caso CRM.',
      '',
      'Endpoint: GET /pcrm/v2/subtipos-casos/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_pcrm_subtipos_casos.',
    ].join('\n'),
    {
      id: z.string().min(1).describe('idReg opaco del subtipo de caso (campo "idReg" en freematica_list_pcrm_subtipos_casos).'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPcrmSubtipoCaso(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // freematica_create_pcrm_caso
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_pcrm_caso',
    [
      'Crea un nuevo caso CRM.',
      '',
      'Endpoint: POST /pcrm/v2/casos — body VoCasoCrm.',
      '',
      'COD_ESTADO: P = Pendiente, A = Abierto, F = Finalizado, C = Cancelado.',
      'TIPO_ASIGNACION: U = Usuario, C = Cola de Trabajo.',
      'Los campos no expuestos se pasan en camposAdicionales con su nombre nativo (CRMC_*).',
      'Devuelve el registro creado.',
    ].join('\n'),
    CreateCasoShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildCasoBody(args as CasoFields);
        const result = await client.createPcrmCaso(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_pcrm_caso
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pcrm_caso',
    [
      'Actualiza un caso CRM existente.',
      '',
      'Endpoint: PUT /pcrm/v2/casos/{idReg} — body VoCasoCrm.',
      '',
      'El parámetro `idReg` es el identificador opaco de freematica_list_pcrm_casos.',
      'Solo se envían los campos que se quieren modificar; los demás se ignoran.',
      'Devuelve el registro actualizado.',
    ].join('\n'),
    UpdateCasoShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const { idReg, ...rest } = args as { idReg: string } & CasoFields;
        const body = buildCasoBody(rest);
        const result = await client.updatePcrmCaso(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
