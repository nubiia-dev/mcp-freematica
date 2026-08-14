import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { error, ok, type RegisterOptions } from '../helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const CREATE_TOOL_NAME = 'freematica_create_albaran_traspaso';
const TRASPASO_TOOL_NAME = 'freematica_traspaso_albaran';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const CREATE_DESCRIPTION = [
  'Crea un albarán de traspaso (movimiento entre almacenes) en Freemática.',
  '',
  'Endpoint: POST /part/v2/albaranes-traspaso',
  '',
  'El body se compone de un objeto cabecera (`VoTraspasoAlbaranCab`) y un array',
  'de líneas (`lineas`). Ambos se pasan como estructuras libres (claves nativas)',
  'ya que Postman no documenta los campos individuales.',
  'Devuelve el albarán de traspaso creado.',
].join('\n');

const TRASPASO_DESCRIPTION = [
  'Ejecuta el traspaso de un albarán de traspaso ya creado en Freemática.',
  '',
  'Endpoint: PUT /part/v2/control/albaran-traspaso/{idReg}',
  '',
  'Esta es una operación de acción (traspaso efectivo del albarán).',
  'Solo requiere el `idReg` opaco del albarán de traspaso a ejecutar.',
  'El cuerpo de la petición es vacío según la especificación del API.',
].join('\n');

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del sub-módulo Albaranes de Traspaso.
 *
 * Tools de escritura (solo si enableWrites=true):
 *  1. freematica_create_albaran_traspaso — POST /part/v2/albaranes-traspaso
 *  2. freematica_traspaso_albaran        — PUT /part/v2/control/albaran-traspaso/{idReg}
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerAlbaranesTraspasoTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 1. freematica_create_albaran_traspaso (escritura)
  // -------------------------------------------------------------------------
  server.tool(
    CREATE_TOOL_NAME,
    CREATE_DESCRIPTION,
    {
      cab: z
        .record(z.string(), z.unknown())
        .describe(
          'Cabecera del albarán de traspaso (VoTraspasoAlbaranCab). ' +
            'Pasar como objeto con los campos nativos del endpoint.',
        ),
      lineas: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Array de líneas del albarán de traspaso. Cada elemento es un objeto con ' +
            'los campos nativos de la línea (artículo, cantidad, almacén origen/destino, etc.).',
        ),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ cab, lineas }): Promise<CallToolResult> => {
      try {
        const body = { VoTraspasoAlbaranCab: cab, lineas };
        const created = await client.createAlbaranTraspaso(body);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_traspaso_albaran (escritura — acción)
  // -------------------------------------------------------------------------
  server.tool(
    TRASPASO_TOOL_NAME,
    TRASPASO_DESCRIPTION,
    {
      idReg: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del albarán de traspaso a ejecutar (obtenido de freematica_create_albaran_traspaso).',
        ),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.traspasoAlbaran(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
