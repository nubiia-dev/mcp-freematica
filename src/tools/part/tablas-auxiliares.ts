import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import { error, ok, okList } from '../helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const LIST_FAMILIAS_TOOL_NAME = 'freematica_list_familias';
const GET_FAMILIA_TOOL_NAME = 'freematica_get_familia';
const LIST_LINEAS_TOOL_NAME = 'freematica_list_lineas';
const GET_LINEA_TOOL_NAME = 'freematica_get_linea';
const LIST_SUBFAMILIAS_TOOL_NAME = 'freematica_list_subfamilias';
const GET_SUBFAMILIA_TOOL_NAME = 'freematica_get_subfamilia';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const LIST_FAMILIAS_DESCRIPTION = [
  'Devuelve la lista paginada de familias de artículos en Freemática.',
  '',
  'Endpoint: GET /part/v1/familias',
  '',
  'Cada item incluye el código (COD_FAMILIA) y la descripción de la familia.',
  '',
  'Nota: el catálogo de familias también está disponible vía freematica_get_master_data',
  '(catalog="familias"); este endpoint ofrece detalle adicional por registro y acceso',
  'individual mediante freematica_get_familia.',
].join('\n');

const GET_FAMILIA_DESCRIPTION = [
  'Devuelve el detalle de una familia de artículos por su `idReg` opaco.',
  '',
  'Endpoint: GET /part/v1/familias/{idreg}',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` que aparece en',
  'freematica_list_familias.',
  '',
  'Nota: el catálogo de familias también está disponible vía freematica_get_master_data',
  '(catalog="familias"); este endpoint ofrece detalle adicional por registro.',
].join('\n');

const LIST_LINEAS_DESCRIPTION = [
  'Devuelve la lista paginada de líneas de artículos en Freemática.',
  '',
  'Endpoint: GET /part/v1/lineas',
  '',
  'Cada item incluye el código (COD_LIN_ART) y la descripción de la línea.',
  'Las líneas organizan los artículos por categorías de negocio dentro de las familias.',
].join('\n');

const GET_LINEA_DESCRIPTION = [
  'Devuelve el detalle de una línea de artículos por su `idReg` opaco.',
  '',
  'Endpoint: GET /part/v1/lineas/{idreg}',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` que aparece en',
  'freematica_list_lineas.',
].join('\n');

const LIST_SUBFAMILIAS_DESCRIPTION = [
  'Devuelve la lista paginada de subfamilias de artículos en Freemática.',
  '',
  'Endpoint: GET /part/v1/subfamilias',
  '',
  'Cada item incluye el código (COD_SUBFAM), la familia a la que pertenece',
  'y la descripción de la subfamilia.',
  '',
  'Nota: el catálogo de subfamilias también está disponible vía freematica_get_master_data',
  '(catalog="subfamilias"); este endpoint ofrece detalle adicional por registro y acceso',
  'individual mediante freematica_get_subfamilia.',
].join('\n');

const GET_SUBFAMILIA_DESCRIPTION = [
  'Devuelve el detalle de una subfamilia de artículos por su `idReg` opaco.',
  '',
  'Endpoint: GET /part/v1/subfamilias/{idreg}',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` que aparece en',
  'freematica_list_subfamilias.',
  '',
  'Nota: el catálogo de subfamilias también está disponible vía freematica_get_master_data',
  '(catalog="subfamilias"); este endpoint ofrece detalle adicional por registro.',
].join('\n');

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del sub-módulo Tablas Auxiliares de inventario
 * (familias, líneas y subfamilias de artículos).
 *
 * Nota sobre solapamiento: los catálogos de familias y subfamilias también
 * están disponibles a través de `freematica_get_master_data` con los valores
 * catalog="familias" y catalog="subfamilias". Estos endpoints específicos
 * ofrecen paginación y acceso individual por idReg.
 *
 * Tools de lectura (siempre disponibles):
 *  1. freematica_list_familias   — lista paginada de familias
 *  2. freematica_get_familia     — detalle de familia por idReg
 *  3. freematica_list_lineas     — lista paginada de líneas
 *  4. freematica_get_linea       — detalle de línea por idReg
 *  5. freematica_list_subfamilias — lista paginada de subfamilias
 *  6. freematica_get_subfamilia  — detalle de subfamilia por idReg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerTablasAuxiliaresTools(server: McpServer, client: FreematicaClient): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_familias
  // -------------------------------------------------------------------------
  server.tool(
    LIST_FAMILIAS_TOOL_NAME,
    LIST_FAMILIAS_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listFamilias({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_get_familia
  // -------------------------------------------------------------------------
  server.tool(
    GET_FAMILIA_TOOL_NAME,
    GET_FAMILIA_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco de la familia (campo "idReg" en freematica_list_familias).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const item = await client.getFamilia(id);
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_list_lineas
  // -------------------------------------------------------------------------
  server.tool(
    LIST_LINEAS_TOOL_NAME,
    LIST_LINEAS_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listLineas({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_get_linea
  // -------------------------------------------------------------------------
  server.tool(
    GET_LINEA_TOOL_NAME,
    GET_LINEA_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco de la línea (campo "idReg" en freematica_list_lineas).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const item = await client.getLinea(id);
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 5. freematica_list_subfamilias
  // -------------------------------------------------------------------------
  server.tool(
    LIST_SUBFAMILIAS_TOOL_NAME,
    LIST_SUBFAMILIAS_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listSubfamilias({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 6. freematica_get_subfamilia
  // -------------------------------------------------------------------------
  server.tool(
    GET_SUBFAMILIA_TOOL_NAME,
    GET_SUBFAMILIA_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco de la subfamilia (campo "idReg" en freematica_list_subfamilias).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const item = await client.getSubfamilia(id);
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
