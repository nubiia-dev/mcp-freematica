import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

const LIST_TOOL = 'freematica_list_calen_festivos';
const GET_TOOL = 'freematica_get_calen_festivo';
const CREATE_TOOL = 'freematica_create_calen_festivo';
const UPDATE_TOOL = 'freematica_update_calen_festivo';
const UPDATE_DET_TOOL = 'freematica_update_calen_festivo_det';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de calendarios festivos de Freemática.',
  '',
  'Los calendarios festivos definen los días festivos y su configuración horaria.',
  'Cada item incluye un campo `idReg` opaco para el endpoint singular.',
  '',
  'Paginación 1-indexed.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle de un calendario festivo.',
  '',
  'El parámetro `idReg` DEBE ser el campo `idReg` que aparece en los items de freematica_list_calen_festivos.',
].join('\n');

const CREATE_DESCRIPTION = [
  'Da de alta un calendario festivo en Freemática.',
  '',
  'Endpoint: POST /pgrl/v2/calen-festivos.',
  'Principales campos de cabecera: COD_CALEN_FESTIVOS, DESCRIPCION.',
  'Para el detalle: COD_CALEN, FECHA, DESC_FEST_DET, HORAS_TRABAJO, FECHA_ESP, TIPO_FEST.',
].join('\n');

const UPDATE_DESCRIPTION = [
  'Actualiza un calendario festivo existente (actualización parcial).',
  '',
  'Endpoint: PUT /pgrl/v2/calen-festivos/{idReg}. La tool recupera el calendario',
  'actual, aplica encima los campos informados y envía el objeto completo.',
  'El `idReg` sale de freematica_list_calen_festivos.',
].join('\n');

const UPDATE_DET_DESCRIPTION = [
  'Actualiza el detalle de un calendario festivo existente.',
  '',
  'Endpoint: PUT /pgrl/v2/calen-festivos-det/{idReg}. Envía directamente los campos indicados.',
  'El `idReg` es el identificador del detalle del calendario festivo.',
].join('\n');

export function registerPgrlCalendariosFestivosTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  server.tool(
    LIST_TOOL,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listCalenFestivos({ page, items });
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
      idReg: z.string().min(1).describe('Identificador opaco del calendario festivo (campo "idReg" en freematica_list_calen_festivos).'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getCalenFestivo(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  server.tool(
    CREATE_TOOL,
    CREATE_DESCRIPTION,
    {
      fields: z.record(z.string(), z.unknown()).describe(
        'Campos nativos del calendario festivo. Principales: COD_CALEN_FESTIVOS, DESCRIPCION para la cabecera. Para el detalle: COD_CALEN, FECHA, DESC_FEST_DET, HORAS_TRABAJO, FECHA_ESP, TIPO_FEST.',
      ),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ fields }): Promise<CallToolResult> => {
      try {
        const created = await client.createCalenFestivo(fields);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    UPDATE_TOOL,
    UPDATE_DESCRIPTION,
    {
      idReg: z.string().min(1).describe('Identificador del calendario festivo.'),
      fields: z.record(z.string(), z.unknown()).describe('Campos a actualizar.'),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idReg, fields }): Promise<CallToolResult> => {
      try {
        const current = await client.getCalenFestivo(idReg);
        const body = { ...(current as Record<string, unknown>), ...fields };
        const updated = await client.updateCalenFestivo(idReg, body);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    UPDATE_DET_TOOL,
    UPDATE_DET_DESCRIPTION,
    {
      idReg: z.string().min(1).describe('Identificador del detalle de calendario festivo.'),
      fields: z.record(z.string(), z.unknown()).describe('Campos a actualizar.'),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idReg, fields }): Promise<CallToolResult> => {
      try {
        const updated = await client.updateCalenFestivoDet(idReg, fields);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
