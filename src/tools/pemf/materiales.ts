import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { error, okList } from '../helpers.js';

export function registerPemfMaterialesTools(
  server: McpServer,
  client: FreematicaClient,
): void {
  // ---------------------------------------------------------------------------
  // GET /pemf/v2/services/:idReg/materiales-consumibles
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_materiales_consumibles',
    [
      'Lista de materiales consumibles de un servicio de campo e-Movifree.',
      '',
      'Endpoint: GET /pemf/v2/services/{idReg}/materiales-consumibles',
      '',
      'Materiales de uso común (consumibles) asignados a un servicio específico.',
      'El parámetro `idReg` debe ser el campo `idReg` de freematica_list_pemf_services.',
    ].join('\n'),
    { idReg: z.string().min(1).describe('idReg del servicio (campo idReg de freematica_list_pemf_services).') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfMaterialesConsumibles(idReg);
        return okList({ items: result.items, total: result.total }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v2/services/:idReg/materiales-imputados
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_materiales_imputados',
    [
      'Lista de materiales imputados (FTO) de un servicio de campo e-Movifree.',
      '',
      'Endpoint: GET /pemf/v2/services/{idReg}/materiales-imputados',
      '',
      'Materiales registrados como parte de un proceso de Field Task Order (FTO) en el servicio.',
      'El parámetro `idReg` debe ser el campo `idReg` de freematica_list_pemf_services.',
    ].join('\n'),
    { idReg: z.string().min(1).describe('idReg del servicio (campo idReg de freematica_list_pemf_services).') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfMaterialesImputados(idReg);
        return okList({ items: result.items, total: result.total }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
