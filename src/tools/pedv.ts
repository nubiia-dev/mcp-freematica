import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio PEDV (pedidos venta portal).
 *
 * Tools de lectura (siempre activas):
 *  1. freematica_list_pedv_pedidos        → GET /pedv/v1/pedidos
 *  2. freematica_list_pedv_pedidos_lineas → GET /pedv/v1/pedidos-lineas
 *
 * Tools de escritura (requieren enableWrites=true):
 *  3. freematica_create_pedv_pedido_servir   → POST /pedv/v1/pedidos/:idreg/servir
 *  4. freematica_update_pedv_servir_pedido_v2 → PUT /pedv/v2/control/servir-pedidos/:idReg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerPedvTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_pedv_pedidos
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pedv_pedidos',
    'Lista paginada de pedidos de venta del portal.\n\nEndpoint: GET /pedv/v1/pedidos',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPedvPedidos({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_list_pedv_pedidos_lineas
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pedv_pedidos_lineas',
    'Lista paginada de líneas de pedidos de venta del portal.\n\nEndpoint: GET /pedv/v1/pedidos-lineas',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPedvPedidosLineas({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 3. freematica_create_pedv_pedido_servir
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_pedv_pedido_servir',
    'Sirve un pedido de venta del portal.\n\nEndpoint: POST /pedv/v1/pedidos/:idreg/servir',
    {
      idReg: z.string().min(1).describe('idReg opaco del pedido.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos adicionales para el proceso de servir (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPedvPedidoServir(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_update_pedv_servir_pedido_v2
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pedv_servir_pedido_v2',
    'Actualiza el proceso de servir un pedido de venta (v2).\n\nEndpoint: PUT /pedv/v2/control/servir-pedidos/:idReg',
    {
      idReg: z.string().min(1).describe('idReg opaco del pedido.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos a actualizar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePedvServirPedidoV2(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
