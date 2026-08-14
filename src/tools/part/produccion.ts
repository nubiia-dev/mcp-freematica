import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { error, ok, type RegisterOptions } from '../helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const CREATE_TOOL_NAME = 'freematica_create_entrada_produccion';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const CREATE_DESCRIPTION = [
  'Registra una entrada de producción (fabricación) en Freemática.',
  '',
  'Endpoint: POST /part/v1/entradas-produccion',
  '',
  'Campos: FEC_MOVTO (fecha del movimiento, ISO datetime), ARTICULO_PA (código',
  'del artículo acabado), ALMACEN_MP (código almacén salida de componentes),',
  'ALMACEN_PA (código almacén entrada de producto acabado), CANTIDAD (cantidad',
  'producida) y COD_LOTE (número de lote, opcional).',
  'Devuelve la entrada de producción creada.',
].join('\n');

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del sub-módulo Producción.
 *
 * Tools de escritura (solo si enableWrites=true):
 *  1. freematica_create_entrada_produccion — POST /part/v1/entradas-produccion
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerProduccionTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 1. freematica_create_entrada_produccion (escritura)
  // -------------------------------------------------------------------------
  server.tool(
    CREATE_TOOL_NAME,
    CREATE_DESCRIPTION,
    {
      fechaMovimiento: z
        .string()
        .describe('Fecha y hora del movimiento de producción en formato ISO 8601 (ej. "2025-12-11T14:03:55.984Z").'),
      articuloPA: z
        .string()
        .min(1)
        .describe('Código del artículo acabado (ARTICULO_PA) que se produce.'),
      almacenMP: z
        .string()
        .min(1)
        .describe('Código del almacén de salida de componentes/materias primas (ALMACEN_MP).'),
      almacenPA: z
        .string()
        .min(1)
        .describe('Código del almacén de entrada del producto acabado (ALMACEN_PA).'),
      cantidad: z
        .number()
        .describe('Cantidad producida (CANTIDAD).'),
      codLote: z
        .string()
        .optional()
        .describe('Número de lote del producto acabado (COD_LOTE). Opcional.'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ fechaMovimiento, articuloPA, almacenMP, almacenPA, cantidad, codLote }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = {
          FEC_MOVTO: fechaMovimiento,
          ARTICULO_PA: articuloPA,
          ALMACEN_MP: almacenMP,
          ALMACEN_PA: almacenPA,
          CANTIDAD: cantidad,
        };
        if (codLote !== undefined) body['COD_LOTE'] = codLote;
        const created = await client.createEntradaProduccion(body);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
