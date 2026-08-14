import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio MCOM (usuarios de comunicaciones).
 *
 * Tools de lectura (siempre activas):
 *  1. freematica_list_mcom_usuarios → GET /mcom/v2/usuarios
 *  2. freematica_get_mcom_usuario   → GET /mcom/v2/usuarios/:idReg
 *
 * Tools de escritura (requieren enableWrites=true):
 *  3. freematica_create_mcom_usuario → POST /mcom/v2/usuarios
 *  4. freematica_update_mcom_usuario → PUT  /mcom/v2/usuarios/:idReg
 *
 * Descartados: webhooks de firma (evicertia, linkmobility, signaturit,
 * validateid) — son callbacks HTTP entrantes, no endpoints REST consultables.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerMcomTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_mcom_usuarios
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_mcom_usuarios',
    'Lista paginada de usuarios de comunicaciones.\n\nEndpoint: GET /mcom/v2/usuarios',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listMcomUsuarios({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_get_mcom_usuario
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_mcom_usuario',
    'Detalle de un usuario de comunicaciones.\n\nEndpoint: GET /mcom/v2/usuarios/:idReg',
    { idReg: z.string().min(1).describe('idReg opaco del usuario de comunicaciones.') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getMcomUsuario(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 3. freematica_create_mcom_usuario
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_mcom_usuario',
    'Crea un usuario de comunicaciones.\n\nEndpoint: POST /mcom/v2/usuarios',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del usuario de comunicaciones (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createMcomUsuario(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_update_mcom_usuario
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_mcom_usuario',
    'Actualiza un usuario de comunicaciones.\n\nEndpoint: PUT /mcom/v2/usuarios/:idReg',
    {
      idReg: z.string().min(1).describe('idReg opaco del usuario de comunicaciones.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos a actualizar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const changes: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const current = await client.getMcomUsuario(idReg);
        const body = { ...current, ...changes };
        const result = await client.updateMcomUsuario(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
