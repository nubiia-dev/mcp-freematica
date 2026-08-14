import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio PKAI (KAIROS — fichajes).
 *
 * Tools de lectura (siempre activas):
 *  1. freematica_list_pkai_historicos_v1  → GET /pkai/v1/historicos
 *  2. freematica_list_pkai_historicos_v2  → GET /pkai/v2/historicos
 *  3. freematica_list_pkai_tipos_marcajes → GET /pkai/v1/tiposmarcajes
 *
 * Tools de escritura (requieren enableWrites=true):
 *  4. freematica_create_pkai_marcaje      → POST /pkai/v1/marcajes
 *
 * Descartado: POST /pkai/v2/control/entrada (login KAIROS) — endpoint de
 * autenticación interna; no procede exponerlo como tool MCP.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerPkaiTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_pkai_historicos_v1
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pkai_historicos_v1',
    'Lista paginada de históricos de fichajes KAIROS (v1).\n\nEndpoint: GET /pkai/v1/historicos',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPkaiHistoricosV1({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_list_pkai_historicos_v2
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pkai_historicos_v2',
    'Lista paginada de históricos de fichajes KAIROS (v2).\n\nEndpoint: GET /pkai/v2/historicos',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPkaiHistoricosV2({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_list_pkai_tipos_marcajes
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pkai_tipos_marcajes',
    'Lista paginada de tipos de marcajes KAIROS.\n\nEndpoint: GET /pkai/v1/tiposmarcajes',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPkaiTiposMarcajes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 4. freematica_create_pkai_marcaje
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_pkai_marcaje',
    'Crea un marcaje de fichaje KAIROS.\n\nEndpoint: POST /pkai/v1/marcajes',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del marcaje (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPkaiMarcaje(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
