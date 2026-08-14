import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { error, ok, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio COMP (compras — escrituras).
 *
 * Tools de escritura (requieren enableWrites=true):
 *  1. freematica_create_comp_albaran_compra          → POST /comp/v2/albaranes-compras
 *  2. freematica_create_comp_registro_gastos_contrato → POST /comp/v2/registro-gastos-contratos
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerCompTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 1. freematica_create_comp_albaran_compra
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_comp_albaran_compra',
    'Crea un albarán de compra.\n\nEndpoint: POST /comp/v2/albaranes-compras',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del albarán de compra (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createCompAlbaranCompra(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_create_comp_registro_gastos_contrato
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_comp_registro_gastos_contrato',
    'Registra gastos de contrato en compras.\n\nEndpoint: POST /comp/v2/registro-gastos-contratos\n\nCampos conocidos del body: Proveedor (idReg del proveedor), LocalizacionPago (idReg de la localización de pago), FichaGastosContrato (objeto con datos de la ficha de gastos del contrato), FacturaGastosContrato (objeto con datos de la factura de gastos).',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del registro de gastos de contrato (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createCompRegistroGastosContrato(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
