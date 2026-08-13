import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import type { RegisterOptions } from '../helpers.js';
import { registerPcrmActividadesTools } from './actividades.js';
import { registerPcrmCasosTools } from './casos.js';
import { registerPcrmDocumentosTools } from './documentos.js';
import { registerPcrmNotasTools } from './notas.js';
import { registerPcrmOportunidadesExtTools } from './oportunidades-ext.js';

/**
 * Registra todas las tools MCP del módulo CRM (pcrm).
 *
 * Organizado en sub-módulos:
 *  - Actividades (citas/tareas): lista, detalle, alta, actualización.
 *  - Casos (tickets CRM): lista, detalle, tipos, subtipos, alta, actualización.
 *  - Documentos de portal: lista v1/v2, detalle v1/v2, actualización v1/v2.
 *  - Notas: lista, detalle, alta.
 *  - Oportunidades extendido: detalle v1, tipos, escrituras (create/update v1/v2, datos-ampliados).
 *
 * Las tools de lectura de oportunidades base (list, get, datos_ampliados) ya
 * están registradas en oportunidades-negocio.ts y NO se duplican aquí.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerPcrmTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  registerPcrmActividadesTools(server, client, opts);
  registerPcrmCasosTools(server, client, opts);
  registerPcrmDocumentosTools(server, client, opts);
  registerPcrmNotasTools(server, client, opts);
  registerPcrmOportunidadesExtTools(server, client, opts);
}
