import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import {
  ListFacturasCabeceraFiltersSchema,
  ListFacturaLineasFiltersSchema,
  ListFacturaIvaFiltersSchema,
  ListFacturaVencimientosFiltersSchema,
} from '../schemas/facturas-ventas.js';
import { error, ok, okList } from './helpers.js';

const LIST_CABECERA_TOOL = 'freematica_list_facturas_cabecera';
const GET_CABECERA_TOOL = 'freematica_get_factura_cabecera';
const LIST_LINEAS_TOOL = 'freematica_list_factura_lineas';
const LIST_IVA_TOOL = 'freematica_list_factura_iva';
const LIST_VENCIMIENTOS_TOOL = 'freematica_list_factura_vencimientos';

const LIST_CABECERA_DESCRIPTION = [
  'Devuelve la lista paginada de cabeceras de facturas de ventas.',
  '',
  'Cada item contiene ~50 campos: FVC_NUMFAC (número factura), FVC_SERFAC (serie), FVC_CODAUX (cliente),',
  'FVC_FECFAC (fecha factura), FVC_BASEIMPONIBLE (base), FVC_TOTFAC (total factura),',
  'FVC_TRSCONT (traspasado a contabilidad), FVC_DELEG (delegación), más `idReg` opaco para el endpoint singular.',
  '',
  'Filtros disponibles:',
  '- empresa, codCliente, representante',
  '- fechaFacturaDesde/Hasta (rango de fecha factura)',
  '- serie, numFactura (número exacto)',
  '- formaPago, delegacion',
  '- traspasadoContabilidad: true → solo facturas ya traspasadas a contabilidad',
  '',
  'Paginación 1-indexed. Default: page=1, items=20.',
].join('\n');

const GET_CABECERA_DESCRIPTION = [
  'Devuelve el detalle completo de una factura de ventas (cabecera).',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en los items de',
  'freematica_list_facturas_cabecera. NO usar FVC_NUMFAC ni FVC_SERFAC.',
].join('\n');

const LIST_LINEAS_DESCRIPTION = [
  'Devuelve las líneas de detalle de una factura de ventas.',
  '',
  'Requiere el `idFactura` (idReg opaco) de la factura cabecera.',
  '',
  'Cada línea contiene: FVL_CODART (artículo), FVL_DESART (descripción), FVL_CANTFAC (cantidad),',
  'FVL_PRECIOVENTA (precio), FVL_PORDTO (% descuento), FVL_IMPORTE (importe línea), FVL_CODFAM, FVL_CODSFAM.',
  '',
  'Filtros disponibles: codArticulo, codFamilia, codSubfamilia, delegacion.',
].join('\n');

const LIST_IVA_DESCRIPTION = [
  'Devuelve las líneas de IVA de una factura de ventas.',
  '',
  'Requiere el `idFactura` (idReg opaco) de la factura cabecera.',
  '',
  'Cada línea contiene: FVI_TIPIVA (tipo IVA), FVI_PORCENTAJE (%), FVI_BASE (base imponible),',
  'FVI_CUOTA (cuota IVA), FVI_TOTAL (total con IVA).',
  '',
  'Filtro disponible: tipoIva (FVI_TIPIVA exacto, ej. "21", "10", "4").',
].join('\n');

const LIST_VENCIMIENTOS_DESCRIPTION = [
  'Devuelve los vencimientos de cobro de una factura de ventas.',
  '',
  'Requiere el `idFactura` (idReg opaco) de la factura cabecera.',
  '',
  'Cada vencimiento contiene: FVV_FECVCTO (fecha vencimiento), FVV_IMPORTE (importe a cobrar),',
  'FVV_CODMPAG (modo de pago), FVV_ESTADO (estado del vencimiento).',
  '',
  'Filtros disponibles: fechaVencimientoDesde/Hasta, modoPago.',
].join('\n');

/** Schema del idFactura (path param compartido por lineas, iva y vencimientos). */
const IdFacturaSchema = {
  idFactura: z
    .string()
    .min(1)
    .describe(
      'idReg opaco de la factura cabecera (campo "idReg" en los items de freematica_list_facturas_cabecera).',
    ),
};

/** Schema del id para get singular de cabecera. */
const IdCabeceraSchema = {
  id: z
    .string()
    .min(1)
    .describe(
      'idReg opaco de la factura (campo "idReg" en los items de freematica_list_facturas_cabecera).',
    ),
};

/**
 * Registra las tools MCP del dominio "Facturas de Ventas".
 *
 * Expone 5 tools:
 * - `freematica_list_facturas_cabecera`: listado paginado de cabeceras con filtros FIQL
 * - `freematica_get_factura_cabecera`: detalle de una factura por idReg
 * - `freematica_list_factura_lineas`: líneas de una factura (path param: idFactura)
 * - `freematica_list_factura_iva`: líneas de IVA de una factura (path param: idFactura)
 * - `freematica_list_factura_vencimientos`: vencimientos de una factura (path param: idFactura)
 *
 * @param server - Instancia MCP donde se registran las tools.
 * @param client - Cliente tipado de Freemática.
 */
export function registerFacturasVentasTools(server: McpServer, client: FreematicaClient): void {
  // ---------------------------------------------------------------------------
  // List facturas cabecera
  // ---------------------------------------------------------------------------
  server.tool(
    LIST_CABECERA_TOOL,
    LIST_CABECERA_DESCRIPTION,
    ListFacturasCabeceraFiltersSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const result = await client.listFacturasCabecera(args);
        return okList({
          items: result.items,
          total: result.total,
          page: args.page,
          itemsPerPage: args.items,
        }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Get factura cabecera
  // ---------------------------------------------------------------------------
  server.tool(
    GET_CABECERA_TOOL,
    GET_CABECERA_DESCRIPTION,
    IdCabeceraSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const factura = await client.getFacturaCabecera(id);
        return ok(factura) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // List factura lineas
  // ---------------------------------------------------------------------------
  server.tool(
    LIST_LINEAS_TOOL,
    LIST_LINEAS_DESCRIPTION,
    { ...IdFacturaSchema, ...ListFacturaLineasFiltersSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idFactura, ...filters }): Promise<CallToolResult> => {
      try {
        const result = await client.listFacturaLineas(idFactura, filters);
        return okList({
          items: result.items,
          total: result.total,
          page: filters.page,
          itemsPerPage: filters.items,
        }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // List factura iva
  // ---------------------------------------------------------------------------
  server.tool(
    LIST_IVA_TOOL,
    LIST_IVA_DESCRIPTION,
    { ...IdFacturaSchema, ...ListFacturaIvaFiltersSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idFactura, ...filters }): Promise<CallToolResult> => {
      try {
        const result = await client.listFacturaIva(idFactura, filters);
        return okList({
          items: result.items,
          total: result.total,
          page: filters.page,
          itemsPerPage: filters.items,
        }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // List factura vencimientos
  // ---------------------------------------------------------------------------
  server.tool(
    LIST_VENCIMIENTOS_TOOL,
    LIST_VENCIMIENTOS_DESCRIPTION,
    { ...IdFacturaSchema, ...ListFacturaVencimientosFiltersSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idFactura, ...filters }): Promise<CallToolResult> => {
      try {
        const result = await client.listFacturaVencimientos(idFactura, filters);
        return okList({
          items: result.items,
          total: result.total,
          page: filters.page,
          itemsPerPage: filters.items,
        }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
