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

const LIST_TOOL_NAME = 'freematica_list_articulos';
const GET_TOOL_NAME = 'freematica_get_articulo';
const PRECIO_TOOL_NAME = 'freematica_get_precio_articulo';
const LIST_COSTES_TOOL_NAME = 'freematica_list_articulos_costes';
const GET_COSTE_TOOL_NAME = 'freematica_get_articulo_coste';
const CREATE_TOOL_NAME = 'freematica_create_articulo';
const UPDATE_TOOL_NAME = 'freematica_update_articulo';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada del catálogo de artículos (materiales, consumibles,',
  'productos) de Freemática.',
  '',
  'Endpoint: GET /part/v1/articulos',
  '',
  'Cada item incluye COD_ARTICULO (referencia), DESC_ART (descripción), COD_PROVEEDOR,',
  'COD_LIN_ART (línea), COD_FAMILIA, COD_SUBFAM, COD_IVA, CODIGO_BARRAS, FECHA_ALTA,',
  'FECHA_BAJA/MOTIVO_BAJA (baja del artículo) y el `idReg` opaco para usar en',
  'freematica_get_articulo y freematica_get_precio_articulo.',
  '',
  'Los códigos de familia/subfamilia/línea se pueden resolver con',
  'freematica_get_master_data (catalogs: familias, subfamilias).',
  '',
  'AVISO: todos los filtros son de coincidencia EXACTA (el API no soporta búsqueda',
  'parcial en este endpoint). COD_ARTICULO puede llevar espacios iniciales que forman',
  'parte del código (ej. " QQ10615"). Para explorar por texto, filtra por familia o',
  'proveedor y revisa las descripciones de los resultados.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle completo de un artículo del catálogo.',
  '',
  'Endpoint: GET /part/v1/articulos/{idreg}',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece',
  'en los items de freematica_list_articulos.',
].join('\n');

const PRECIO_DESCRIPTION = [
  'Devuelve los precios de venta de un artículo: PRECIO_VENTA, DESCUENTO y FACTURABLE.',
  '',
  'Endpoint: GET /pgrl/v1/precio-articulo/{idreg}',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece',
  'en los items de freematica_list_articulos (el mismo que usa freematica_get_articulo).',
].join('\n');

const LIST_COSTES_DESCRIPTION = [
  'Devuelve la lista paginada de costes de artículos en Freemática.',
  '',
  'Endpoint: GET /part/v2/articulos-costes',
  '',
  'Cada item incluye el coste estándar (PRECIO_COSTE_DV1, PRECIO_COSTE_DV2),',
  'precio medio ponderado y otros datos de valoración del artículo.',
].join('\n');

const GET_COSTE_DESCRIPTION = [
  'Devuelve el detalle de costes de un artículo por su `idReg` opaco.',
  '',
  'Endpoint: GET /part/v2/articulos-costes/{idreg}',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` que aparece en',
  'freematica_list_articulos_costes.',
].join('\n');

const CREATE_DESCRIPTION = [
  'Da de alta un artículo en el catálogo de inventario de Freemática.',
  '',
  'Endpoint: POST /part/v2/articulos',
  '',
  'Campos principales: COD_GRUPO_ART, COD_ARTICULO, DESC_ART, COD_LIN_ART,',
  'COD_FAMILIA, COD_SUBFAM, COD_IVA, COD_PROVEEDOR, CODIGO_BARRAS,',
  'TIPO_CODIGO, PRECIO_VENTA_DV1, PRECIO_COSTE_DV1, ACTIVO.',
  'Devuelve el artículo creado.',
].join('\n');

const UPDATE_DESCRIPTION = [
  'Actualiza un artículo del catálogo de inventario en Freemática.',
  '',
  'Endpoint: PUT /part/v2/articulos/{idreg}',
  '',
  'La tool obtiene el artículo actual (GET) y aplica los campos indicados',
  'antes de hacer el PUT (patrón fetch+merge).',
  'El parámetro `idReg` DEBE ser el campo `idReg` de freematica_list_articulos.',
].join('\n');

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Schema para freematica_list_articulos. */
const ListArticulosSchema = {
  ...PaginationSchema,
  codArticulo: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Referencia del artículo (COD_ARTICULO). Coincidencia EXACTA — respeta los ' +
        'espacios iniciales del código si los tiene (ej. " QQ10615").',
    ),
  tipoCodigo: z
    .string()
    .min(1)
    .optional()
    .describe('Tipo de código del artículo (TIPO_CODIGO, ej. "NC").'),
  codProveedor: z
    .string()
    .min(1)
    .optional()
    .describe('Código del proveedor habitual (COD_PROVEEDOR).'),
  linea: z
    .string()
    .min(1)
    .optional()
    .describe('Código de línea de inventario (COD_LIN_ART).'),
  familia: z
    .string()
    .min(1)
    .optional()
    .describe('Código de familia (COD_FAMILIA). Ver freematica_get_master_data catalog=familias.'),
  subfamilia: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Código de subfamilia (COD_SUBFAM). Ver freematica_get_master_data catalog=subfamilias.',
    ),
  descripcion: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Descripción del artículo (DESC_ART). Coincidencia EXACTA con la descripción ' +
        'completa — no soporta búsqueda parcial.',
    ),
  codigoBarras: z
    .string()
    .min(1)
    .optional()
    .describe('Código de barras (CODIGO_BARRAS). Coincidencia exacta.'),
  activo: z
    .boolean()
    .optional()
    .describe(
      'true = artículos sin motivo de baja (MOTIVO_BAJA vacío); false = artículos ' +
        'dados de baja. Si se omite, devuelve todos.',
    ),
};

/** Schema de campos libres para crear/actualizar artículos. */
const ArticuloBodyShape = {
  fields: z
    .record(z.string(), z.unknown())
    .describe(
      'Campos nativos del artículo (VoArticulosV2). ' +
        'Principales: COD_GRUPO_ART, COD_ARTICULO, DESC_ART, COD_LIN_ART, ' +
        'COD_FAMILIA, COD_SUBFAM, COD_IVA, COD_PROVEEDOR, CODIGO_BARRAS, ' +
        'TIPO_CODIGO, PRECIO_VENTA_DV1, PRECIO_COSTE_DV1, ACTIVO. ' +
        'El campo "GMA-ECOMMERCE" se pasa como clave string literal con guion.',
    ),
};

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del dominio Artículos (catálogo de inventario).
 *
 * Tools de lectura (siempre disponibles):
 *  1. freematica_list_articulos        — lista paginada con filtros FIQL
 *  2. freematica_get_articulo          — detalle por idReg
 *  3. freematica_get_precio_articulo   — precios de venta por idReg
 *  4. freematica_list_articulos_costes — lista paginada de costes
 *  5. freematica_get_articulo_coste    — detalle de costes por idReg
 *
 * Tools de escritura (solo si enableWrites=true):
 *  6. freematica_create_articulo — POST /part/v2/articulos
 *  7. freematica_update_articulo — PUT /part/v2/articulos/{idreg} (fetch+merge)
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerArticulosTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_articulos
  // -------------------------------------------------------------------------
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    ListArticulosSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      page,
      items,
      codArticulo,
      tipoCodigo,
      codProveedor,
      linea,
      familia,
      subfamilia,
      descripcion,
      codigoBarras,
      activo,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.listArticulos({
          page,
          items,
          codArticulo,
          tipoCodigo,
          codProveedor,
          linea,
          familia,
          subfamilia,
          descripcion,
          codigoBarras,
          activo,
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_get_articulo
  // -------------------------------------------------------------------------
  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del artículo (campo "idReg" en los items de freematica_list_articulos).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const articulo = await client.getArticulo(id);
        return ok(articulo) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_get_precio_articulo
  // -------------------------------------------------------------------------
  server.tool(
    PRECIO_TOOL_NAME,
    PRECIO_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del artículo (campo "idReg" en los items de freematica_list_articulos).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const precios = await client.getPrecioArticulo(id);
        return ok(precios) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_list_articulos_costes (lectura)
  // -------------------------------------------------------------------------
  server.tool(
    LIST_COSTES_TOOL_NAME,
    LIST_COSTES_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listArticulosCostes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 5. freematica_get_articulo_coste (lectura)
  // -------------------------------------------------------------------------
  server.tool(
    GET_COSTE_TOOL_NAME,
    GET_COSTE_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del artículo-coste (campo "idReg" en freematica_list_articulos_costes).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const coste = await client.getArticuloCoste(id);
        return ok(coste) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 6. freematica_create_articulo (escritura)
  // -------------------------------------------------------------------------
  if (!opts.enableWrites) return;

  server.tool(
    CREATE_TOOL_NAME,
    CREATE_DESCRIPTION,
    ArticuloBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ fields }): Promise<CallToolResult> => {
      try {
        const created = await client.createArticulo(fields as Record<string, unknown>);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 7. freematica_update_articulo (escritura — fetch+merge)
  // -------------------------------------------------------------------------
  server.tool(
    UPDATE_TOOL_NAME,
    UPDATE_DESCRIPTION,
    {
      idReg: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del artículo a actualizar (campo "idReg" en freematica_list_articulos).',
        ),
      ...ArticuloBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, fields }): Promise<CallToolResult> => {
      const typedFields = fields as Record<string, unknown>;
      if (Object.keys(typedFields).length === 0) {
        return error(new Error('Se requiere al menos un campo a actualizar en `fields`.')) as CallToolResult;
      }
      try {
        const current = await client.getArticulo(idReg);
        const merged = { ...current, ...typedFields };
        const updated = await client.updateArticulo(idReg, merged);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
