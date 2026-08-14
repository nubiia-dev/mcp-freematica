import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { error, ok, type RegisterOptions } from './helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const UPDATE_CUADRANTE = 'freematica_update_cuadrante';
const CREATE_CAMPO_ESTADISTICO = 'freematica_create_campo_estadistico';
const UPDATE_CAMPO_ESTADISTICO = 'freematica_update_campo_estadistico';
const CREATE_INFORME_CONTROL = 'freematica_create_informe_control';
const UPDATE_SERVICIO_FCH_FIN = 'freematica_update_servicio_fch_fin';

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools de escritura del dominio PVSS (Fase 7).
 *
 * Tools expuestas (escritura, enableWrites=true):
 *  1. freematica_update_cuadrante        → PUT /pvss/v2/cuadrante/:idReg
 *  2. freematica_create_campo_estadistico → POST /pvss/v2/campos-estadisticos
 *  3. freematica_update_campo_estadistico → PUT /pvss/v2/campos-estadisticos/:idReg
 *  4. freematica_create_informe_control   → POST /pvss/v2/informes-control
 *  5. freematica_update_servicio_fch_fin  → PUT /pvss/v2/servicios-fch-fin/:idReg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerPvssEscriturasTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 1. freematica_update_cuadrante
  // -------------------------------------------------------------------------

  server.tool(
    UPDATE_CUADRANTE,
    'Actualiza un cuadrante con campos adicionales libres.\n\nEndpoint: PUT /pvss/v2/cuadrante/:idReg.',
    {
      idReg: z.string().min(1).describe('idReg opaco del cuadrante.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos a enviar al API (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updateCuadrante(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_create_campo_estadistico
  // -------------------------------------------------------------------------

  server.tool(
    CREATE_CAMPO_ESTADISTICO,
    'Crea un campo estadístico de cuadrante.\n\nEndpoint: POST /pvss/v2/campos-estadisticos.',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del campo estadístico (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createCampoEstadistico(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_update_campo_estadistico
  // -------------------------------------------------------------------------

  server.tool(
    UPDATE_CAMPO_ESTADISTICO,
    'Actualiza un campo estadístico de cuadrante.\n\nEndpoint: PUT /pvss/v2/campos-estadisticos/:idReg.',
    {
      idReg: z.string().min(1).describe('idReg opaco del campo estadístico.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos a actualizar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updateCampoEstadistico(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_create_informe_control
  // -------------------------------------------------------------------------

  server.tool(
    CREATE_INFORME_CONTROL,
    'Crea un informe de control.\n\nEndpoint: POST /pvss/v2/informes-control.',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del informe de control (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createInformeControl(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 5. freematica_update_servicio_fch_fin
  // -------------------------------------------------------------------------

  server.tool(
    UPDATE_SERVICIO_FCH_FIN,
    [
      'Actualiza la fecha de fin de un servicio de contrato.',
      '',
      'Endpoint: PUT /pvss/v2/servicios-fch-fin/:idReg.',
      '',
      'Nota: Este endpoint es distinto de freematica_update_servicio_fechas,',
      'que actualiza las fechas de inicio/fin de un servicio usando',
      'PUT /pvss/v2/contratos/:idContrato/servicio/:idServicio.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('idReg opaco del servicio.'),
      CTRTS_FCH_FIN: z.string().optional().describe('Fecha fin del servicio (formato ISO YYYY-MM-DD).'),
      CTRTS_FCH_BAJA: z.string().optional().describe('Fecha de baja del servicio (formato ISO YYYY-MM-DD).'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos adicionales CTRTS_* a actualizar.'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async (args): Promise<CallToolResult> => {
      try {
        const { idReg, camposAdicionales, ...explicit } = args;
        const body: Record<string, unknown> = { ...explicit, ...(camposAdicionales ?? {}) };
        const result = await client.updateServicioFchFin(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
