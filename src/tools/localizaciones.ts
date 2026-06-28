import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, okList } from './helpers.js';

const LIST_COBRO_CLIENTES_TOOL = 'freematica_list_localizaciones_cobro_clientes';
const LIST_PAGO_PROVEEDORES_TOOL = 'freematica_list_localizaciones_pago_proveedores';
const LIST_SERVICIO_CLIENTES_TOOL = 'freematica_list_localizaciones_servicio_clientes';

const COBRO_CLIENTES_DESCRIPTION = [
  'Devuelve la lista paginada de localizaciones de cobro de clientes.',
  '',
  'Las localizaciones de cobro definen la domiciliación bancaria o condiciones de pago de un cliente.',
  'Cada item contiene campos como COD_CLI (cliente), GRUPO_CLI (grupo), COD_FORMA_COBRO (forma de cobro),',
  'más `idReg` opaco.',
  '',
  'Paginación 1-indexed.',
].join('\n');

const PAGO_PROVEEDORES_DESCRIPTION = [
  'Devuelve la lista paginada de localizaciones de pago de proveedores.',
  '',
  'Las localizaciones de pago definen las condiciones bancarias o de pago de un proveedor.',
  'Cada item contiene campos como COD_PRO (proveedor), COD_GRUPO_PRO (grupo), COD_FORMA_PAGO (forma de pago),',
  'más `idReg` opaco.',
  '',
  'Paginación 1-indexed.',
].join('\n');

const SERVICIO_CLIENTES_DESCRIPTION = [
  'Devuelve la lista paginada de localizaciones de servicio de clientes.',
  '',
  'Las localizaciones de servicio son las direcciones donde se presta servicio a un cliente.',
  'Cada item contiene campos como COD_CLI (cliente), GRUPO_CLI (grupo), COD_PAIS, COD_PROVINCIA,',
  'COD_REPRES (representante), FECHA_BAJA (estado activo/baja), más `idReg` opaco.',
  '',
  'Paginación 1-indexed.',
  '',
  'El filtro `activo` es un booleano: true = sin fecha de baja (localizaciones activas);',
  'false = con fecha de baja (dadas de baja).',
].join('\n');

// ---------------------------------------------------------------------------
// Schemas individuales
// ---------------------------------------------------------------------------

const CobroClientesSchema = {
  ...PaginationSchema,
  codCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del cliente (COD_CLI en Freemática).'),
  grupoCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código de grupo de clientes (GRUPO_CLI en Freemática).'),
  formaPago: z
    .string()
    .min(1)
    .optional()
    .describe('Código de forma de cobro (COD_FORMA_COBRO en Freemática).'),
};

const PagoProveedoresSchema = {
  ...PaginationSchema,
  codProveedor: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del proveedor (COD_PRO en Freemática).'),
  grupoProveedor: z
    .string()
    .min(1)
    .optional()
    .describe('Código de grupo de proveedores (COD_GRUPO_PRO en Freemática).'),
  formaPago: z
    .string()
    .min(1)
    .optional()
    .describe('Código de forma de pago (COD_FORMA_PAGO en Freemática).'),
};

const ServicioClientesSchema = {
  ...PaginationSchema,
  codCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del cliente (COD_CLI en Freemática).'),
  grupoCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código de grupo de clientes (GRUPO_CLI en Freemática).'),
  codPais: z
    .string()
    .min(1)
    .optional()
    .describe('Código de país (COD_PAIS en Freemática).'),
  codProvincia: z
    .string()
    .min(1)
    .optional()
    .describe('Código de provincia (COD_PROVINCIA en Freemática).'),
  representante: z
    .string()
    .min(1)
    .optional()
    .describe('Código de representante asignado (COD_REPRES en Freemática).'),
  activo: z
    .boolean()
    .optional()
    .describe(
      'Filtra por estado de la localización. true = sin fecha de baja (activas); ' +
      'false = con fecha de baja (dadas de baja). FECHA_BAJA en Freemática.',
    ),
};

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tres tools de localizaciones en el servidor MCP.
 *
 * Tools registradas:
 * - `freematica_list_localizaciones_cobro_clientes`: cobros de clientes filtrados por
 *   codCliente, grupoCliente y formaPago.
 * - `freematica_list_localizaciones_pago_proveedores`: pagos de proveedores filtrados por
 *   codProveedor, grupoProveedor y formaPago.
 * - `freematica_list_localizaciones_servicio_clientes`: localizaciones de servicio de clientes
 *   con filtros por cliente, grupo, país, provincia, representante y activo/baja.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerLocalizacionesTools(server: McpServer, client: FreematicaClient): void {
  // --------------------------------------------------------------------------
  // Tool 1: Localizaciones cobro clientes
  // --------------------------------------------------------------------------

  server.tool(
    LIST_COBRO_CLIENTES_TOOL,
    COBRO_CLIENTES_DESCRIPTION,
    CobroClientesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, codCliente, grupoCliente, formaPago }): Promise<CallToolResult> => {
      try {
        const result = await client.listLocalizacionesCobroClientes({
          page,
          items,
          codCliente,
          grupoCliente,
          formaPago,
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Tool 2: Localizaciones pago proveedores
  // --------------------------------------------------------------------------

  server.tool(
    LIST_PAGO_PROVEEDORES_TOOL,
    PAGO_PROVEEDORES_DESCRIPTION,
    PagoProveedoresSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, codProveedor, grupoProveedor, formaPago }): Promise<CallToolResult> => {
      try {
        const result = await client.listLocalizacionesPagoProveedores({
          page,
          items,
          codProveedor,
          grupoProveedor,
          formaPago,
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Tool 3: Localizaciones servicio clientes
  // --------------------------------------------------------------------------

  server.tool(
    LIST_SERVICIO_CLIENTES_TOOL,
    SERVICIO_CLIENTES_DESCRIPTION,
    ServicioClientesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      page,
      items,
      codCliente,
      grupoCliente,
      codPais,
      codProvincia,
      representante,
      activo,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.listLocalizacionesServicioClientes({
          page,
          items,
          codCliente,
          grupoCliente,
          codPais,
          codProvincia,
          representante,
          activo,
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
