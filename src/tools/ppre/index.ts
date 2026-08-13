import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import type { RegisterOptions } from '../helpers.js';
import { registerPpreContratosTools } from './contratos.js';
import { registerPpreOrdenesTrabajoTools } from './ordenes-trabajo.js';
import { registerPprePartesTools } from './partes.js';
import { registerPpreActasPartesTools } from './actas-partes.js';
import { registerPpreFichasInstalacionTools } from './fichas-instalacion.js';
import { registerPpreMarcajesTools } from './marcajes.js';
import { registerPpreAuxiliaresTools } from './auxiliares.js';

export function registerPpreTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  registerPpreContratosTools(server, client, opts);
  registerPpreOrdenesTrabajoTools(server, client, opts);
  registerPprePartesTools(server, client);
  registerPpreActasPartesTools(server, client, opts);
  registerPpreFichasInstalacionTools(server, client, opts);
  registerPpreMarcajesTools(server, client, opts);
  registerPpreAuxiliaresTools(server, client);
}
