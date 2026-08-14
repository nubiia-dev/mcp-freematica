import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio PPDE (portal del empleado).
 *
 * Tools de lectura (siempre activas):
 *  1. freematica_list_ppde_configuracion_acceso_usuario → GET /ppde/v2/configuracion-acceso-usuario
 *  2. freematica_get_ppde_configuracion_acceso_usuario  → GET /ppde/v2/configuracion-acceso-usuario/:idreg
 *  3. freematica_list_ppde_personal_doc                 → GET /ppde/v1/personal_doc
 *  4. freematica_get_ppde_personal_doc                  → GET /ppde/v1/personal_doc/:idreg
 *  5. freematica_list_ppde_solicitud_vacaciones         → GET /ppde/v2/solicitud-vacaciones
 *  6. freematica_get_ppde_solicitud_vacacion            → GET /ppde/v2/solicitud-vacaciones/:idreg
 *
 * Tools de escritura (requieren enableWrites=true):
 *  7. freematica_update_ppde_solicitud_vacacion   → PUT  /ppde/v2/solicitud-vacaciones/:idreg
 *  8. freematica_create_ppde_recordatorio_firma   → POST /ppde/v2/recordatorio_firma
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerPpdeTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_ppde_configuracion_acceso_usuario
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_ppde_configuracion_acceso_usuario',
    'Lista paginada de configuraciones de acceso de usuario al portal del empleado.\n\nEndpoint: GET /ppde/v2/configuracion-acceso-usuario',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpdeConfiguracionAccesoUsuario({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_get_ppde_configuracion_acceso_usuario
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_ppde_configuracion_acceso_usuario',
    'Detalle de la configuración de acceso de un usuario al portal del empleado.\n\nEndpoint: GET /ppde/v2/configuracion-acceso-usuario/:idreg',
    { idReg: z.string().min(1).describe('idReg opaco de la configuración de acceso.') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getPpdeConfiguracionAccesoUsuario(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_list_ppde_personal_doc
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_ppde_personal_doc',
    'Lista paginada de documentos de personal del portal del empleado.\n\nEndpoint: GET /ppde/v1/personal_doc',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpdePersonalDoc({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_get_ppde_personal_doc
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_ppde_personal_doc',
    'Detalle de un documento de personal del portal del empleado.\n\nEndpoint: GET /ppde/v1/personal_doc/:idreg',
    { idReg: z.string().min(1).describe('idReg opaco del documento de personal.') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getPpdePersonalDoc(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 5. freematica_list_ppde_solicitud_vacaciones
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_ppde_solicitud_vacaciones',
    'Lista paginada de solicitudes de vacaciones del portal del empleado.\n\nEndpoint: GET /ppde/v2/solicitud-vacaciones',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpdeSolicitudVacaciones({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 6. freematica_get_ppde_solicitud_vacacion
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_ppde_solicitud_vacacion',
    'Detalle de una solicitud de vacaciones del portal del empleado.\n\nEndpoint: GET /ppde/v2/solicitud-vacaciones/:idreg',
    { idReg: z.string().min(1).describe('idReg opaco de la solicitud de vacaciones.') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getPpdeSolicitudVacacion(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 7. freematica_update_ppde_solicitud_vacacion
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_ppde_solicitud_vacacion',
    'Actualiza una solicitud de vacaciones del portal del empleado.\n\nEndpoint: PUT /ppde/v2/solicitud-vacaciones/:idreg',
    {
      idReg: z.string().min(1).describe('idReg opaco de la solicitud de vacaciones.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos a actualizar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePpdeSolicitudVacacion(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 8. freematica_create_ppde_recordatorio_firma
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_ppde_recordatorio_firma',
    'Envía un recordatorio de firma en el portal del empleado.\n\nEndpoint: POST /ppde/v2/recordatorio_firma\n\nCampos conocidos (prefijo VSSDOC_*): VSSDOC_IDVSSTO (idReg del documento de firma), VSSDOC_FIREN (fecha de envío del recordatorio, formato ISO).',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del recordatorio de firma (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPpdeRecordatorioFirma(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
