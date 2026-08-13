import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { error, ok } from '../helpers.js';

export function registerPemfOperarioTools(
  server: McpServer,
  client: FreematicaClient,
): void {
  // ---------------------------------------------------------------------------
  // GET /pemf/v1/users — datos del operario
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_get_pemf_operario',
    [
      'Obtiene los datos del operario autenticado en e-Movifree.',
      '',
      'Endpoint: GET /pemf/v1/users',
      '',
      'Devuelve el perfil del operario de campo activo (nombre, empresa, delegación,',
      'servicios asignados, permisos en la app, etc.).',
    ].join('\n'),
    {},
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (): Promise<CallToolResult> => {
      try {
        const result = await client.getPemfOperario();
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/descubiertos — descubiertos
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_descubiertos',
    [
      'Obtiene los descubiertos de e-Movifree.',
      '',
      'Endpoint: GET /pemf/v1/descubiertos',
      '',
      'Descubiertos: ausencias o incumplimientos de servicio detectados por el sistema e-Movifree.',
    ].join('\n'),
    {},
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfDescubiertos();
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
