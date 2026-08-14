import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import type { RegisterOptions } from '../helpers.js';
import { registerArticulosLoteTools } from './articulos-lote.js';
import { registerExistenciasTools } from './existencias.js';
import { registerStocksTools } from './stocks.js';
import { registerMovimientosStockTools } from './movimientos-stock.js';
import { registerProduccionTools } from './produccion.js';
import { registerAlbaranesTraspasoTools } from './albaranes-traspaso.js';
import { registerTablasAuxiliaresTools } from './tablas-auxiliares.js';

/**
 * Registra todas las tools MCP del módulo Inventario/Artículos (part).
 *
 * Organizado en sub-módulos:
 *  - Artículos Serie/Lote: lista, detalle y alta.
 *  - Existencias: stocks por serie/lote (lista, detalle).
 *  - Stocks: existencias por artículo/almacén (lista, detalle).
 *  - Movimientos de stock: alta de movimiento.
 *  - Producción: entrada de producción (alta).
 *  - Albaranes de traspaso: alta y ejecución de traspaso.
 *  - Tablas auxiliares: familias, líneas y subfamilias (lista + detalle).
 *
 * Las tools de artículos base (list, get, precio, costes y escritura) están
 * en `src/tools/articulos.ts` y NO se duplican aquí.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerPartTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  registerArticulosLoteTools(server, client, opts);
  registerExistenciasTools(server, client);
  registerStocksTools(server, client);
  registerMovimientosStockTools(server, client, opts);
  registerProduccionTools(server, client, opts);
  registerAlbaranesTraspasoTools(server, client, opts);
  registerTablasAuxiliaresTools(server, client);
}
