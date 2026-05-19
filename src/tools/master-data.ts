import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import {
  MASTER_DATA_CATALOGS,
  MasterDataCatalogSchema,
} from '../schemas/master-data.js';
import { error, ok } from './helpers.js';

const TOOL_NAME = 'freematica_get_master_data';

const CATALOG_DESCRIPTIONS = [
  'tipos-contrato (tipos de contrato comercial)',
  'tipo-instalacion (tipos de instalación física)',
  'clases-servicios (clases de servicio operativas)',
  'tipos-casos (CRM)',
  'subtipos-casos (CRM)',
  'tipos-oportunidad-negocio (CRM)',
  'tipos-impuestos (IVA, IRPF, retenciones)',
  'tipos-marcajes (presencia / jornada)',
  'naturalezas-abono',
  'paises',
  'nacionalidades',
  'provincias',
  'poblaciones (municipios)',
  'empresas',
  'delegaciones',
  'lineas-negocio',
  'cargos-clientes (puestos de contactos)',
  'familias (de artículos)',
  'subfamilias',
].join(', ');

const TOOL_DESCRIPTION = [
  'Devuelve un catálogo de datos maestros de Freemática (tipos, geográficos, organizativos, inventario).',
  '',
  `Catálogos disponibles (${MASTER_DATA_CATALOGS.length}): ${CATALOG_DESCRIPTIONS}.`,
  '',
  'Útil para traducir códigos crípticos en respuestas de otras tools (por ejemplo, los IDs de tipo de contrato o clase de servicio que aparecen en freematica_list_materiales_asignados_servicios).',
  '',
  'La respuesta es un objeto con tres campos:',
  '  - catalog: el catálogo solicitado (echo del input)',
  '  - items: array de objetos con los registros del catálogo',
  '  - count: número total de elementos',
].join('\n');

/**
 * Registra la tool freematica_get_master_data sobre el McpServer.
 *
 * Una sola tool expone los 19 catálogos vía un enum `catalog`. Añadir nuevos
 * catálogos requiere actualizar `src/schemas/master-data.ts` (enum + record),
 * no este archivo.
 */
export function registerMasterDataTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    TOOL_NAME,
    TOOL_DESCRIPTION,
    {
      catalog: MasterDataCatalogSchema.describe(
        `Catálogo a consultar. Valores válidos: ${CATALOG_DESCRIPTIONS}.`,
      ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ catalog }): Promise<CallToolResult> => {
      try {
        const items = await client.getMasterData(catalog);
        return ok({ catalog, items, count: items.length }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
