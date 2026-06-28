import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from './clients/freematica-client.js';
import { FREEMATICA_MCP_INSTRUCTIONS } from './server-instructions.js';
import { VERSION } from './version.js';
import { registerAlbaranesTools } from './tools/albaranes.js';
import { registerCalendariosTools } from './tools/calendarios.js';
import { registerCarteraTools } from './tools/cartera.js';
import { registerClientesTools } from './tools/clientes.js';
import { registerContactosClientesTools } from './tools/contactos-clientes.js';
import { registerContabilidadTools } from './tools/contabilidad.js';
import { registerContratosTools } from './tools/contratos.js';
import { registerFacturasComprasTools } from './tools/facturas-compras.js';
import { registerFacturasElectronicasTools } from './tools/facturas-electronicas.js';
import { registerFacturasVentasTools } from './tools/facturas-ventas.js';
import { registerLocalizacionesTools } from './tools/localizaciones.js';
import { registerMasterDataTools } from './tools/master-data.js';
import { registerOportunidadesNegocioTools } from './tools/oportunidades-negocio.js';
import { registerPedidosComprasTools } from './tools/pedidos-compras.js';
import { registerPersonalTools } from './tools/personal.js';
import { registerPrlTools } from './tools/prl.js';
import { registerProveedoresTools } from './tools/proveedores.js';

export interface CreateFreematicaServerOptions {
  client: FreematicaClient;
}

export function createFreematicaServer(opts: CreateFreematicaServerOptions): McpServer {
  const server = new McpServer(
    { name: 'freematica-mcp', version: VERSION },
    { instructions: FREEMATICA_MCP_INSTRUCTIONS },
  );

  registerContratosTools(server, opts.client);
  registerMasterDataTools(server, opts.client);
  registerClientesTools(server, opts.client);
  registerContactosClientesTools(server, opts.client);
  registerOportunidadesNegocioTools(server, opts.client);
  registerCarteraTools(server, opts.client);
  registerFacturasVentasTools(server, opts.client);
  registerFacturasComprasTools(server, opts.client);
  registerPedidosComprasTools(server, opts.client);
  registerProveedoresTools(server, opts.client);
  registerLocalizacionesTools(server, opts.client);
  registerContabilidadTools(server, opts.client);
  registerPrlTools(server, opts.client);
  registerPersonalTools(server, opts.client);
  registerCalendariosTools(server, opts.client);
  registerFacturasElectronicasTools(server, opts.client);
  registerAlbaranesTools(server, opts.client);

  return server;
}
