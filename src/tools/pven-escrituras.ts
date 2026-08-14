import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { error, ok, type RegisterOptions } from './helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const CREATE_ALBARAN_VENTA = 'freematica_create_albaran_venta';
const UPDATE_ALBARAN_FCH_TRASPASO_EXT = 'freematica_update_albaran_fch_traspaso_ext';
const CREATE_FACTURA_ESTADO = 'freematica_create_factura_estado';
const UPDATE_FACTURA_ELECTRONICA_V1 = 'freematica_update_factura_electronica_v1';
const UPDATE_FACTURA_ELECTRONICA_V2 = 'freematica_update_factura_electronica_v2';
const UPDATE_FACTURA_LEIDO = 'freematica_update_factura_leido';

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools de escritura del dominio PVEN (Fase 7).
 *
 * Tools expuestas (escritura, enableWrites=true):
 *  1. freematica_create_albaran_venta          → POST /pven/v2/albaranes-ventas
 *  2. freematica_update_albaran_fch_traspaso_ext → PUT /pven/v2/albaranes-ventas-fechatraspasoext/:idReg
 *  3. freematica_create_factura_estado          → POST /pven/v1/facturas/estados
 *  4. freematica_update_factura_electronica_v1  → PUT /pven/v1/facturas/:idReg
 *  5. freematica_update_factura_electronica_v2  → PUT /pven/v2/facturas/:idReg
 *  6. freematica_update_factura_leido           → PUT /pven/v1/facturas/:idReg/leido
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerPvenEscriturasTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 1. freematica_create_albaran_venta
  // -------------------------------------------------------------------------

  server.tool(
    CREATE_ALBARAN_VENTA,
    [
      'Crea un albarán de venta.',
      '',
      'Endpoint: POST /pven/v2/albaranes-ventas.',
      '',
      'El body acepta campos ALVC_* (cabecera) y ALVL_* (líneas).',
      'Consultar la documentación de Freemática para el detalle de campos.',
    ].join('\n'),
    {
      camposAlbaran: z
        .record(z.string(), z.unknown())
        .describe('Campos ALVC_* de cabecera y ALVL_* de líneas. Ver docs Freemática.'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAlbaran }): Promise<CallToolResult> => {
      try {
        const result = await client.createAlbaranVenta(camposAlbaran);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_update_albaran_fch_traspaso_ext
  // -------------------------------------------------------------------------

  server.tool(
    UPDATE_ALBARAN_FCH_TRASPASO_EXT,
    [
      'Actualiza la fecha de traspaso externo de un albarán de venta.',
      '',
      'Endpoint: PUT /pven/v2/albaranes-ventas-fechatraspasoext/:idReg.',
      '',
      'El body acepta campos ALVC_* y ALVL_*.',
    ].join('\n'),
    {
      idReg: z
        .string()
        .min(1)
        .describe('idReg opaco del albarán de venta (campo "idReg" en freematica_list_albaranes_ventas).'),
      camposAlbaran: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos ALVC_* / ALVL_* a actualizar. Ver docs Freemática.'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAlbaran }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAlbaran ?? {}) };
        const result = await client.updateAlbaranFchTraspasoExt(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_create_factura_estado
  // -------------------------------------------------------------------------

  server.tool(
    CREATE_FACTURA_ESTADO,
    [
      'Crea un estado de factura (AAPP / EDICOM).',
      '',
      'Endpoint: POST /pven/v1/facturas/estados.',
    ].join('\n'),
    {
      camposFact: z
        .record(z.string(), z.unknown())
        .describe('Campos del estado de factura para AAPP/EDICOM. Ver docs Freemática.'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposFact }): Promise<CallToolResult> => {
      try {
        const result = await client.createFacturaEstado(camposFact);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_update_factura_electronica_v1
  // -------------------------------------------------------------------------

  server.tool(
    UPDATE_FACTURA_ELECTRONICA_V1,
    [
      'Actualiza una factura electrónica (v1).',
      '',
      'Endpoint: PUT /pven/v1/facturas/:idReg.',
    ].join('\n'),
    {
      idReg: z
        .string()
        .min(1)
        .describe('idReg opaco de la factura electrónica (campo "idReg" en freematica_list_facturas_electronicas).'),
      FACED_ESTADO: z.string().optional().describe('Estado de la factura electrónica.'),
      FACED_TIPO: z.string().optional().describe('Tipo de factura electrónica.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos adicionales FACED_* a actualizar.'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async (args): Promise<CallToolResult> => {
      try {
        const { idReg, camposAdicionales, ...explicit } = args;
        const body: Record<string, unknown> = { ...explicit, ...(camposAdicionales ?? {}) };
        const result = await client.updateFacturaElectronicaV1(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 5. freematica_update_factura_electronica_v2
  // -------------------------------------------------------------------------

  server.tool(
    UPDATE_FACTURA_ELECTRONICA_V2,
    [
      'Actualiza una factura electrónica (v2).',
      '',
      'Endpoint: PUT /pven/v2/facturas/:idReg.',
    ].join('\n'),
    {
      idReg: z
        .string()
        .min(1)
        .describe('idReg opaco de la factura electrónica.'),
      FACED_ESTADO: z.string().optional().describe('Estado de la factura electrónica.'),
      FACED_TIPO: z.string().optional().describe('Tipo de factura electrónica.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos adicionales FACED_* a actualizar.'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async (args): Promise<CallToolResult> => {
      try {
        const { idReg, camposAdicionales, ...explicit } = args;
        const body: Record<string, unknown> = { ...explicit, ...(camposAdicionales ?? {}) };
        const result = await client.updateFacturaElectronicaV2(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 6. freematica_update_factura_leido
  // -------------------------------------------------------------------------

  server.tool(
    UPDATE_FACTURA_LEIDO,
    [
      'Marca una factura electrónica como leída.',
      '',
      'Endpoint: PUT /pven/v1/facturas/:idReg/leido.',
    ].join('\n'),
    {
      idReg: z
        .string()
        .min(1)
        .describe('idReg opaco de la factura electrónica.'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.updateFacturaLeido(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
