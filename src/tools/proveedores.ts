import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList } from './helpers.js';

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
  'El filtro `activo` es un booleano: true = FECHA_BAJA nula (proveedores activos);',
  'false = FECHA_BAJA informada (dados de baja).',
  '',
  'El filtro `nombre` realiza búsqueda parcial mediante operador FIQL =lk= (LIKE).',
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
      'Nombre del proveedor (NOMBRE_PRO). Búsqueda parcial — se usa operador FIQL =lk= (LIKE). ' +
      'Ejemplo: "García" devuelve todos los proveedores cuyo nombre contenga "García".',
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
 * - `freematica_list_proveedores`: lista paginada con filtros FIQL (incluye búsqueda parcial por nombre
 *   con =lk= y filtro activo/inactivo vía FECHA_BAJA).
 * - `freematica_get_proveedor`: detalle por idReg opaco.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerProveedoresTools(server: McpServer, client: FreematicaClient): void {
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
}
