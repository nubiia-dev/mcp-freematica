import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from './clients/freematica-client.js';
import { FREEMATICA_MCP_INSTRUCTIONS } from './server-instructions.js';
import { VERSION } from './version.js';
import { registerAlbaranesTools } from './tools/albaranes.js';
import { registerArticulosTools } from './tools/articulos.js';
import { registerCalendariosTools } from './tools/calendarios.js';
import { registerCarteraTools } from './tools/cartera.js';
import { registerClientesTools } from './tools/clientes.js';
import { registerContactosClientesTools } from './tools/contactos-clientes.js';
import { registerContabilidadTools } from './tools/contabilidad.js';
import { registerContratosTools } from './tools/contratos/index.js';
import { registerFacturasComprasTools } from './tools/facturas-compras.js';
import { registerFacturasElectronicasTools } from './tools/facturas-electronicas.js';
import { registerFacturasVentasTools } from './tools/facturas-ventas.js';
import { registerLocalizacionesTools } from './tools/localizaciones.js';
import { registerMasterDataTools } from './tools/master-data.js';
import { registerOportunidadesNegocioTools } from './tools/oportunidades-negocio.js';
import { registerPedidosComprasTools } from './tools/pedidos-compras.js';
import { registerPersonalTools } from './tools/personal.js';
import { registerPersonalExtTools } from './tools/personal-ext.js';
import { registerPrlTools } from './tools/prl.js';
import { registerProveedoresTools } from './tools/proveedores.js';
import { registerVinculosPersonasServiciosTools } from './tools/vinculos-personas-servicios.js';
import { registerHabilitacionesTools } from './tools/habilitaciones.js';
import { registerCuadrantesTools } from './tools/cuadrantes.js';
import { registerServiciosPvssTools } from './tools/servicios-pvss.js';
import { registerPpreTools } from './tools/ppre/index.js';
import { registerPemfTools } from './tools/pemf/index.js';
import { registerPcrmTools } from './tools/pcrm/index.js';
import { registerPartTools } from './tools/part/index.js';
import { registerPgrlCargosClientesTools } from './tools/pgrl-cargos-clientes.js';
import { registerPgrlCalendariosFestivosTools } from './tools/pgrl-calendarios-festivos.js';
import { registerPgrlCatalogosTools } from './tools/pgrl-catalogos.js';
import { registerPgrlInstaladoresTools } from './tools/pgrl-instaladores.js';
import { registerPgrlCorreoTools } from './tools/pgrl-correo.js';
import { registerPvssEscriturasTools } from './tools/pvss-escrituras.js';
import { registerPvenEscriturasTools } from './tools/pven-escrituras.js';
import { registerPcmpEscriturasTools } from './tools/pcmp-escrituras.js';
import { registerPettTools } from './tools/pett.js';
import { registerPkaiTools } from './tools/pkai.js';
import { registerPedvTools } from './tools/pedv.js';
import { registerPfreeTools } from './tools/pfree.js';
import { registerPdirTools } from './tools/pdir.js';
import { registerPgdocTools } from './tools/pgdoc.js';
import { registerPcuoTools } from './tools/pcuo.js';
import { registerMcomTools } from './tools/mcom.js';
import { registerPpdeTools } from './tools/ppde.js';
import { registerCompTools } from './tools/comp.js';
import { registerPselTools } from './tools/psel.js';
import { registerPtesTools } from './tools/ptes.js';

export interface CreateFreematicaServerOptions {
  client: FreematicaClient;
  /**
   * Registra también las tools de escritura (freematica_create_* /
   * freematica_update_*). Default: false (servidor de solo lectura).
   * Los transports lo alimentan desde FREEMATICA_ENABLE_WRITES.
   */
  enableWrites?: boolean;
}

export function createFreematicaServer(opts: CreateFreematicaServerOptions): McpServer {
  const server = new McpServer(
    { name: 'freematica-mcp', version: VERSION },
    { instructions: FREEMATICA_MCP_INSTRUCTIONS },
  );

  registerContratosTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerMasterDataTools(server, opts.client);
  registerClientesTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerContactosClientesTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerOportunidadesNegocioTools(server, opts.client);
  registerCarteraTools(server, opts.client);
  registerFacturasVentasTools(server, opts.client);
  registerFacturasComprasTools(server, opts.client);
  registerPedidosComprasTools(server, opts.client);
  registerProveedoresTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerLocalizacionesTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerContabilidadTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPrlTools(server, opts.client);
  registerPersonalTools(server, opts.client);
  registerPersonalExtTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerCalendariosTools(server, opts.client);
  registerFacturasElectronicasTools(server, opts.client);
  registerAlbaranesTools(server, opts.client);
  registerArticulosTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerVinculosPersonasServiciosTools(server, opts.client);
  registerHabilitacionesTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerCuadrantesTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerServiciosPvssTools(server, opts.client);
  registerPpreTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPemfTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPcrmTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPartTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPgrlCargosClientesTools(server, opts.client);
  registerPgrlCalendariosFestivosTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPgrlCatalogosTools(server, opts.client);
  registerPgrlInstaladoresTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPgrlCorreoTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPvssEscriturasTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPvenEscriturasTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPcmpEscriturasTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPettTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPkaiTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPedvTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPfreeTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPdirTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPgdocTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPcuoTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerMcomTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPpdeTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerCompTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPselTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });
  registerPtesTools(server, opts.client, { enableWrites: opts.enableWrites ?? false });

  return server;
}
