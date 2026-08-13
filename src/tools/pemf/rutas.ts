import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import {
  UpdatePemfRutaShape,
  buildPemfRutaBody,
  type PemfRutaFields,
} from '../../schemas/pemf.js';
import { error, ok, type RegisterOptions } from '../helpers.js';

export function registerPemfRutasTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  if (!opts.enableWrites) return;

  // ---------------------------------------------------------------------------
  // PUT /pemf/v2/routes/:idReg — actualizar ruta
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_update_pemf_ruta',
    [
      'Actualiza una ruta de campo e-Movifree.',
      '',
      'Endpoint: PUT /pemf/v2/routes/{idReg}',
      '',
      'El parámetro `idReg` debe ser el campo `idReg` de freematica_list_pemf_rutas.',
      'Permite actualizar la asignación de persona, horarios, frecuencia y otros campos de la ruta.',
    ].join('\n'),
    { ...UpdatePemfRutaShape },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...rest }): Promise<CallToolResult> => {
      try {
        const body = buildPemfRutaBody(rest as PemfRutaFields);
        const result = await client.updatePemfRuta(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
