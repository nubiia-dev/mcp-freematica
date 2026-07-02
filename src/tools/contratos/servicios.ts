import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreateServicioShape,
  UpdateServicioFechasShape,
  ServicioHistoricoPreciosShape,
  CreateServicioFacturacionTxtShape,
  UpdateServicioFacturacionShape,
  buildServicioBody,
  buildHistoricoPreciosBody,
  buildFacturacionTxtBody,
  buildServicioFacturacionBody,
  type ServicioFields,
  type HistoricoPreciosFields,
  type ServicioFacturacionFields,
} from '../../schemas/contratos.js';
import { decodeContratoIdReg, decodeServicioIdReg } from '../../utils/idreg.js';
import { error, ok, okList } from '../helpers.js';
import type { RegisterOptions } from './cabecera.js';

const LIST_TOOL_NAME = 'freematica_list_servicios_contrato';
const GET_TOOL_NAME = 'freematica_get_servicio_contrato';
const CREATE_TOOL_NAME = 'freematica_create_servicio_contrato';
const UPDATE_FECHAS_TOOL_NAME = 'freematica_update_servicio_fechas';
const CREATE_HIST_TOOL_NAME = 'freematica_create_servicio_historico_precios';
const UPDATE_HIST_TOOL_NAME = 'freematica_update_servicio_historico_precios';
const CREATE_FACTXT_TOOL_NAME = 'freematica_create_servicio_facturacion_txt';
const UPDATE_FAC_TOOL_NAME = 'freematica_update_servicio_facturacion';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de servicios de un contrato.',
  '',
  'Endpoint: GET /pvss/v1/contratos/{idContrato}/servicios.',
  'Cada item tiene campos CTRTS_* (CTRTS_COD, CTRTS_DES, CTRTS_TIPO,',
  'CTRTS_FECALTA, CTRTS_FECFIN, CTRTS_CLASE…) más `idReg` opaco',
  '(Base64 "EMP__DELEG__CTRT__COD") que se usa en las tools de escritura.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle de un servicio de contrato.',
  '',
  'Endpoint: GET /pvss/v2/contratos-servicios/{idreg}.',
  '`idReg` es el identificador opaco del servicio (campo "idReg" en los items',
  'de freematica_list_servicios_contrato).',
].join('\n');

const CREATE_DESCRIPTION = [
  'Da de alta un servicio en un contrato existente (Alta servicio de Cuadrantes).',
  '',
  'Endpoint: POST /pvss/v2/contratos/{idReg}/servicios — body VoServicios.',
  'Los campos requeridos por el API (empresa, delegación, código de contrato)',
  'se derivan automáticamente del idContrato; solo hay que pasar los datos del',
  'servicio. Si no se informa codServicio, lo asigna Freemática.',
  '',
  'NOTA: los precios del servicio NO van aquí; usa',
  'freematica_create_servicio_historico_precios tras crear el servicio.',
].join('\n');

const UPDATE_FECHAS_DESCRIPTION = [
  'Actualiza las fechas de inicio y/o fin de un servicio de contrato.',
  '',
  'Endpoint: PUT /pvss/v2/contratos/{idContrato}/servicio/{idServicio}.',
  'Según el spec del API, este endpoint SOLO actualiza fecha inicio y fecha fin.',
  'Informar fechaFin es la forma estándar de dar de baja un servicio (no existe',
  'DELETE en el API).',
].join('\n');

const CREATE_HIST_DESCRIPTION = [
  'Da de alta un registro de histórico de precios de un servicio.',
  '',
  'Endpoint: POST /pvss/v2/contratos/{idContrato}/servicios-historico-precios/{idServicio}.',
  'Los precios de un servicio se gestionan como histórico versionado: cada alta',
  'añade una revisión (precio hora global/diurna/nocturna/festiva, importe fijo,',
  '% de incremento). Los campos de identificación se derivan de los idReg.',
].join('\n');

const UPDATE_HIST_DESCRIPTION = [
  'Actualiza un registro de histórico de precios de un servicio.',
  '',
  'Endpoint: PUT /pvss/v2/contratos/{idContrato}/servicios-historico-precios/{idServicio}.',
].join('\n');

const CREATE_FACTXT_DESCRIPTION = [
  'Da de alta una línea de texto de facturación de un servicio.',
  '',
  'Endpoint: POST /pvss/v2/contratos/{idContrato}/servicios-facturacion-txt/{idServicio}.',
  'Los textos aparecen en las líneas de factura del servicio. Requerido: linea',
  '(código de línea, 4c). Los campos de identificación se derivan de los idReg.',
].join('\n');

const UPDATE_FAC_DESCRIPTION = [
  'Actualiza los datos de facturación de un servicio (precios hora, importe,',
  'forma de pago, clave de facturación…).',
  '',
  'Endpoint: PUT /pvss/v2/contratos/{idContrato}/servicios-facturacion/{idServicio}.',
  'Los campos más comunes tienen parámetro propio; el resto de los 42 campos',
  'VoServiciosFac puede pasarse en camposAdicionales con su nombre nativo CTRTF_*.',
].join('\n');

/** Tools de servicios de contrato: list/get (lectura) + create/update (escritura). */
export function registerServiciosTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions,
): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    {
      idContrato: z
        .string()
        .min(1)
        .describe('idReg opaco del contrato (campo "idReg" en freematica_list_contratos).'),
      ...PaginationSchema,
      order: z.string().optional().describe('Orden de los registros. Ejemplo: "CTRTS_COD asc".'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idContrato, page, items, order }): Promise<CallToolResult> => {
      try {
        const result = await client.listServiciosContrato(idContrato, { page, items, order });
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
        .describe('idReg opaco del servicio (campo "idReg" en freematica_list_servicios_contrato).'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const servicio = await client.getServicioContrato(idReg);
        return ok(servicio) as CallToolResult;
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
    CreateServicioShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ idContrato, ...fields }): Promise<CallToolResult> => {
      try {
        const parts = decodeContratoIdReg(idContrato);
        const body = buildServicioBody(parts, fields as ServicioFields);
        const created = await client.createServicioContrato(idContrato, body);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    UPDATE_FECHAS_TOOL_NAME,
    UPDATE_FECHAS_DESCRIPTION,
    UpdateServicioFechasShape,
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idContrato, idServicio, fechaAlta, fechaFin }): Promise<CallToolResult> => {
      try {
        if (fechaAlta === undefined && fechaFin === undefined) {
          return error(
            new Error('Debes informar fechaAlta y/o fechaFin.'),
          ) as CallToolResult;
        }
        const parts = decodeServicioIdReg(idServicio);
        const body: Record<string, unknown> = {
          CTRTS_EMP: parts.empresa,
          CTRTS_DELEG: parts.delegacion,
          CTRTS_CTRT: parts.codContrato,
          CTRTS_COD: parts.codServicio,
        };
        if (fechaAlta !== undefined) body['CTRTS_FECALTA'] = fechaAlta;
        if (fechaFin !== undefined) body['CTRTS_FECFIN'] = fechaFin;
        const updated = await client.updateServicioFechas(idContrato, idServicio, body);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    CREATE_HIST_TOOL_NAME,
    CREATE_HIST_DESCRIPTION,
    ServicioHistoricoPreciosShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ idContrato, idServicio, ...fields }): Promise<CallToolResult> => {
      try {
        const parts = decodeServicioIdReg(idServicio);
        const body = buildHistoricoPreciosBody(parts, fields as HistoricoPreciosFields);
        const created = await client.createServicioHistoricoPrecios(idContrato, idServicio, body);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    UPDATE_HIST_TOOL_NAME,
    UPDATE_HIST_DESCRIPTION,
    ServicioHistoricoPreciosShape,
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idContrato, idServicio, ...fields }): Promise<CallToolResult> => {
      try {
        const parts = decodeServicioIdReg(idServicio);
        const body = buildHistoricoPreciosBody(parts, fields as HistoricoPreciosFields);
        const updated = await client.updateServicioHistoricoPrecios(idContrato, idServicio, body);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    CREATE_FACTXT_TOOL_NAME,
    CREATE_FACTXT_DESCRIPTION,
    CreateServicioFacturacionTxtShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ idContrato, idServicio, linea, texto, textoAmpliado }): Promise<CallToolResult> => {
      try {
        const parts = decodeServicioIdReg(idServicio);
        const body = buildFacturacionTxtBody(parts, { linea, texto, textoAmpliado });
        const created = await client.createServicioFacturacionTxt(idContrato, idServicio, body);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    UPDATE_FAC_TOOL_NAME,
    UPDATE_FAC_DESCRIPTION,
    UpdateServicioFacturacionShape,
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idContrato, idServicio, ...fields }): Promise<CallToolResult> => {
      try {
        const parts = decodeServicioIdReg(idServicio);
        const body = buildServicioFacturacionBody(parts, fields as ServicioFacturacionFields);
        // 4 claves de identificación siempre presentes; exigir al menos un dato más
        if (Object.keys(body).length <= 4) {
          return error(
            new Error('Debes informar al menos un campo de facturación a actualizar.'),
          ) as CallToolResult;
        }
        const updated = await client.updateServicioFacturacion(idContrato, idServicio, body);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
