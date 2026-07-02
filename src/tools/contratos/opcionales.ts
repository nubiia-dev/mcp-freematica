import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreateContratoOpcionalesShape,
  UpdateContratoOpcionalesShape,
  buildContratoOpcionalesBody,
  type ContratoOpcionalesFields,
} from '../../schemas/contratos.js';
import { error, ok, okList } from '../helpers.js';
import type { RegisterOptions } from './cabecera.js';

const LIST_TOOL_NAME = 'freematica_list_contratos_opcionales';
const GET_TOOL_NAME = 'freematica_get_contrato_opcionales';
const CREATE_TOOL_NAME = 'freematica_create_contrato_opcionales';
const UPDATE_TOOL_NAME = 'freematica_update_contrato_opcionales';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de registros de opcionales de contratos',
  '(módulo Presupuestos y Contratos, ppre).',
  '',
  'Endpoint: GET /ppre/v2/contratos/opcionales. Cada item tiene campos CON2_*',
  '(10 numéricos y 10 alfanuméricos de propósito libre, descuentos, garantías,',
  'observaciones) más `idReg` opaco para el resto de tools de opcionales.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle de un registro de opcionales de contrato.',
  '',
  'Endpoint: GET /ppre/v2/contratos/opcionales/{idReg}.',
  '`idReg` es el identificador opaco (campo "idReg" en los items de',
  'freematica_list_contratos_opcionales).',
].join('\n');

const CREATE_DESCRIPTION = [
  'Da de alta un registro de opcionales de contrato.',
  '',
  'Endpoint: POST /ppre/v2/contratos/opcionales — body VoContratosOpcionales.',
  'Requeridos: empresa, delegacion, tipoContrato, numContrato, fechaContrato.',
  'Los campos flexibles (CON2_OPC_NUM1..10, CON2_OPC_ALFA1..10, descuentos,',
  'garantías) se pasan en camposAdicionales con su nombre nativo CON2_*.',
].join('\n');

const UPDATE_DESCRIPTION = [
  'Actualiza un registro de opcionales de contrato existente.',
  '',
  'Endpoint: PUT /ppre/v2/contratos/opcionales/{idReg}.',
  'Solo se envían al API los campos informados.',
].join('\n');

/** Tools de opcionales de contrato: list/get (lectura) + create/update (escritura). */
export function registerOpcionalesTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions,
): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    {
      ...PaginationSchema,
      order: z.string().optional().describe('Orden de los registros. Ejemplo: "CON2_FCHCONT desc".'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, order }): Promise<CallToolResult> => {
      try {
        const result = await client.listContratosOpcionales({ page, items, order });
        return okList({
          items: result.items,
          total: result.total,
          page,
          itemsPerPage: items,
        }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      idReg: z
        .string()
        .min(1)
        .describe('idReg opaco del registro (campo "idReg" en freematica_list_contratos_opcionales).'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const registro = await client.getContratoOpcionales(idReg);
        return ok(registro) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  server.tool(
    CREATE_TOOL_NAME,
    CREATE_DESCRIPTION,
    CreateContratoOpcionalesShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildContratoOpcionalesBody(args as ContratoOpcionalesFields);
        const created = await client.createContratoOpcionales(body);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    UPDATE_TOOL_NAME,
    UPDATE_DESCRIPTION,
    UpdateContratoOpcionalesShape,
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...fields }): Promise<CallToolResult> => {
      try {
        const body = buildContratoOpcionalesBody(fields as ContratoOpcionalesFields);
        if (Object.keys(body).length === 0) {
          return error(
            new Error('Debes informar al menos un campo a actualizar además de idReg.'),
          ) as CallToolResult;
        }
        const updated = await client.updateContratoOpcionales(idReg, body);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
