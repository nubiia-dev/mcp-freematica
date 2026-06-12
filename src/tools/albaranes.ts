import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { ListAlbaranesVentasFiltersSchema } from '../schemas/albaranes.js';
import { ListAlbaranesFacturaFiltersSchema } from '../schemas/albaranes.js';
import { ListResultadosFacturacionFiltersSchema } from '../schemas/albaranes.js';
import { error, ok, okList } from './helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const LIST_ALBARANES_VENTAS_TOOL = 'freematica_list_albaranes_ventas';
const GET_ALBARAN_VENTA_TOOL = 'freematica_get_albaran_venta';
const LIST_ALBARANES_FACTURA_TOOL = 'freematica_list_albaranes_factura';
const GET_ALBARAN_FACTURA_TOOL = 'freematica_get_albaran_factura';
const LIST_RESULTADOS_FACTURACION_TOOL = 'freematica_list_resultados_facturacion';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const LIST_ALBARANES_VENTAS_DESCRIPTION = [
  'Devuelve la lista paginada de albaranes de ventas de Freemática.',
  '',
  'Cada item contiene campos con prefijo ALVC_* (cabecera) y ALVL_* (líneas).',
  'Campos destacados: ALVC_CODEMP (empresa), ALVC_DELEG (delegación),',
  'ALVC_CODCLI (cliente), ALVC_CODDOC (código documento), ALVC_NUMDOC (número),',
  'ALVC_FCHDOC (fecha), ALVC_SERIEFRA (serie factura), ALVC_IND_NOFAC (no facturar),',
  'ALVC_FPAGO (forma pago), más `idReg` opaco para el endpoint singular.',
  '',
  'Los filtros principales (empresa, delegacion, codCliente, codDocumento, fechaDesde,',
  'fechaHasta) se envían como query params NATIVOS del endpoint (no FIQL).',
  'El campo `empresa` es requerido por el endpoint de Freemática.',
  '',
  'Paginación 1-indexed.',
].join('\n');

const GET_ALBARAN_VENTA_DESCRIPTION = [
  'Devuelve el detalle completo de un albarán de venta.',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en',
  'los items de freematica_list_albaranes_ventas. NO usar ALVC_NUMDOC ni otro código natural.',
].join('\n');

const LIST_ALBARANES_FACTURA_DESCRIPTION = [
  'Devuelve la lista paginada de vinculaciones albarán↔factura de Freemática.',
  '',
  'Cada item contiene campos con prefijo FVCA_*: FVCA_CODEMP (empresa),',
  'FVCA_SERIEFRA (serie factura), FVCA_NUMFRA (número factura), FVCA_CODCLI (cliente),',
  'FVCA_NUMALB (número albarán), FVCA_FCHALB (fecha albarán), FVCA_FCHFAC (fecha factura),',
  'FVCA_NUMPED (número pedido), FVCA_CODDOC (código documento), más `idReg` opaco.',
  '',
  'El filtro `idReg` es un query param nativo. Los filtros empresa, serie, numFactura',
  'y codCliente se envían como FIQL en el parámetro rQuery.',
  '',
  'Casos de uso principales:',
  '  - Buscar qué facturas incluyen un albarán determinado (filtrar por FVCA_NUMALB vía rQuery)',
  '  - Listar todos los albaranes vinculados a una factura (filtrar por numFactura + serie)',
  '',
  'Paginación 1-indexed.',
].join('\n');

const GET_ALBARAN_FACTURA_DESCRIPTION = [
  'Devuelve el detalle completo de un registro de vinculación albarán↔factura.',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en',
  'los items de freematica_list_albaranes_factura. NO usar FVCA_NUMFRA ni otro código natural.',
].join('\n');

const LIST_RESULTADOS_FACTURACION_DESCRIPTION = [
  'Devuelve los resultados del proceso batch de facturación automática de vigilancia.',
  '',
  'Cada item contiene campos con prefijo FACT_*: FACT_EMP (empresa), FACT_DELEG (delegación),',
  'FACT_CAL (año calendario), FACT_MES (mes), FACT_CTRT (contrato), FACT_SERV (servicio),',
  'FACT_TIPFAC (tipo facturación), FACT_COD_CLI (cliente), FACT_TRASP (estado traspaso),',
  'FACT_NUMDOC (documento generado), FACT_IMP_BASE (importe base), FACT_IMPF (importe final),',
  'y múltiples campos de horas (FACT_HHD, FACT_HHF, FACT_HHG, FACT_HHN, etc.).',
  '',
  'Todos los filtros se envían como FIQL en el parámetro rquery.',
  '',
  'Paginación 1-indexed. El param `order` es nativo del endpoint.',
].join('\n');

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools de albaranes en el servidor MCP.
 *
 * Tools registradas:
 * - `freematica_list_albaranes_ventas`: lista paginada de albaranes de ventas.
 * - `freematica_get_albaran_venta`: detalle de un albarán de venta por idReg.
 * - `freematica_list_albaranes_factura`: lista de vinculaciones albarán↔factura.
 * - `freematica_get_albaran_factura`: detalle de una vinculación por idReg.
 * - `freematica_list_resultados_facturacion`: resultados batch facturación vigilancia.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerAlbaranesTools(server: McpServer, client: FreematicaClient): void {
  // -------------------------------------------------------------------------
  // freematica_list_albaranes_ventas
  // -------------------------------------------------------------------------

  server.tool(
    LIST_ALBARANES_VENTAS_TOOL,
    LIST_ALBARANES_VENTAS_DESCRIPTION,
    ListAlbaranesVentasFiltersSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      page,
      items,
      empresa,
      delegacion,
      codCliente,
      codDocumento,
      fechaDesde,
      fechaHasta,
      order,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.listAlbaranesVentas({
          page,
          items,
          empresa,
          delegacion,
          codCliente,
          codDocumento,
          fechaDesde,
          fechaHasta,
          order,
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_albaran_venta
  // -------------------------------------------------------------------------

  server.tool(
    GET_ALBARAN_VENTA_TOOL,
    GET_ALBARAN_VENTA_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del albarán de venta (campo "idReg" en los items de freematica_list_albaranes_ventas).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const albaran = await client.getAlbaranVenta(id);
        return ok(albaran) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_albaranes_factura
  // -------------------------------------------------------------------------

  server.tool(
    LIST_ALBARANES_FACTURA_TOOL,
    LIST_ALBARANES_FACTURA_DESCRIPTION,
    ListAlbaranesFacturaFiltersSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      page,
      items,
      idReg,
      empresa,
      serie,
      numFactura,
      codCliente,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.listAlbaranesFactura({
          page,
          items,
          idReg,
          empresa,
          serie,
          numFactura,
          codCliente,
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_albaran_factura
  // -------------------------------------------------------------------------

  server.tool(
    GET_ALBARAN_FACTURA_TOOL,
    GET_ALBARAN_FACTURA_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del registro albarán-factura (campo "idReg" en los items de freematica_list_albaranes_factura).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const albaran = await client.getAlbaranFactura(id);
        return ok(albaran) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_resultados_facturacion
  // -------------------------------------------------------------------------

  server.tool(
    LIST_RESULTADOS_FACTURACION_TOOL,
    LIST_RESULTADOS_FACTURACION_DESCRIPTION,
    ListResultadosFacturacionFiltersSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      page,
      items,
      empresa,
      delegacion,
      codCliente,
      calendario,
      mes,
      contrato,
      servicio,
      tipoFac,
      traspasado,
      order,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.listResultadosFacturacion({
          page,
          items,
          empresa,
          delegacion,
          codCliente,
          calendario,
          mes,
          contrato,
          servicio,
          tipoFac,
          traspasado,
          order,
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
