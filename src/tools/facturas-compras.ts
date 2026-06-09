import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { DateRangeSchema } from '../schemas/filters.js';
import { error, ok, okList } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_facturas_compras';
const GET_TOOL_NAME = 'freematica_get_factura_compra';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de facturas de compras de Freemática.',
  '',
  'Cada item contiene campos como FCC_CODEMP (empresa), FCC_CODPRO (proveedor), FCC_FCHFAC (fecha factura),',
  'FCC_SERIEFRA (serie), FCC_NUMFRA (número), FCC_FPAGO (forma de pago), FCC_TRASP_CONTAB (traspasado contabilidad),',
  'FCC_DELEG (delegación), FCC_LIN_NEGOCIO (línea negocio), más `idReg` opaco para el endpoint singular.',
  '',
  'Paginación 1-indexed. Los filtros de fecha aplican sobre la fecha de la factura (FCC_FCHFAC).',
  '',
  'El parámetro `exportado` acepta exactamente: "all" (todas) | "not_exported" (no exportadas).',
  'Se envía como query param nativo, no como FIQL.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle completo de una factura de compra.',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en los items de',
  'freematica_list_facturas_compras. NO usar FCC_NUMFRA ni otro código natural.',
].join('\n');

/**
 * Enum nativo del endpoint de facturas de compras para el filtro de exportación.
 *
 * - `all`: todas las facturas independientemente de si han sido exportadas.
 * - `not_exported`: sólo facturas que aún no han sido exportadas.
 */
const ExportadoEnum = z.enum(['all', 'not_exported']).optional().describe(
  'Filtro de exportación. Valores: "all" (todas) | "not_exported" (no exportadas). ' +
  'Se envía como query param nativo, no FIQL.',
);

const LIST_SCHEMA = {
  ...PaginationSchema,
  ...DateRangeSchema.shape,
  empresa: z
    .string()
    .min(1)
    .optional()
    .describe('Código de empresa (FCC_CODEMP en Freemática).'),
  codProveedor: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del proveedor (FCC_CODPRO en Freemática).'),
  serie: z
    .string()
    .min(1)
    .optional()
    .describe('Serie de la factura (FCC_SERIEFRA en Freemática).'),
  numFactura: z
    .string()
    .min(1)
    .optional()
    .describe('Número de factura (FCC_NUMFRA en Freemática).'),
  formaPago: z
    .string()
    .min(1)
    .optional()
    .describe('Código de forma de pago (FCC_FPAGO en Freemática).'),
  traspasadoContabilidad: z
    .boolean()
    .optional()
    .describe('Filtra facturas traspasadas a contabilidad (FCC_TRASP_CONTAB en Freemática).'),
  delegacion: z
    .string()
    .min(1)
    .optional()
    .describe('Código de delegación (FCC_DELEG en Freemática).'),
  lineaNegocio: z
    .string()
    .min(1)
    .optional()
    .describe('Código de línea de negocio (FCC_LIN_NEGOCIO en Freemática).'),
  exportado: ExportadoEnum,
};

/**
 * Registra las tools de facturas de compras en el servidor MCP.
 *
 * Tools registradas:
 * - `freematica_list_facturas_compras`: lista paginada con filtros FIQL + exportado nativo.
 * - `freematica_get_factura_compra`: detalle por idReg opaco.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerFacturasComprasTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    LIST_SCHEMA,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      page,
      items,
      fechaDesde,
      fechaHasta,
      empresa,
      codProveedor,
      serie,
      numFactura,
      formaPago,
      traspasadoContabilidad,
      delegacion,
      lineaNegocio,
      exportado,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.listFacturasCompras({
          page,
          items,
          fechaDesde,
          fechaHasta,
          empresa,
          codProveedor,
          serie,
          numFactura,
          formaPago,
          traspasadoContabilidad,
          delegacion,
          lineaNegocio,
          exportado,
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
          'idReg opaco de la factura de compra (campo "idReg" en los items de freematica_list_facturas_compras).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const factura = await client.getFacturaCompra(id);
        return ok(factura) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
