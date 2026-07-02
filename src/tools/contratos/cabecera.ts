import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreateContratoShape,
  UpdateContratoShape,
  buildContratoBody,
  type ContratoFields,
} from '../../schemas/contratos.js';
import { error, ok, okList } from '../helpers.js';

const LIST_TOOL_NAME = 'freematica_list_contratos';
const GET_TOOL_NAME = 'freematica_get_contrato';
const CREATE_TOOL_NAME = 'freematica_create_contrato';
const UPDATE_TOOL_NAME = 'freematica_update_contrato';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de cabeceras de contratos (módulo Contratos y Servicios).',
  '',
  'Endpoint: GET /pvss/v1/contratos. Cada item tiene campos CTRT_* (CTRT_EMP,',
  'CTRT_DELEG, CTRT_COD, CTRT_DES, CTRT_FECHA, CTRT_COD_CLI, dirección,',
  'CTRT_ABIERTO…) más `idReg` opaco (Base64 "EMP__DELEG__COD") que se usa en el',
  'resto de tools de contratos.',
  '',
  'Filtros disponibles: SOLO empresa y delegacion (params nativos del API).',
  'AVISO: el API ignora silenciosamente los filtros FIQL en este endpoint;',
  'para localizar un contrato concreto usa freematica_get_contrato.',
].join('\n');

const GET_DESCRIPTION = [
  'Busca una cabecera de contrato por sus códigos naturales (empresa + código',
  'de contrato, opcionalmente delegación).',
  '',
  'No existe endpoint singular en el API y el listado ignora los filtros FIQL,',
  'así que esta tool pagina el listado internamente (200 items por página) y',
  'filtra en cliente. Puede requerir varias llamadas al API en datasets grandes.',
  'Devuelve not_found si no hay coincidencia.',
].join('\n');

const CREATE_DESCRIPTION = [
  'Da de alta una cabecera de contrato (módulo Contratos y Servicios).',
  '',
  'Endpoint: POST /pvss/v2/contratos — body VoContratos.',
  'Requeridos: delegacion, descripcion (máx 40c), fecha, codCliente.',
  'Si no se informa codContrato, Freemática asigna el código automáticamente.',
  '',
  'IMPORTANTE: el API no valida referencias de negocio en el spec (p. ej. que',
  'codCliente exista); verifica los códigos con freematica_list_clientes antes.',
  'Devuelve el contrato creado, incluido su idReg.',
].join('\n');

const UPDATE_DESCRIPTION = [
  'Actualiza la cabecera de un contrato existente.',
  '',
  'Endpoint: PUT /pvss/v2/contratos/{idReg} — body VoContratos.',
  '`idReg` es el identificador opaco del contrato (de freematica_list_contratos',
  'o freematica_get_contrato). Solo se envían al API los campos informados.',
].join('\n');

export interface RegisterOptions {
  enableWrites: boolean;
}

/** Tools de cabecera de contrato: list/get (lectura) + create/update (escritura). */
export function registerCabeceraTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions,
): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    {
      ...PaginationSchema,
      empresa: z.string().max(4).optional().describe('Código de empresa (param nativo codEmpresa).'),
      delegacion: z
        .string()
        .max(4)
        .optional()
        .describe('Código de delegación (param nativo codDelegacion).'),
      order: z
        .string()
        .optional()
        .describe('Orden de los registros. Ejemplo: "CTRT_FECHA desc".'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, empresa, delegacion, order }): Promise<CallToolResult> => {
      try {
        const result = await client.listContratos({ page, items, empresa, delegacion, order });
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
      empresa: z.string().max(4).describe('Código de empresa (CTRT_EMP). Ej: "02".'),
      codContrato: z.string().max(10).describe('Código del contrato (CTRT_COD). Ej: "2304".'),
      delegacion: z
        .string()
        .max(4)
        .optional()
        .describe('Código de delegación (CTRT_DELEG). Acota la búsqueda si se conoce.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ empresa, codContrato, delegacion }): Promise<CallToolResult> => {
      try {
        const contrato = await client.getContrato({ empresa, codContrato, delegacion });
        return ok(contrato) as CallToolResult;
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
    CreateContratoShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildContratoBody(args as ContratoFields);
        const created = await client.createContrato(body);
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
    UpdateContratoShape,
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...fields }): Promise<CallToolResult> => {
      try {
        const body = buildContratoBody(fields as ContratoFields);
        if (Object.keys(body).length === 0) {
          return error(
            new Error('Debes informar al menos un campo a actualizar además de idReg.'),
          ) as CallToolResult;
        }
        const updated = await client.updateContrato(idReg, body);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
