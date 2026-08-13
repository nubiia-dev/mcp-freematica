import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import { error, okList } from '../helpers.js';

export function registerPpreAuxiliaresTools(
  server: McpServer,
  client: FreematicaClient,
): void {
  server.tool(
    'freematica_list_ppre_incidencias_anomalias',
    [
      'Lista paginada de incidencias y anomalías de mantenimiento (v1).',
      '',
      'Endpoint: GET /ppre/v1/incidencias-anomalias',
      '',
      'Incidencias y anomalías registradas en el módulo de Preventivos y Mantenimiento.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreIncidenciasAnomalias({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_ppre_tipo_instalacion',
    [
      'Lista paginada de tipos de instalación (v1).',
      '',
      'Endpoint: GET /ppre/v1/tipo-instalacion',
      '',
      'Catálogo de tipos de instalación disponibles en el sistema.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPpreTipoInstalacion({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
