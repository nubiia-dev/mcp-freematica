import { BaseClient } from './base-client.js';
import type { VoContratosServMatAsignado } from '../types/contratos.js';
import { CATALOG_ENDPOINTS, type MasterDataCatalog } from '../schemas/master-data.js';
import type { MasterDataItem } from '../types/master-data.js';

/**
 * Typed client for the Freemática REST API.
 *
 * One method per exposed endpoint (or per family of endpoints). Add a new
 * method when a new Postman operation gets wrapped into an MCP tool.
 */
export class FreematicaClient extends BaseClient {
  /**
   * Obtener lista de material asignado a servicios.
   *
   * Postman: pvss → Contratos → "Obtener lista de material asignado a servicios"
   * Endpoint: GET /pvss/v2/contratos-servicios-material
   * Internal method: MCT_TABLA_GESTION
   */
  getMaterialesAsignadosServicios(): Promise<VoContratosServMatAsignado[]> {
    return this.get<VoContratosServMatAsignado[]>('/pvss/v2/contratos-servicios-material');
  }

  /**
   * Obtener un catálogo de datos maestros.
   *
   * Resuelve el endpoint via `CATALOG_ENDPOINTS[catalog]`. Para añadir un
   * catálogo nuevo basta con extender el enum y el record en
   * `src/schemas/master-data.ts`.
   */
  getMasterData(catalog: MasterDataCatalog): Promise<MasterDataItem[]> {
    const endpoint = CATALOG_ENDPOINTS[catalog];
    return this.get<MasterDataItem[]>(endpoint);
  }
}
