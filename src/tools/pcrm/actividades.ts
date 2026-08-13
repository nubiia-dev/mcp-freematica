import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreateActividadShape,
  UpdateActividadShape,
  buildActividadBody,
  type ActividadFields,
} from '../../schemas/pcrm.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

const idRegField = z
  .string()
  .min(1)
  .describe('idReg opaco de la actividad (campo "idReg" en freematica_list_pcrm_actividades).');

/**
 * Registra las tools MCP del área de Actividades CRM (citas y tareas).
 *
 * Cubre los endpoints GET /pcrm/v2/actividades (lista y detalle) y
 * las operaciones de escritura POST/PUT (condicionales a enableWrites).
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerPcrmActividadesTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // freematica_list_pcrm_actividades
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pcrm_actividades',
    [
      'Lista paginada de actividades CRM (citas y tareas).',
      '',
      'Endpoint: GET /pcrm/v2/actividades',
      '',
      'Cada item incluye `idReg` opaco para usar en freematica_get_pcrm_actividad.',
      'Las actividades pueden estar asociadas a casos (ID_CASO) u oportunidades (ID_OPORTUNIDAD).',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPcrmActividades({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_pcrm_actividad
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pcrm_actividad',
    [
      'Detalle de una actividad CRM (cita o tarea).',
      '',
      'Endpoint: GET /pcrm/v2/actividades/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_pcrm_actividades.',
    ].join('\n'),
    { id: idRegField },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPcrmActividad(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // freematica_create_pcrm_actividad
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_pcrm_actividad',
    [
      'Crea una nueva actividad CRM (cita o tarea).',
      '',
      'Endpoint: POST /pcrm/v2/actividades — body VoActividadCrm.',
      '',
      'TIPO_ID: C = Cita, T = Tarea.',
      'COD_ESTADO: A = Abierta, P = Pendiente, F = Finalizada, c = Cancelada.',
      'Los campos no expuestos se pasan en camposAdicionales con su nombre nativo.',
      'Devuelve el registro creado.',
    ].join('\n'),
    CreateActividadShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildActividadBody(args as ActividadFields);
        const result = await client.createPcrmActividad(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_pcrm_actividad
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pcrm_actividad',
    [
      'Actualiza una actividad CRM existente (actualización parcial).',
      '',
      'Endpoint: GET /pcrm/v2/actividades/{idReg} + PUT /pcrm/v2/actividades/{idReg} — body VoActividadCrm.',
      '',
      'El parámetro `idReg` es el identificador opaco de freematica_list_pcrm_actividades.',
      'La tool recupera primero el registro actual, aplica encima los campos informados',
      'y envía el objeto completo (el API exige los campos obligatorios en cada PUT).',
      'Devuelve el registro actualizado.',
    ].join('\n'),
    UpdateActividadShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const { idReg, ...rest } = args as { idReg: string } & ActividadFields;
        const changes = buildActividadBody(rest);
        const current = await client.getPcrmActividad(idReg);
        const body = { ...(current as Record<string, unknown>), ...changes };
        const result = await client.updatePcrmActividad(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
