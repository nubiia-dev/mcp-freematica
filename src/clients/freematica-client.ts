import { BaseClient } from './base-client.js';
import type { VoContratosServMatAsignado } from '../types/contratos.js';

/**
 * Typed client for the Freemática REST API.
 *
 * One method per exposed endpoint. Add a new method when a new Postman
 * operation gets wrapped into an MCP tool.
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
}
