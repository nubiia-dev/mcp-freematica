import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList } from './helpers.js';

export function registerPgrlCatalogosTools(
  server: McpServer,
  client: FreematicaClient,
): void {
  // --------------------------------------------------------------------------
  // Delegaciones v1
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_delegaciones_v1',
    [
      'Devuelve la lista paginada de delegaciones (v1) de Freemática.',
      '',
      'También disponible mediante freematica_get_master_data con el catálogo "delegaciones".',
      'Esta tool ofrece paginación y el campo idReg individual.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listDelegacionesV1({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_delegacion_v1',
    'Devuelve el detalle de una delegación (v1). El parámetro `idReg` debe ser el campo `idReg` de freematica_list_delegaciones_v1.',
    {
      idReg: z.string().min(1).describe('Identificador opaco de la delegación.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getDelegacionV1(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_delegaciones_agrupcod',
    'Devuelve la lista paginada de delegaciones agrupadas por código (agrupcod). Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listDelegacionesAgrupCod({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_delegaciones_v2',
    'Devuelve la lista paginada de delegaciones (v2) de Freemática. Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listDelegacionesV2({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_delegacion_v2',
    'Devuelve el detalle de una delegación (v2). El parámetro `idReg` debe ser el campo `idReg` de freematica_list_delegaciones_v2.',
    {
      idReg: z.string().min(1).describe('Identificador opaco de la delegación v2.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getDelegacionV2(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Empresas
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_empresas',
    [
      'Devuelve la lista paginada de empresas de Freemática.',
      '',
      'También disponible mediante freematica_get_master_data con el catálogo "empresas".',
      'Esta tool ofrece paginación y el campo idReg individual.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listEmpresasV1({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_empresa',
    'Devuelve el detalle de una empresa. El parámetro `idReg` debe ser el campo `idReg` de freematica_list_empresas.',
    {
      idReg: z.string().min(1).describe('Identificador opaco de la empresa.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getEmpresaV1(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Geográficos: paises, provincias, nacionalidades, poblaciones
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_paises',
    [
      'Devuelve la lista paginada de países de Freemática.',
      '',
      'También disponible mediante freematica_get_master_data con el catálogo "paises".',
      'Esta tool ofrece paginación.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPaisesV1({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_provincias',
    [
      'Devuelve la lista paginada de provincias de Freemática.',
      '',
      'También disponible mediante freematica_get_master_data con el catálogo "provincias".',
      'Esta tool ofrece paginación.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listProvinciasV1({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_nacionalidades',
    [
      'Devuelve la lista paginada de nacionalidades de Freemática.',
      '',
      'También disponible mediante freematica_get_master_data con el catálogo "nacionalidades".',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listNacionalidades({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_poblaciones',
    'Devuelve la lista paginada de poblaciones de Freemática. Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPoblaciones({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_poblacion',
    'Devuelve el detalle de una población. El parámetro `idReg` debe ser el campo `idReg` de freematica_list_poblaciones.',
    {
      idReg: z.string().min(1).describe('Identificador opaco de la población.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getPoblacion(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Series, líneas de negocio, bancos
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_series',
    'Devuelve la lista paginada de series de Freemática (v2). Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listSeriesV2({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_lineas_negocio',
    [
      'Devuelve la lista paginada de líneas de negocio de Freemática.',
      '',
      'También disponible mediante freematica_get_master_data con el catálogo "lineas-negocio".',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listLineasNegocio({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_bancos',
    'Devuelve la lista paginada de bancos de Freemática. Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listBancos({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Tipos impuestos
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_tipos_impuestos',
    'Devuelve la lista paginada de tipos de impuestos de Freemática. Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listTiposImpuestos({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_tipo_impuesto',
    'Devuelve el detalle de un tipo de impuesto. El parámetro `idReg` debe ser el campo `idReg` de freematica_list_tipos_impuestos.',
    {
      idReg: z.string().min(1).describe('Identificador opaco del tipo de impuesto.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getTipoImpuesto(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Usuarios satélite y configuración
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_usuarios_satelite',
    'Devuelve la lista paginada de usuarios satélite de Freemática. Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listUsuariosSatelite({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_configuracion_usuario',
    'Devuelve la configuración de un usuario por su idReg.',
    {
      idReg: z.string().min(1).describe('idReg del usuario.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getConfiguracionUsuario(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Auditoría procesos
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_auditoria_procesos',
    'Devuelve la lista paginada del log de auditoría de procesos de Freemática. Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listAuditoriaProcesos({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
