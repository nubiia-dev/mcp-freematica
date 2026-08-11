import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList } from './helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const LIST_CONTRATOS_SERVICIOS_GLOBAL = 'freematica_list_contratos_servicios_global';
const LIST_CONTRATOS_TURNOS = 'freematica_list_contratos_turnos';
const LIST_CONTRATOS_HORARIOS_OP = 'freematica_list_contratos_horarios_operativa';
const LIST_CLASES_SERVICIOS = 'freematica_list_clases_servicios';
const LIST_INSPECTORES = 'freematica_list_inspectores';
const GET_INSPECTOR_EMPRESA = 'freematica_get_inspector_empresa';
const LIST_CLAVES_FACTURACION = 'freematica_list_claves_facturacion';
const LIST_INCIDENCIAS_SERVICIOS = 'freematica_list_incidencias_servicios';
const GET_INCIDENCIA_SERVICIO = 'freematica_get_incidencia_servicio';
const LIST_INCIDENCECODE = 'freematica_list_incidencecode';
const GET_CONTRATOS_SERVICIOS_MATERIAL = 'freematica_get_contratos_servicios_material';

// ---------------------------------------------------------------------------
// Shared schema fragments
// ---------------------------------------------------------------------------

const OrderParam = {
  order: z
    .string()
    .min(1)
    .optional()
    .describe('Orden de los registros. Ejemplo: "CAMPO asc".'),
};

const ListWithOrderSchema = { ...PaginationSchema, ...OrderParam };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeListHandler(
  client: FreematicaClient,
  endpoint: string,
): (args: { page: number; items: number; order?: string }) => Promise<CallToolResult> {
  return async ({ page, items, order }) => {
    try {
      const result = await client.listServiciosPvss(endpoint, { page, items, order });
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
  };
}

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del dominio Servicios PVSS (extras).
 *
 * Tools expuestas:
 *  1.  freematica_list_contratos_servicios_global
 *  2.  freematica_list_contratos_turnos
 *  3.  freematica_list_contratos_horarios_operativa
 *  4.  freematica_list_clases_servicios
 *  5.  freematica_list_inspectores
 *  6.  freematica_get_inspector_empresa
 *  7.  freematica_list_claves_facturacion
 *  8.  freematica_list_incidencias_servicios
 *  9.  freematica_get_incidencia_servicio
 *  10. freematica_list_incidencecode
 *  11. freematica_get_contratos_servicios_material
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerServiciosPvssTools(server: McpServer, client: FreematicaClient): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_contratos_servicios_global
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CONTRATOS_SERVICIOS_GLOBAL,
    [
      'Devuelve la lista paginada GLOBAL de servicios de todos los contratos.',
      'A diferencia de freematica_list_servicios_contrato (que requiere un contrato específico),',
      'este endpoint devuelve todos los servicios independientemente del contrato al que pertenecen.',
      '',
      'Endpoint: GET /pvss/v1/contratos-servicios.',
    ].join('\n'),
    ListWithOrderSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/contratos-servicios'),
  );

  // -------------------------------------------------------------------------
  // 2. freematica_list_contratos_turnos
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CONTRATOS_TURNOS,
    'Devuelve la lista paginada de turnos de contratos.\n\nEndpoint: GET /pvss/v1/contratos-turnos.',
    ListWithOrderSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/contratos-turnos'),
  );

  // -------------------------------------------------------------------------
  // 3. freematica_list_contratos_horarios_operativa
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CONTRATOS_HORARIOS_OP,
    'Devuelve la lista paginada de horarios de operativa de contratos.\n\nEndpoint: GET /pvss/v1/contratos-horarios-operativa.',
    ListWithOrderSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/contratos-horarios-operativa'),
  );

  // -------------------------------------------------------------------------
  // 4. freematica_list_clases_servicios
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CLASES_SERVICIOS,
    'Devuelve la lista paginada de clases de servicios.\n\nEndpoint: GET /pvss/v1/clases-servicios.',
    ListWithOrderSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/clases-servicios'),
  );

  // -------------------------------------------------------------------------
  // 5. freematica_list_inspectores
  // -------------------------------------------------------------------------
  server.tool(
    LIST_INSPECTORES,
    'Devuelve la lista paginada de inspectores.\n\nEndpoint: GET /pvss/v1/inspectores.',
    ListWithOrderSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/inspectores'),
  );

  // -------------------------------------------------------------------------
  // 6. freematica_get_inspector_empresa
  // -------------------------------------------------------------------------
  server.tool(
    GET_INSPECTOR_EMPRESA,
    'Devuelve el inspector asignado a la empresa actual.\n\nEndpoint: GET /pvss/v1/inspector-empresa.',
    {},
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (): Promise<CallToolResult> => {
      try {
        const item = await client.getServicioPvss('/pvss/v1/inspector-empresa');
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 7. freematica_list_claves_facturacion
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CLAVES_FACTURACION,
    'Devuelve la lista paginada de claves de facturación.\n\nEndpoint: GET /pvss/v2/claves-facturacion.',
    ListWithOrderSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v2/claves-facturacion'),
  );

  // -------------------------------------------------------------------------
  // 8. freematica_list_incidencias_servicios
  // -------------------------------------------------------------------------
  server.tool(
    LIST_INCIDENCIAS_SERVICIOS,
    'Devuelve la lista paginada de incidencias de servicios.\n\nEndpoint: GET /pvss/v2/incidencias-servicios.',
    ListWithOrderSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v2/incidencias-servicios'),
  );

  // -------------------------------------------------------------------------
  // 9. freematica_get_incidencia_servicio
  // -------------------------------------------------------------------------
  server.tool(
    GET_INCIDENCIA_SERVICIO,
    'Devuelve el detalle de una incidencia de servicio por su idReg opaco.\n\nEndpoint: GET /pvss/v2/incidencias-servicios/{idReg}.',
    {
      idReg: z
        .string()
        .min(1)
        .describe(
          'idReg opaco de la incidencia de servicio (campo "idReg" en los items de freematica_list_incidencias_servicios).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const item = await client.getServicioPvss(
          `/pvss/v2/incidencias-servicios/${encodeURIComponent(idReg)}`,
        );
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 10. freematica_list_incidencecode
  // -------------------------------------------------------------------------
  server.tool(
    LIST_INCIDENCECODE,
    [
      'Devuelve la lista paginada de códigos de incidencia (incidencecode).',
      'Usa el endpoint v2 por defecto; la versión v1 también existe pero puede diferir en campos.',
      '',
      'Endpoint: GET /pvss/v2/incidencecode.',
    ].join('\n'),
    ListWithOrderSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v2/incidencecode'),
  );

  // -------------------------------------------------------------------------
  // 11. freematica_get_contratos_servicios_material
  // -------------------------------------------------------------------------
  server.tool(
    GET_CONTRATOS_SERVICIOS_MATERIAL,
    [
      'Devuelve el detalle del material asignado a un servicio de contrato por su idReg opaco.',
      'Para la lista global de materiales asignados a servicios, usar freematica_list_materiales_asignados_servicios.',
      '',
      'Endpoint: GET /pvss/v2/contratos-servicios-material/{idreg}.',
    ].join('\n'),
    {
      idReg: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del material de contrato-servicio (campo "idReg" en los items de freematica_list_materiales_asignados_servicios).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const item = await client.getContratoServicioMaterial(idReg);
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
