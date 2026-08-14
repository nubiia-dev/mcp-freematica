import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio PCUO (beneficiarios y partes).
 *
 * Tools de lectura (siempre activas):
 *  1. freematica_list_pcuo_beneficiarios  → GET /pcuo/v2/beneficiarios
 *  2. freematica_get_pcuo_beneficiario    → GET /pcuo/v2/beneficiarios/:idReg
 *  3. freematica_list_pcuo_partes         → GET /pcuo/v2/partes
 *  4. freematica_get_pcuo_parte           → GET /pcuo/v2/partes/:idReg
 *
 * Tools de escritura (requieren enableWrites=true):
 *  5. freematica_create_pcuo_beneficiario → POST /pcuo/v2/beneficiarios
 *  6. freematica_update_pcuo_beneficiario → PUT  /pcuo/v2/beneficiarios/:idReg
 *  7. freematica_create_pcuo_parte        → POST /pcuo/v2/partes
 *  8. freematica_update_pcuo_parte        → PUT  /pcuo/v2/partes/:idReg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerPcuoTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_pcuo_beneficiarios
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pcuo_beneficiarios',
    'Lista paginada de beneficiarios.\n\nEndpoint: GET /pcuo/v2/beneficiarios',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPcuoBeneficiarios({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_get_pcuo_beneficiario
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pcuo_beneficiario',
    'Detalle de un beneficiario.\n\nEndpoint: GET /pcuo/v2/beneficiarios/:idReg',
    { idReg: z.string().min(1).describe('idReg opaco del beneficiario.') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getPcuoBeneficiario(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_list_pcuo_partes
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pcuo_partes',
    'Lista paginada de partes de beneficiarios.\n\nEndpoint: GET /pcuo/v2/partes',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPcuoPartes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_get_pcuo_parte
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pcuo_parte',
    'Detalle de un parte de beneficiario.\n\nEndpoint: GET /pcuo/v2/partes/:idReg',
    { idReg: z.string().min(1).describe('idReg opaco del parte.') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getPcuoParte(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 5. freematica_create_pcuo_beneficiario
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_pcuo_beneficiario',
    'Crea un beneficiario.\n\nEndpoint: POST /pcuo/v2/beneficiarios',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del beneficiario (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPcuoBeneficiario(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 6. freematica_update_pcuo_beneficiario
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pcuo_beneficiario',
    'Actualiza un beneficiario.\n\nEndpoint: PUT /pcuo/v2/beneficiarios/:idReg',
    {
      idReg: z.string().min(1).describe('idReg opaco del beneficiario.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos a actualizar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const changes: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const current = await client.getPcuoBeneficiario(idReg);
        const body = { ...current, ...changes };
        const result = await client.updatePcuoBeneficiario(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 7. freematica_create_pcuo_parte
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_pcuo_parte',
    'Crea un parte de beneficiario.\n\nEndpoint: POST /pcuo/v2/partes',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del parte (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPcuoParte(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 8. freematica_update_pcuo_parte
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pcuo_parte',
    'Actualiza un parte de beneficiario.\n\nEndpoint: PUT /pcuo/v2/partes/:idReg',
    {
      idReg: z.string().min(1).describe('idReg opaco del parte.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos a actualizar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const changes: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const current = await client.getPcuoParte(idReg);
        const body = { ...current, ...changes };
        const result = await client.updatePcuoParte(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
