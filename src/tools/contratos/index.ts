import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { logger } from '../../logger.js';
import { registerCabeceraTools, type RegisterOptions } from './cabecera.js';
import { registerMaterialesTools } from './materiales.js';
import { registerOpcionalesTools } from './opcionales.js';
import { registerServiciosTools } from './servicios.js';

/**
 * Registra las tools MCP del grupo "Contratos y Servicios" (módulos pvss y ppre).
 *
 * Lectura (siempre registradas):
 *   - freematica_list_contratos / freematica_get_contrato
 *   - freematica_list_servicios_contrato / freematica_get_servicio_contrato
 *   - freematica_list_contratos_opcionales / freematica_get_contrato_opcionales
 *   - freematica_list_materiales_asignados_servicios
 *
 * Escritura (solo si FREEMATICA_ENABLE_WRITES=true; nunca hay delete):
 *   - freematica_create_contrato / freematica_update_contrato
 *   - freematica_create_servicio_contrato / freematica_update_servicio_fechas
 *   - freematica_create_servicio_historico_precios / freematica_update_servicio_historico_precios
 *   - freematica_create_servicio_facturacion_txt / freematica_update_servicio_facturacion
 *   - freematica_create_contrato_opcionales / freematica_update_contrato_opcionales
 */
export function registerContratosTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  registerMaterialesTools(server, client);
  registerCabeceraTools(server, client, opts);
  registerServiciosTools(server, client, opts);
  registerOpcionalesTools(server, client, opts);

  if (opts.enableWrites) {
    logger.warn(
      'FREEMATICA_ENABLE_WRITES=true: tools de escritura de contratos registradas (create/update, sin delete)',
    );
  }
}

export type { RegisterOptions } from './cabecera.js';
