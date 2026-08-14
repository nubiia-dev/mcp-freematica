import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const UPDATE_FACTURA_COMPRA = 'freematica_update_factura_compra';
const UPDATE_PEDIDO_FECHAS = 'freematica_update_pedido_fechas';
const RECIBIR_PEDIDO = 'freematica_recibir_pedido';
const CREATE_PROPUESTA_COMPRA = 'freematica_create_propuesta_compra';
const LIST_PROPUESTAS_COMPRA = 'freematica_list_propuestas_compra';

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools de escritura y nuevas lecturas del dominio PCMP (Fase 7).
 *
 * Tools expuestas (lectura):
 *  1. freematica_list_propuestas_compra  → GET /pcmp/v1/propuestas
 *
 * Tools expuestas (escritura, enableWrites=true):
 *  2. freematica_update_factura_compra   → PUT /pcmp/v2/facturas-compras/:idReg
 *  3. freematica_update_pedido_fechas    → PUT /pcmp/v2/pedidos-fechas/:idreg
 *  4. freematica_recibir_pedido         → PUT /pcmp/v2/control/recibir-pedidos/:idReg
 *  5. freematica_create_propuesta_compra → POST /pcmp/v1/propuestas
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerPcmpEscriturasTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_propuestas_compra (LECTURA — siempre disponible)
  // -------------------------------------------------------------------------

  server.tool(
    LIST_PROPUESTAS_COMPRA,
    'Devuelve la lista paginada de propuestas de compra.\n\nEndpoint: GET /pcmp/v1/propuestas.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPropuestasCompra({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // =========================================================================
  // ESCRITURAS (requieren enableWrites: true)
  // =========================================================================

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 2. freematica_update_factura_compra
  // -------------------------------------------------------------------------

  server.tool(
    UPDATE_FACTURA_COMPRA,
    'Actualiza una factura de compra.\n\nEndpoint: PUT /pcmp/v2/facturas-compras/:idReg.',
    {
      idReg: z
        .string()
        .min(1)
        .describe('idReg opaco de la factura de compra (campo "idReg" en freematica_list_facturas_compras).'),
      FCC_CODEMP: z.string().optional().describe('Empresa factura (FCC_CODEMP).'),
      FCC_FCHFAC: z.string().optional().describe('Fecha factura (ISO) (FCC_FCHFAC).'),
      FCC_SERIEFRA: z.string().optional().describe('Serie de factura (FCC_SERIEFRA).'),
      FCC_NUMFRA: z.number().int().optional().describe('Número de factura (FCC_NUMFRA).'),
      FCC_FCH_EXPORTADO: z
        .string()
        .optional()
        .describe('Fecha de exportado (ISO) (FCC_FCH_EXPORTADO).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async (args): Promise<CallToolResult> => {
      try {
        const { idReg, ...body } = args;
        const result = await client.updateFacturaCompra(idReg, body as Record<string, unknown>);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_update_pedido_fechas
  // -------------------------------------------------------------------------

  server.tool(
    UPDATE_PEDIDO_FECHAS,
    'Actualiza las fechas de un pedido de compra.\n\nEndpoint: PUT /pcmp/v2/pedidos-fechas/:idreg.',
    {
      idReg: z
        .string()
        .min(1)
        .describe('idReg opaco del pedido de compra (campo "idReg" en freematica_list_pedidos_compra).'),
      ALCC_FCHENTREGA: z.string().optional().describe('Fecha de entrega prevista (ISO).'),
      ALCC_FCH_ENVIADO: z.string().optional().describe('Fecha de envío al proveedor (ISO).'),
      ALCC_FCH_CONFORME_PROV: z
        .string()
        .optional()
        .describe('Fecha de conformidad del proveedor (ISO).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async (args): Promise<CallToolResult> => {
      try {
        const { idReg, ...body } = args;
        const result = await client.updatePedidoFechas(idReg, body as Record<string, unknown>);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_recibir_pedido
  // -------------------------------------------------------------------------

  server.tool(
    RECIBIR_PEDIDO,
    'Marca un pedido de compra como recibido.\n\nEndpoint: PUT /pcmp/v2/control/recibir-pedidos/:idReg.',
    {
      idReg: z
        .string()
        .min(1)
        .describe('idReg opaco del pedido de compra.'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.recibirPedido(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 5. freematica_create_propuesta_compra
  // -------------------------------------------------------------------------

  server.tool(
    CREATE_PROPUESTA_COMPRA,
    'Crea una propuesta de compra.\n\nEndpoint: POST /pcmp/v1/propuestas.',
    {
      PPCC_CODEMP: z.string().optional().describe('Código empresa (PPCC_CODEMP).'),
      PPCC_DELEG: z.string().optional().describe('Código delegación (PPCC_DELEG).'),
      PPCC_FCHPROP: z.string().optional().describe('Fecha propuesta (ISO) (PPCC_FCHPROP).'),
      PPCC_NUMPROP: z.number().int().optional().describe('Número propuesta (PPCC_NUMPROP).'),
      PPCC_USUARIO: z.string().optional().describe('Usuario (PPCC_USUARIO).'),
      PPCC_CLAVE_FAC: z.string().optional().describe('Clave facturación (PPCC_CLAVE_FAC).'),
      PPCC_TIPO_CON: z.string().optional().describe('Tipo contrato (PPCC_TIPO_CON).'),
      PPCC_CONTRATO: z.string().optional().describe('Contrato (PPCC_CONTRATO).'),
      PPCC_SERVICIO: z.string().optional().describe('Servicio (PPCC_SERVICIO).'),
      PPCC_OBSERVACIONES: z.string().optional().describe('Observaciones (PPCC_OBSERVACIONES).'),
      PPCC_DESTINATARIO: z.string().optional().describe('Destinatario (PPCC_DESTINATARIO).'),
      PPCC_NIF_CLIENTE: z.string().optional().describe('NIF cliente (PPCC_NIF_CLIENTE).'),
      PPCC_COD_CLIENTE: z.string().optional().describe('Código cliente (PPCC_COD_CLIENTE).'),
      PPCC_FCH_CONT_INS: z
        .string()
        .optional()
        .describe('Fecha contrato instalación (ISO) (PPCC_FCH_CONT_INS).'),
      PPCC_DELEG_SERV: z.string().optional().describe('Delegación servicio (PPCC_DELEG_SERV).'),
      PPCC_LOC_SERV_CLIENTE: z
        .number()
        .int()
        .optional()
        .describe('Localización servicio cliente (PPCC_LOC_SERV_CLIENTE).'),
      PPCC_MANTENEDOR: z.string().optional().describe('Mantenedor (PPCC_MANTENEDOR).'),
      PPCC_DEPARTAMENTO: z.string().optional().describe('Departamento (PPCC_DEPARTAMENTO).'),
      lineas: z.unknown().optional().describe('Líneas de la propuesta (array o null).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async (args): Promise<CallToolResult> => {
      try {
        const result = await client.createPropuestaCompra(args as Record<string, unknown>);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
