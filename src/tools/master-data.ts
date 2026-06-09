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
  // Tipos / clasificaciones
  'tipos-contrato (tipos de contrato comercial)',
  'tipo-instalacion (tipos de instalación física)',
  'clases-servicios (clases de servicio operativas)',
  'tipos-casos (CRM)',
  'subtipos-casos (CRM)',
  'tipos-oportunidad-negocio (CRM)',
  'tipos-impuestos (IVA, IRPF, retenciones)',
  'naturalezas-abono',
  'incidencecode (códigos de incidencia en servicios)',
  'claves-facturacion (claves de facturación de servicios)',
  // Geográficos
  'paises',
  'nacionalidades',
  'provincias',
  'poblaciones (municipios — dataset grande, paginar con cuidado)',
  // Organizativos
  'empresas',
  'delegaciones (agrupadas por código — listado global)',
  'lineas-negocio',
  'cargos-clientes (puestos de contactos)',
  'calendarios (calendarios laborales)',
  'series (series de numeración de documentos)',
  // Inventario
  'familias (de artículos)',
  'subfamilias',
  'lineas (líneas de artículos)',
  // Financiero
  'bancos (entidades bancarias)',
].join(', ');

const TOOL_DESCRIPTION = [
  'Devuelve un catálogo de datos maestros de Freemática (tipos, geográficos, organizativos, inventario, financiero).',
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
 * Una sola tool expone los 24 catálogos vía un enum `catalog`. Añadir nuevos
 * catálogos requiere actualizar `src/schemas/master-data.ts` (enum + record),
 * no este archivo. Ver instrucciones en el JSDoc de MASTER_DATA_CATALOGS.
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
        const { items, total } = await client.getMasterData(catalog);
        return ok({ catalog, items, count: items.length, total }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
