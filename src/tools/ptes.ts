import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { error, ok, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio PTES (tesorería — escrituras).
 *
 * Tools de escritura (requieren enableWrites=true):
 *  1. freematica_create_ptes_importar_fichero_n43 → POST /ptes/v1/importar-fichero-n43
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerPtesTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 1. freematica_create_ptes_importar_fichero_n43
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_ptes_importar_fichero_n43',
    'Importa un fichero N43 de tesorería.\n\nEndpoint: POST /ptes/v1/importar-fichero-n43\n\nCampos requeridos: banco (código de banco), fileName (nombre del fichero .n43), fileBase64 (contenido del fichero codificado en Base64).',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del fichero N43 a importar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPtesImportarFicheroN43(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
