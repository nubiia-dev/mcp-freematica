import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { error, ok, type RegisterOptions } from '../helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const CREATE_TOOL_NAME = 'freematica_create_movimiento_stock';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const CREATE_DESCRIPTION = [
  'Registra un movimiento de stock (entrada, salida o traspaso) en Freemática.',
  '',
  'Endpoint: POST /part/v2/movimiento-stock',
  '',
  'Campos principales: COD_GRUPO_ART, COD_ALMACEN, COD_ARTICULO, FEC_MOVTO (ISO),',
  'NUM_ORD (número de orden), TIPO_MVTO (tipo de movimiento), CANTIDAD, CANTIDAD_2,',
  'PRECIO_MEDIO_DV1/DV2, PRECIO_MOV_D1/D2, NUM_DOC (número documento), ORIGEN,',
  'DESTINO, IMP_MOVTO_D1/D2, COD_LOTE (serie/lote), COD_UBICACION, PROCEDENCIA,',
  'OBSERVACIONES, CANT_EXIS, ENT_SAL (entrada=1/salida=-1), EDITADO, USUARIO, FUM,',
  'HORA, MOV_EMP, MOV_DELEG, MOV_ID_CONTABILIDAD, MOV_KEYS_ORIGEN, MOV_CTRT, MOV_SERV.',
  'Devuelve el movimiento creado.',
].join('\n');

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del sub-módulo Movimientos de Stock.
 *
 * Tools de escritura (solo si enableWrites=true):
 *  1. freematica_create_movimiento_stock — POST /part/v2/movimiento-stock
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerMovimientosStockTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 1. freematica_create_movimiento_stock (escritura)
  // -------------------------------------------------------------------------
  server.tool(
    CREATE_TOOL_NAME,
    CREATE_DESCRIPTION,
    {
      fields: z
        .record(z.string(), z.unknown())
        .describe(
          'Campos nativos del movimiento de stock (VoMovimientoStock). ' +
            'Requeridos habituales: COD_GRUPO_ART, COD_ALMACEN, COD_ARTICULO, ' +
            'FEC_MOVTO (ISO datetime), TIPO_MVTO, CANTIDAD, ENT_SAL (1=entrada/-1=salida). ' +
            'Opcionales: COD_LOTE, COD_UBICACION, NUM_DOC, ORIGEN, DESTINO, OBSERVACIONES, ' +
            'PRECIO_MEDIO_DV1, PRECIO_MOV_D1, MOV_CTRT, MOV_SERV, etc.',
        ),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ fields }): Promise<CallToolResult> => {
      try {
        const created = await client.createMovimientoStock(fields as Record<string, unknown>);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
