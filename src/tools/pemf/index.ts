import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import type { RegisterOptions } from '../helpers.js';
import { registerPemfMarcajesTools } from './marcajes.js';
import { registerPemfDispositivosTools } from './dispositivos.js';
import { registerPemfRondasTools } from './rondas.js';
import { registerPemfServiciosTools } from './servicios.js';
import { registerPemfMaterialesTools } from './materiales.js';
import { registerPemfConfigTools } from './config.js';
import { registerPemfOperarioTools } from './operario.js';
import { registerPemfRutasTools } from './rutas.js';

export function registerPemfTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  registerPemfMarcajesTools(server, client, opts);
  registerPemfDispositivosTools(server, client, opts);
  registerPemfRondasTools(server, client, opts);
  registerPemfServiciosTools(server, client);
  registerPemfMaterialesTools(server, client);
  registerPemfConfigTools(server, client, opts);
  registerPemfOperarioTools(server, client);
  registerPemfRutasTools(server, client, opts);
}
