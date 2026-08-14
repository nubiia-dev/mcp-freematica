import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_proveedores';
const GET_TOOL_NAME = 'freematica_get_proveedor';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de proveedores de Freemática.',
  '',
  'Cada item contiene campos como COD_PRO (código), COD_GRUPO_PRO (grupo), NIF, NOMBRE_PRO (nombre),',
  'FECHA_BAJA (baja del proveedor), CMP_TIPO_IDENT (tipo identificador), COD_PROVINCIA, COD_PAIS,',
  'más `idReg` opaco para el endpoint singular.',
  '',
  'Paginación 1-indexed.',
  '',
  'El filtro `activo` es un booleano: true = FECHA_BAJA nula (proveedores activos,',
  'filtrado sobre la página recibida — el total refleja el dataset sin filtrar);',
  'false = FECHA_BAJA informada (dados de baja).',
  '',
  'El filtro `nombre` es de coincidencia EXACTA con el nombre completo',
  '(el API no soporta búsqueda parcial en este endpoint).',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle completo de un proveedor.',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en los items de',
  'freematica_list_proveedores. NO usar COD_PRO ni otro código natural.',
].join('\n');

const LIST_SCHEMA = {
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
  nif: z
    .string()
    .min(1)
    .optional()
    .describe('NIF / CIF del proveedor (NIF en Freemática). Búsqueda exacta.'),
  nombre: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Nombre del proveedor (NOMBRE_PRO). Coincidencia EXACTA con el nombre completo ' +
      'tal cual figura en Freemática — "García" NO encuentra "García S.L.".',
    ),
  activo: z
    .boolean()
    .optional()
    .describe(
      'Filtra por estado del proveedor. true = sin fecha de baja (activos); ' +
      'false = con fecha de baja (dados de baja). FECHA_BAJA en Freemática.',
    ),
  tipoIdent: z
    .string()
    .min(1)
    .optional()
    .describe('Tipo de identificador fiscal (CMP_TIPO_IDENT en Freemática). Enum del API.'),
  codProvincia: z
    .string()
    .min(1)
    .optional()
    .describe('Código de provincia (COD_PROVINCIA en Freemática).'),
  codPais: z
    .string()
    .min(1)
    .optional()
    .describe('Código de país (COD_PAIS en Freemática).'),
};

/**
 * Registra las tools de proveedores en el servidor MCP.
 *
 * Tools registradas:
 * - `freematica_list_proveedores`: lista paginada con filtros FIQL (nombre por coincidencia
 *   exacta y filtro activo/inactivo vía FECHA_BAJA).
 * - `freematica_get_proveedor`: detalle por idReg opaco.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerProveedoresTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    LIST_SCHEMA,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      page,
      items,
      codProveedor,
      grupoProveedor,
      nif,
      nombre,
      activo,
      tipoIdent,
      codProvincia,
      codPais,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.listProveedores({
          page,
          items,
          codProveedor,
          grupoProveedor,
          nif,
          nombre,
          activo,
          tipoIdent,
          codProvincia,
          codPais,
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
          'idReg opaco del proveedor (campo "idReg" en los items de freematica_list_proveedores).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const proveedor = await client.getProveedor(id);
        return ok(proveedor) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Tools v1: acceso al endpoint /pgrl/v1/proveedores
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_proveedores_v1',
    [
      'Devuelve la lista paginada de proveedores usando el endpoint v1 de Freemática.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listProveedoresV1({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // --------------------------------------------------------------------------
  // Tools de escritura: alta y actualización de proveedores
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_create_proveedor',
    [
      'Da de alta un proveedor en Freemática.',
      '',
      'Endpoint: POST /pgrl/v2/proveedores.',
      'Campos nativos del proveedor (COD_GRUPO_PRO, COD_PRO, NOMBRE_PRO, NIF, etc.).',
    ].join('\n'),
    {
      fields: z
        .record(z.string(), z.unknown())
        .describe('Campos nativos del proveedor (COD_GRUPO_PRO, COD_PRO, NOMBRE_PRO, NIF, etc.).'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ fields }): Promise<CallToolResult> => {
      try {
        const created = await client.createProveedor(fields);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_update_proveedor',
    [
      'Actualiza un proveedor existente (actualización parcial).',
      '',
      'Endpoint: PUT /pgrl/v2/proveedores/{idReg}. La tool recupera el proveedor actual,',
      'aplica encima los campos informados y envía el objeto completo.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('Identificador del proveedor.'),
      fields: z.record(z.string(), z.unknown()).describe('Campos a actualizar.'),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idReg, fields }): Promise<CallToolResult> => {
      try {
        const current = await client.getProveedor(idReg);
        const body = { ...(current as Record<string, unknown>), ...fields };
        const updated = await client.updateProveedor(idReg, body);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
