import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

const idUsuarioField = z
  .string()
  .min(1)
  .describe('Identificador del usuario del portal CRM.');

const idDocumentoField = z
  .string()
  .min(1)
  .describe('Identificador del documento del portal CRM (campo "IdDocumento" o "idReg" en la lista de documentos).');

/**
 * Registra las tools MCP del área de Documentos de Portal CRM (textos por usuario).
 *
 * Cubre los endpoints GET /pcrm/v1/usuarios/:idUsuario/documentos,
 * GET /pcrm/v2/usuarios/:idUsuario/documentos y las versiones de detalle y
 * actualización (PUT) de ambas versiones.
 *
 * Nota: Los bodies de PUT de estos endpoints están vacíos en Postman ({}),
 * por lo que la tool de escritura acepta camposAdicionales para pasar los
 * campos nativos que el API requiera.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerPcrmDocumentosTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // freematica_list_pcrm_documentos_usuario_v1
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pcrm_documentos_usuario_v1',
    [
      'Lista paginada de documentos de portal CRM de un usuario (v1).',
      '',
      'Endpoint: GET /pcrm/v1/usuarios/{idUsuario}/documentos',
      '',
      'Devuelve los documentos (textos de portal) asociados a un usuario CRM.',
      'Cada item incluye el identificador de documento para usar en el endpoint de detalle.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    {
      idUsuario: idUsuarioField,
      ...PaginationSchema,
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idUsuario, page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPcrmDocumentosUsuarioV1(idUsuario, { page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_pcrm_documento_usuario_v1
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pcrm_documento_usuario_v1',
    [
      'Detalle de un documento de portal CRM de un usuario (v1).',
      '',
      'Endpoint: GET /pcrm/v1/usuarios/{idUsuario}/documentos/{IdDocumento}',
      '',
      'El parámetro `idDocumento` debe ser el identificador de documento que',
      'aparece en freematica_list_pcrm_documentos_usuario_v1.',
    ].join('\n'),
    {
      idUsuario: idUsuarioField,
      idDocumento: idDocumentoField,
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idUsuario, idDocumento }): Promise<CallToolResult> => {
      try {
        const result = await client.getPcrmDocumentoUsuarioV1(idUsuario, idDocumento);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_pcrm_documentos_usuario_v2
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pcrm_documentos_usuario_v2',
    [
      'Lista paginada de documentos de portal CRM de un usuario (v2).',
      '',
      'Endpoint: GET /pcrm/v2/usuarios/{idUsuario}/documentos',
      '',
      'Versión v2 del listado de documentos de portal. Devuelve los documentos',
      '(textos de portal) asociados a un usuario CRM.',
      'Cada item incluye el identificador de documento para usar en el endpoint de detalle.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    {
      idUsuario: idUsuarioField,
      ...PaginationSchema,
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idUsuario, page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPcrmDocumentosUsuarioV2(idUsuario, { page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_pcrm_documento_usuario_v2
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pcrm_documento_usuario_v2',
    [
      'Detalle de un documento de portal CRM de un usuario (v2).',
      '',
      'Endpoint: GET /pcrm/v2/usuarios/{idUsuario}/documentos/{IdDocumento}',
      '',
      'El parámetro `idDocumento` debe ser el identificador de documento que',
      'aparece en freematica_list_pcrm_documentos_usuario_v2.',
    ].join('\n'),
    {
      idUsuario: idUsuarioField,
      idDocumento: idDocumentoField,
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idUsuario, idDocumento }): Promise<CallToolResult> => {
      try {
        const result = await client.getPcrmDocumentoUsuarioV2(idUsuario, idDocumento);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // freematica_update_pcrm_documento_usuario_v1
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pcrm_documento_usuario_v1',
    [
      'Actualiza un documento de portal CRM de un usuario (v1).',
      '',
      'Endpoint: PUT /pcrm/v1/usuarios/{idUsuario}/documentos/{IdDocumento}',
      '',
      'El body es de forma libre: usa `camposNativos` para pasar los campos',
      'nativos del documento que quieres actualizar (el API acepta un objeto JSON).',
      'Devuelve el registro actualizado.',
    ].join('\n'),
    {
      idUsuario: idUsuarioField,
      idDocumento: idDocumentoField,
      camposNativos: z
        .record(
          z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Las claves deben ser columnas Freemática (MAYUSCULAS_CON_GUION_BAJO)'),
          z.union([z.string(), z.number(), z.boolean(), z.null()]),
        )
        .optional()
        .describe('Campos nativos del documento a actualizar. Las claves deben ser columnas Freemática en MAYUSCULAS_CON_GUION_BAJO (ej: TEXTO, FECHA_INICIO).'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idUsuario, idDocumento, camposNativos }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = camposNativos ?? {};
        const result = await client.updatePcrmDocumentoUsuarioV1(idUsuario, idDocumento, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_pcrm_documento_usuario_v2
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pcrm_documento_usuario_v2',
    [
      'Actualiza un documento de portal CRM de un usuario (v2).',
      '',
      'Endpoint: PUT /pcrm/v2/usuarios/{idUsuario}/documentos/{IdDocumento}',
      '',
      'Versión v2 de la actualización. Usa `camposNativos` para pasar los campos',
      'nativos del documento que quieres actualizar.',
      'Devuelve el registro actualizado.',
    ].join('\n'),
    {
      idUsuario: idUsuarioField,
      idDocumento: idDocumentoField,
      camposNativos: z
        .record(
          z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Las claves deben ser columnas Freemática (MAYUSCULAS_CON_GUION_BAJO)'),
          z.union([z.string(), z.number(), z.boolean(), z.null()]),
        )
        .optional()
        .describe('Campos nativos del documento a actualizar. Las claves deben ser columnas Freemática en MAYUSCULAS_CON_GUION_BAJO (ej: TEXTO, FECHA_INICIO).'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idUsuario, idDocumento, camposNativos }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = camposNativos ?? {};
        const result = await client.updatePcrmDocumentoUsuarioV2(idUsuario, idDocumento, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
