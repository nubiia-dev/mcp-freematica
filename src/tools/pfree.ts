import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio PFREE (IPs internas/ERP).
 *
 * Tools de lectura (siempre activas):
 *  1. freematica_list_pfree_ips     → GET /pfree/v2/ips
 *  2. freematica_list_pfree_ips_erp → GET /pfree/v2/ips-erp
 *  3. freematica_get_pfree_ip       → GET /pfree/v2/ips/:idReg
 *  4. freematica_get_pfree_ip_erp   → GET /pfree/v2/ips-erp/:idReg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (no hay writes en este módulo).
 */
export function registerPfreeTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  void opts;

  // -------------------------------------------------------------------------
  // 1. freematica_list_pfree_ips
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pfree_ips',
    'Lista paginada de IPs internas de Freemática.\n\nEndpoint: GET /pfree/v2/ips',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPfreeIps({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_list_pfree_ips_erp
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pfree_ips_erp',
    'Lista paginada de IPs ERP de Freemática.\n\nEndpoint: GET /pfree/v2/ips-erp',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPfreeIpsErp({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_get_pfree_ip
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pfree_ip',
    'Detalle de una IP interna de Freemática.\n\nEndpoint: GET /pfree/v2/ips/:idReg',
    { idReg: z.string().min(1).describe('idReg opaco de la IP.') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getPfreeIp(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_get_pfree_ip_erp
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pfree_ip_erp',
    'Detalle de una IP ERP de Freemática.\n\nEndpoint: GET /pfree/v2/ips-erp/:idReg',
    { idReg: z.string().min(1).describe('idReg opaco de la IP ERP.') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getPfreeIpErp(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
