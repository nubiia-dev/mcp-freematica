import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { error, okList } from './helpers.js';

const LIST_MATERIALES_TOOL_NAME = 'freematica_list_materiales_asignados_servicios';

const LIST_MATERIALES_TOOL_DESCRIPTION = [
  'Devuelve la lista completa de material asignado a servicios.',
  '',
  'Endpoint: GET /pvss/v2/contratos-servicios-material (Freemática API).',
  'Tipo de respuesta: VoContratosServMatAsignado[].',
  '',
  'Esta operación no acepta parámetros: siempre devuelve la lista entera para',
  'la organización autenticada. La respuesta es un objeto con dos campos:',
  '  - items: array de objetos VoContratosServMatAsignado',
  '  - count: número total de elementos',
].join('\n');

/**
 * Registers every MCP tool that maps to operations in the "Contratos" API group
 * (Postman: app `pvss` → group `Contratos`).
 *
 * Add new tools here by calling `server.tool(...)` again. When this file grows
 * past ~15 tools, split it into `src/tools/contratos/<entity>.ts`.
 */
export function registerContratosTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    LIST_MATERIALES_TOOL_NAME,
    LIST_MATERIALES_TOOL_DESCRIPTION,
    {},
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (): Promise<CallToolResult> => {
      try {
        const { items, total } = await client.getMaterialesAsignadosServicios();
        return okList({ items, total }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
