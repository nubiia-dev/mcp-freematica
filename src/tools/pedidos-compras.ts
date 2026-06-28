import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { ListPedidosCompraFiltersSchema } from '../schemas/pedidos-compras.js';
import { error, ok, okList } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_pedidos_compra';
const GET_TOOL_NAME = 'freematica_get_pedido_compra';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de pedidos de compra de Freemática.',
  '',
  'DISEÑO MIXTO: este endpoint tiene 4 filtros como query params nativos (no FIQL)',
  'y el resto de filtros vía rQuery (FIQL con campos ALCC_*).',
  '',
  'Filtros nativos (van directamente como query params):',
  '  - empresa (4c) → codEmpresa',
  '  - codProveedor (≤10c) → codProveedor',
  '  - fechaPedidoDesde (ISO) → desdeFecha',
  '  - fechaPedidoHasta (ISO) → hastaFecha',
  '',
  'Filtros FIQL (van en rQuery con campos ALCC_*):',
  '  - numPedido → ALCC_NUMDOC',
  '  - codDocumento → ALCC_CODDOC',
  '  - delegacion → ALCC_DELEG',
  '  - formaPago → ALCC_FPAGO',
  '  - tipoIva → ALCC_TIPO_IVA',
  '  - codCliente → ALCC_COD_CLIENTE',
  '  - codInstalador → ALCC_COD_INSTALADOR',
  '  - codMantenedor → ALCC_COD_MANTENEDOR',
  '  - fechaEntregaDesde / fechaEntregaHasta → ALCC_FCHENTREGA con =ge=/=le=',
  '  - referencia → ALCC_REFERENCIA (match exacto)',
  '  - estado → enum: pendiente | bloqueado | recibido',
  '',
  'Cada item contiene los campos del pedido (ALCC_*) más `idReg` opaco para el endpoint singular.',
  '',
  'Paginación 1-indexed.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle completo de un pedido de compra.',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en los items de',
  'freematica_list_pedidos_compra. NO usar ALCC_NUMDOC ni otro código natural.',
  '',
  'La respuesta es un objeto compuesto: { VoPedidosCompraCab, cabecera_proveedor, lineas[] }.',
  'Se devuelve sin aplanar para conservar la estructura original del API.',
].join('\n');

/**
 * Registra las tools de pedidos de compra en el servidor MCP.
 *
 * Tools registradas:
 * - `freematica_list_pedidos_compra`: lista paginada con filtros mixtos
 *   (4 query params nativos + FIQL vía rQuery).
 * - `freematica_get_pedido_compra`: detalle por idReg opaco (objeto compuesto sin aplanar).
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerPedidosComprasTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    ListPedidosCompraFiltersSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      page,
      items,
      empresa,
      codProveedor,
      fechaPedidoDesde,
      fechaPedidoHasta,
      numPedido,
      codDocumento,
      delegacion,
      formaPago,
      tipoIva,
      codCliente,
      codInstalador,
      codMantenedor,
      fechaEntregaDesde,
      fechaEntregaHasta,
      referencia,
      estado,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.listPedidosCompra({
          page,
          items,
          empresa,
          codProveedor,
          fechaPedidoDesde,
          fechaPedidoHasta,
          numPedido,
          codDocumento,
          delegacion,
          formaPago,
          tipoIva,
          codCliente,
          codInstalador,
          codMantenedor,
          fechaEntregaDesde,
          fechaEntregaHasta,
          referencia,
          estado,
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del pedido de compra (campo "idReg" en los items de freematica_list_pedidos_compra). ' +
          'Puede contener caracteres especiales como "==" (base64); se URL-encodeará automáticamente.',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const pedido = await client.getPedidoCompra(id);
        return ok(pedido) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
