import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio PDIR (CSM — indicadores de dirección).
 *
 * Tools de lectura (siempre activas):
 *  1. freematica_list_pdir_csm_grupo_indicador → GET /pdir/v1/csm/grupoindicador
 *  2. freematica_list_pdir_csm_indicador       → GET /pdir/v1/csm/indicador
 *  3. freematica_get_pdir_csm_indicador        → GET /pdir/v1/csm/indicador/:idreg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (no hay writes en este módulo).
 */
export function registerPdirTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  void opts;

  // -------------------------------------------------------------------------
  // 1. freematica_list_pdir_csm_grupo_indicador
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pdir_csm_grupo_indicador',
    'Lista paginada de grupos de indicadores CSM.\n\nEndpoint: GET /pdir/v1/csm/grupoindicador',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPdirCsmGrupoIndicador({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_list_pdir_csm_indicador
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pdir_csm_indicador',
    'Lista paginada de indicadores CSM.\n\nEndpoint: GET /pdir/v1/csm/indicador',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPdirCsmIndicador({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_get_pdir_csm_indicador
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pdir_csm_indicador',
    'Detalle de un indicador CSM.\n\nEndpoint: GET /pdir/v1/csm/indicador/:idreg',
    { idReg: z.string().min(1).describe('idReg opaco del indicador CSM.') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getPdirCsmIndicador(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
