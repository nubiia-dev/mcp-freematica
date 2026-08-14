import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const LIST_SERV_ALTA = 'freematica_list_habilitaciones_servicios_alta';
const LIST_SERV_BAJA = 'freematica_list_habilitaciones_servicios_baja';
const LIST_PERS_ALTA = 'freematica_list_habilitaciones_personal_alta';
const LIST_PERS_BAJA = 'freematica_list_habilitaciones_personal_baja';

const ACTUALIZAR_ALTA_PERS = 'freematica_actualizar_alta_habilitaciones_personal';
const ACTUALIZAR_BAJA_PERS = 'freematica_actualizar_baja_habilitaciones_personal';
const ACTUALIZAR_ALTA_SERV = 'freematica_actualizar_alta_habilitaciones_servicios';
const ACTUALIZAR_BAJA_SERV = 'freematica_actualizar_baja_habilitaciones_servicios';
const CREATE_SOLICITUD_MATERIAL = 'freematica_create_solicitud_material';
const LIST_SOLICITUDES_MATERIAL = 'freematica_list_solicitudes_material';
const GET_SOLICITUD_MATERIAL = 'freematica_get_solicitud_material';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const DESC_SERV_ALTA = [
  'Devuelve altas de servicios-personal en el módulo de habilitaciones CAE (feed incremental).',
  'Usar para detectar nuevas asignaciones de trabajadores a centros de trabajo.',
  '',
  'Endpoint: GET /peqv/v2/habilitaciones/servicios/alta.',
].join('\n');

const DESC_SERV_BAJA = [
  'Devuelve bajas de servicios-personal en el módulo de habilitaciones CAE (feed incremental).',
  'Usar para detectar desvinculaciones de trabajadores de centros de trabajo.',
  '',
  'Endpoint: GET /peqv/v2/habilitaciones/servicios/baja.',
].join('\n');

const DESC_PERS_ALTA = [
  'Devuelve altas de licencias de personal en el módulo de habilitaciones CAE (feed incremental).',
  'Usar para detectar nuevas habilitaciones del personal.',
  '',
  'Endpoint: GET /peqv/v2/habilitaciones/personal/alta.',
].join('\n');

const DESC_PERS_BAJA = [
  'Devuelve bajas de licencias de personal en el módulo de habilitaciones CAE (feed incremental).',
  'Usar para detectar revocaciones de habilitaciones del personal.',
  '',
  'Endpoint: GET /peqv/v2/habilitaciones/personal/baja.',
].join('\n');

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ListHabilitacionesSchema = {
  ...PaginationSchema,
  desde: z
    .string()
    .optional()
    .describe(
      'Fecha de corte para sincronización incremental (formato YYYY-MM-DD). Si no se informa, devuelve todos los registros.',
    ),
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeHandler(
  client: FreematicaClient,
  endpoint: string,
): (args: { page: number; items: number; desde?: string }) => Promise<CallToolResult> {
  return async ({ page, items, desde }) => {
    try {
      const result = await client.listHabilitaciones(endpoint, { page, items, desde });
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
 * Registra las tools MCP del dominio Habilitaciones CAE.
 *
 * Tools expuestas (lectura):
 *  1. freematica_list_habilitaciones_servicios_alta
 *  2. freematica_list_habilitaciones_servicios_baja
 *  3. freematica_list_habilitaciones_personal_alta
 *  4. freematica_list_habilitaciones_personal_baja
 *  5. freematica_list_solicitudes_material
 *  6. freematica_get_solicitud_material
 *
 * Tools expuestas (escritura, enableWrites=true):
 *  7.  freematica_actualizar_alta_habilitaciones_personal
 *  8.  freematica_actualizar_baja_habilitaciones_personal
 *  9.  freematica_actualizar_alta_habilitaciones_servicios
 *  10. freematica_actualizar_baja_habilitaciones_servicios
 *  11. freematica_create_solicitud_material
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa tools de escritura).
 */
export function registerHabilitacionesTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  server.tool(
    LIST_SERV_ALTA,
    DESC_SERV_ALTA,
    ListHabilitacionesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeHandler(client, '/peqv/v2/habilitaciones/servicios/alta'),
  );

  server.tool(
    LIST_SERV_BAJA,
    DESC_SERV_BAJA,
    ListHabilitacionesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeHandler(client, '/peqv/v2/habilitaciones/servicios/baja'),
  );

  server.tool(
    LIST_PERS_ALTA,
    DESC_PERS_ALTA,
    ListHabilitacionesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeHandler(client, '/peqv/v2/habilitaciones/personal/alta'),
  );

  server.tool(
    LIST_PERS_BAJA,
    DESC_PERS_BAJA,
    ListHabilitacionesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeHandler(client, '/peqv/v2/habilitaciones/personal/baja'),
  );

  // -------------------------------------------------------------------------
  // 5. freematica_list_solicitudes_material
  // -------------------------------------------------------------------------

  server.tool(
    LIST_SOLICITUDES_MATERIAL,
    'Devuelve la lista paginada de solicitudes de material (módulo PEQV).\n\nEndpoint: GET /peqv/v2/solicitud-material.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listSolicitudesMaterial({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 6. freematica_get_solicitud_material
  // -------------------------------------------------------------------------

  server.tool(
    GET_SOLICITUD_MATERIAL,
    'Devuelve el detalle de una solicitud de material por su idReg opaco.\n\nEndpoint: GET /peqv/v2/solicitud-material/:idreg.',
    {
      idReg: z
        .string()
        .min(1)
        .describe('idReg opaco de la solicitud de material (campo "idReg" en los items de freematica_list_solicitudes_material).'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const item = await client.getSolicitudMaterial(idReg);
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // =========================================================================
  // ESCRITURAS (requieren enableWrites: true)
  // =========================================================================

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 7. freematica_actualizar_alta_habilitaciones_personal
  // -------------------------------------------------------------------------

  const HabSchema = {
    datos: z
      .array(z.record(z.string(), z.unknown()))
      .describe('Array de habilitaciones a comunicar. Cada item contiene los campos según docs Freemática.'),
  };

  server.tool(
    ACTUALIZAR_ALTA_PERS,
    'Comunica altas de habilitaciones de personal.\n\nEndpoint: PUT /peqv/v2/habilitaciones/personal/actualizar/alta.',
    HabSchema,
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ datos }): Promise<CallToolResult> => {
      try {
        const result = await client.actualizarAltaHabilitacionesPersonal(datos);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 8. freematica_actualizar_baja_habilitaciones_personal
  // -------------------------------------------------------------------------

  server.tool(
    ACTUALIZAR_BAJA_PERS,
    'Comunica bajas de habilitaciones de personal.\n\nEndpoint: PUT /peqv/v2/habilitaciones/personal/actualizar/baja.',
    HabSchema,
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ datos }): Promise<CallToolResult> => {
      try {
        const result = await client.actualizarBajaHabilitacionesPersonal(datos);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 9. freematica_actualizar_alta_habilitaciones_servicios
  // -------------------------------------------------------------------------

  server.tool(
    ACTUALIZAR_ALTA_SERV,
    'Comunica altas de habilitaciones de servicios.\n\nEndpoint: PUT /peqv/v2/habilitaciones/servicios/actualizar/alta.',
    HabSchema,
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ datos }): Promise<CallToolResult> => {
      try {
        const result = await client.actualizarAltaHabilitacionesServicios(datos);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 10. freematica_actualizar_baja_habilitaciones_servicios
  // -------------------------------------------------------------------------

  server.tool(
    ACTUALIZAR_BAJA_SERV,
    'Comunica bajas de habilitaciones de servicios.\n\nEndpoint: PUT /peqv/v2/habilitaciones/servicios/actualizar/baja.',
    HabSchema,
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ datos }): Promise<CallToolResult> => {
      try {
        const result = await client.actualizarBajaHabilitacionesServicios(datos);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 11. freematica_create_solicitud_material
  // -------------------------------------------------------------------------

  server.tool(
    CREATE_SOLICITUD_MATERIAL,
    'Crea una solicitud de material.\n\nEndpoint: POST /peqv/v2/solicitud-material.',
    {
      EQSM_EMP: z.string().optional().describe('Código empresa'),
      EQSM_DELEG: z.string().optional().describe('Código delegación'),
      EQSM_CTRT: z.string().optional().describe('Código contrato'),
      EQSM_SERV: z.string().optional().describe('Código servicio'),
      EQSM_APP_ORI: z.string().optional().describe('Aplicación origen'),
      EQSM_DISPOSITIVO_ORI: z.string().optional().describe('Dispositivo origen'),
      EQSM_EMP_PERSO_ORI: z.string().optional().describe('Empresa persona origen'),
      EQSM_DELEG_PERSO_ORI: z.string().optional().describe('Delegación persona origen'),
      EQSM_COD_PERSO_ORI: z.string().optional().describe('Código persona origen'),
      EQSM_FECHA: z.string().optional().describe('Fecha solicitud (ISO)'),
      EQSM_COD_ART: z.string().optional().describe('Código artículo'),
      EQSM_CANT_SOLICITADA: z.number().optional().describe('Cantidad solicitada'),
      EQSM_OBS_SOLICITUD: z.string().optional().describe('Observaciones'),
      EQSM_ESTADO: z
        .enum(['P', 'F', 'V'])
        .optional()
        .describe('Estado: P=Pendiente, F=Finalizada, V=Validada'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async (args): Promise<CallToolResult> => {
      try {
        const result = await client.createSolicitudMaterial(args as Record<string, unknown>);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
