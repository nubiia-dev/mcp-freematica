import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { error, ok, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio PSEL (selección — escrituras).
 *
 * Tools de escritura (requieren enableWrites=true):
 *  1. freematica_create_psel_candidato → POST /psel/v2/control/candidatos
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerPselTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 1. freematica_create_psel_candidato
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_psel_candidato',
    'Crea un candidato en el proceso de selección.\n\nEndpoint: POST /psel/v2/control/candidatos',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del candidato (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPselCandidato(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
