import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import {
  CreateLocalizacionClienteShape,
  UpdateLocalizacionClienteShape,
  LOC_FIELD_MAP,
  buildLocalizacionClienteBody,
  type LocalizacionClienteFields,
  type LocalizacionTipo,
} from '../schemas/localizaciones.js';
import { mergeForUpdate } from '../schemas/clientes.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

const LIST_COBRO_CLIENTES_TOOL = 'freematica_list_localizaciones_cobro_clientes';
const LIST_PAGO_PROVEEDORES_TOOL = 'freematica_list_localizaciones_pago_proveedores';
const LIST_SERVICIO_CLIENTES_TOOL = 'freematica_list_localizaciones_servicio_clientes';
const LIST_ENVIO_CLIENTES_TOOL = 'freematica_list_localizaciones_envio_clientes';
const LIST_FACTURA_CLIENTES_TOOL = 'freematica_list_localizaciones_factura_clientes';
const CREATE_LOC_TOOL = 'freematica_create_localizacion_cliente';
const UPDATE_LOC_TOOL = 'freematica_update_localizacion_cliente';

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
  'COD_REPRES (representante), más `idReg` opaco.',
  '',
  'Paginación 1-indexed.',
].join('\n');

const ENVIO_CLIENTES_DESCRIPTION = [
  'Devuelve la lista paginada de localizaciones de envío de clientes.',
  '',
  'Direcciones de entrega/envío asociadas a un cliente. Cada item incluye',
  'LOC_CLI_ENV (código), NOM_LOC_ENV, dirección, más `idReg` opaco que se usa',
  'en freematica_update_localizacion_cliente (tipo=envio).',
  '',
  'Paginación 1-indexed.',
].join('\n');

const FACTURA_CLIENTES_DESCRIPTION = [
  'Devuelve la lista paginada de localizaciones de factura de clientes.',
  '',
  'Direcciones fiscales/de facturación asociadas a un cliente (incluye datos',
  'de factura electrónica: oficina contable, órgano gestor, EDI). Cada item',
  'incluye LOC_CLI_FAC (código), NOM_LOC_FAC, más `idReg` opaco que se usa en',
  'freematica_update_localizacion_cliente (tipo=factura).',
  '',
  'Paginación 1-indexed.',
].join('\n');

const CREATE_LOC_DESCRIPTION = [
  'Da de alta una localización de cliente del tipo indicado:',
  '  - cobro: condiciones de cobro/domiciliación (requiere formaPago)',
  '  - envio: dirección de entrega',
  '  - factura: dirección fiscal/de facturación',
  '  - servicio: instalación donde se presta el servicio',
  '',
  'Endpoint: POST /pgrl/v2/localizaciones-{tipo}-clientes.',
  'Requeridos: tipo, grupoCliente, codCliente, codLocalizacion; nombre es',
  'obligatorio salvo en tipo envio; formaPago solo se exige en tipo cobro.',
  'Campos específicos del tipo vía camposAdicionales (ej: cobro → CMCC_IBAN;',
  'servicio → COD_ZONA, CMCS_COD_DLG).',
].join('\n');

const UPDATE_LOC_DESCRIPTION = [
  'Actualiza una localización de cliente existente (actualización parcial).',
  '',
  'Endpoint: PUT /pgrl/v2/localizaciones-{tipo}-clientes/{idReg}. La tool',
  'recupera la localización actual, aplica encima los campos informados y',
  'envía el objeto completo. El `idReg` sale de la list tool del tipo',
  '(freematica_list_localizaciones_{cobro|envio|factura|servicio}_clientes).',
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
 *   con filtros por cliente, grupo, país, provincia y representante.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerLocalizacionesTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
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
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Tools 4 y 5: Localizaciones envío y factura (lectura)
  // --------------------------------------------------------------------------

  const envioFacturaSchema = {
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
      .describe('Código de grupo de clientes (COD_GRUPO_CLI en Freemática).'),
  };

  server.tool(
    LIST_ENVIO_CLIENTES_TOOL,
    ENVIO_CLIENTES_DESCRIPTION,
    envioFacturaSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, codCliente, grupoCliente }): Promise<CallToolResult> => {
      try {
        const result = await client.listLocalizacionesEnvioClientes({
          page,
          items,
          codCliente,
          grupoCliente,
        });
        return okList({
          items: result.items,
          total: result.total,
          page,
          itemsPerPage: items,
        }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    LIST_FACTURA_CLIENTES_TOOL,
    FACTURA_CLIENTES_DESCRIPTION,
    envioFacturaSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, codCliente, grupoCliente }): Promise<CallToolResult> => {
      try {
        const result = await client.listLocalizacionesFacturaClientes({
          page,
          items,
          codCliente,
          grupoCliente,
        });
        return okList({
          items: result.items,
          total: result.total,
          page,
          itemsPerPage: items,
        }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Tools adicionales de lectura: detalles por tipo (v1 y v2)
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_localizaciones_cobro_clientes_v1',
    'Devuelve la lista paginada de localizaciones de cobro de clientes (v1). Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listLocalizacionesCobroClientesV1({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_localizacion_cobro_cliente',
    'Devuelve el detalle de una localización de cobro de cliente (v1) por su `idReg`.',
    {
      idReg: z.string().min(1).describe('Identificador de la localización.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getLocalizacionCobroClienteV1(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_localizacion_cobro_cliente_v2',
    'Devuelve el detalle de una localización de cobro de cliente (v2) por su `idReg`.',
    {
      idReg: z.string().min(1).describe('Identificador de la localización.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getLocalizacionCobroClienteV2(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_localizaciones_envio_clientes_v1',
    'Devuelve la lista paginada de localizaciones de envío de clientes (v1). Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listLocalizacionesEnvioClientesV1({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_localizacion_envio_cliente',
    'Devuelve el detalle de una localización de envío de cliente (v1) por su `idReg`.',
    {
      idReg: z.string().min(1).describe('Identificador de la localización.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getLocalizacionEnvioClienteV1(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_localizacion_envio_cliente_v2',
    'Devuelve el detalle de una localización de envío de cliente (v2) por su `idReg`.',
    {
      idReg: z.string().min(1).describe('Identificador de la localización.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getLocalizacionEnvioClienteV2(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_localizacion_factura_cliente',
    'Devuelve el detalle de una localización de factura de cliente (v1) por su `idReg`.',
    {
      idReg: z.string().min(1).describe('Identificador de la localización.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getLocalizacionFacturaClienteV1(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_localizaciones_servicio_clientes_v1',
    'Devuelve la lista paginada de localizaciones de servicio de clientes (v1). Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listLocalizacionesServicioClientesV1({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_localizacion_servicio_cliente',
    'Devuelve el detalle de una localización de servicio de cliente (v1) por su `idReg`.',
    {
      idReg: z.string().min(1).describe('Identificador de la localización.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getLocalizacionServicioClienteV1(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_localizacion_servicio_cliente_v2',
    'Devuelve el detalle de una localización de servicio de cliente (v2) por su `idReg`.',
    {
      idReg: z.string().min(1).describe('Identificador de la localización.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getLocalizacionServicioClienteV2(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_localizaciones_pago_proveedores_v1',
    'Devuelve la lista paginada de localizaciones de pago de proveedores (v1). Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listLocalizacionesPagoProveedoresV1({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_localizacion_pago_proveedor',
    'Devuelve el detalle de una localización de pago de proveedor (v1) por su `idReg`.',
    {
      idReg: z.string().min(1).describe('Identificador de la localización.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getLocalizacionPagoProveedorV1(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_localizacion_pago_proveedor_v2',
    'Devuelve el detalle de una localización de pago de proveedor (v2) por su `idReg`.',
    {
      idReg: z.string().min(1).describe('Identificador de la localización.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getLocalizacionPagoProveedorV2(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // --------------------------------------------------------------------------
  // Tools de escritura: alta y actualización de localizaciones de cliente
  // --------------------------------------------------------------------------

  server.tool(
    CREATE_LOC_TOOL,
    CREATE_LOC_DESCRIPTION,
    CreateLocalizacionClienteShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ tipo, ...fields }): Promise<CallToolResult> => {
      try {
        const locTipo = tipo as LocalizacionTipo;
        const args = fields as LocalizacionClienteFields;
        if (LOC_FIELD_MAP[locTipo].nombreRequerido && args.nombre === undefined) {
          return error(
            new Error(`El campo nombre es obligatorio para localizaciones de tipo ${locTipo}.`),
          ) as CallToolResult;
        }
        if (locTipo === 'cobro' && args.formaPago === undefined) {
          return error(
            new Error('El campo formaPago es obligatorio para localizaciones de tipo cobro.'),
          ) as CallToolResult;
        }
        const body = buildLocalizacionClienteBody(locTipo, args);
        const created = await client.createLocalizacionCliente(locTipo, body);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    UPDATE_LOC_TOOL,
    UPDATE_LOC_DESCRIPTION,
    UpdateLocalizacionClienteShape,
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ tipo, idReg, ...fields }): Promise<CallToolResult> => {
      try {
        const locTipo = tipo as LocalizacionTipo;
        const changes = buildLocalizacionClienteBody(locTipo, fields as LocalizacionClienteFields);
        if (Object.keys(changes).length === 0) {
          return error(
            new Error('Debes informar al menos un campo a actualizar además de tipo e idReg.'),
          ) as CallToolResult;
        }
        const current = await client.getLocalizacionCliente(locTipo, idReg);
        const body = mergeForUpdate(current, changes);
        const updated = await client.updateLocalizacionCliente(locTipo, idReg, body);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Escritura: localizaciones de pago de proveedores
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_create_localizacion_pago_proveedor',
    [
      'Da de alta una localización de pago de proveedor.',
      '',
      'Endpoint: POST /pgrl/v2/localizaciones-pago-proveedores.',
      'Campos nativos del Vo de localización de pago (COD_GRUPO_PRO, COD_PRO, LOCALIZ_PRO, NOMBRE_LOC, COD_FPAGO, etc.).',
    ].join('\n'),
    {
      fields: z.record(z.string(), z.unknown()).describe(
        'Campos nativos del Vo de localización de pago (COD_GRUPO_PRO, COD_PRO, LOCALIZ_PRO, NOMBRE_LOC, COD_FPAGO, etc.).',
      ),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ fields }): Promise<CallToolResult> => {
      try {
        const created = await client.createLocalizacionPagoProveedor(fields);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_update_localizacion_pago_proveedor',
    [
      'Actualiza una localización de pago de proveedor existente (actualización parcial).',
      '',
      'Endpoint: PUT /pgrl/v2/localizaciones-pago-proveedores/{idReg}. La tool recupera la',
      'localización actual (v2), aplica encima los campos informados y envía el objeto completo.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('Identificador de la localización de pago.'),
      fields: z.record(z.string(), z.unknown()).describe('Campos a actualizar.'),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idReg, fields }): Promise<CallToolResult> => {
      try {
        const current = await client.getLocalizacionPagoProveedorV2(idReg);
        const body = { ...(current as Record<string, unknown>), ...fields };
        const updated = await client.updateLocalizacionPagoProveedor(idReg, body);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
