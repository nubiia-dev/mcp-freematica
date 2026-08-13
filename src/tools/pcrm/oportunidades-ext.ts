import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreateOportunidadShape,
  UpdateOportunidadShape,
  UpdateOportunidadDatosAmpladosShape,
  buildOportunidadBody,
  buildDatosAmpladosBody,
  type OportunidadFields,
  type UpdateOportunidadDatosAmpladosFields,
} from '../../schemas/pcrm.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

const idRegField = (context: string) =>
  z.string().min(1).describe(`idReg opaco de la oportunidad (campo "idReg" en ${context}).`);

/**
 * Registra las tools MCP extendidas del área de Oportunidades de Negocio CRM.
 *
 * NO duplica las tres tools ya existentes en oportunidades-negocio.ts:
 *  - freematica_list_oportunidades_negocio
 *  - freematica_get_oportunidad_negocio
 *  - freematica_get_oportunidad_negocio_datos_ampliados
 *
 * Añade:
 *  - Detalle v1 de oportunidad
 *  - Catálogo de tipos de oportunidad (lista y detalle)
 *  - Escrituras: create v1/v2, update v1/v2, update datos-ampliados
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerPcrmOportunidadesExtTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // freematica_get_oportunidad_negocio_v1
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_oportunidad_negocio_v1',
    [
      'Detalle de una oportunidad de negocio (v1).',
      '',
      'Endpoint: GET /pcrm/v1/oportunidades-negocio/{idReg}',
      '',
      'Versión v1 del detalle de oportunidad. Puede devolver campos distintos',
      'a la versión v2 (freematica_get_oportunidad_negocio).',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_oportunidades_negocio.',
    ].join('\n'),
    { id: idRegField('freematica_list_oportunidades_negocio') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getOportunidadNegocioV1(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_tipos_oportunidad_negocio
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_tipos_oportunidad_negocio',
    [
      'Lista paginada de tipos de oportunidad de negocio CRM.',
      '',
      'Endpoint: GET /pcrm/v2/tipos-oportunidad-negocio',
      '',
      'Devuelve el catálogo de tipos de oportunidad disponibles.',
      'Cada item incluye `idReg` opaco para usar en freematica_get_tipo_oportunidad_negocio.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listTiposOportunidadNegocio({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_tipo_oportunidad_negocio
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_tipo_oportunidad_negocio',
    [
      'Detalle de un tipo de oportunidad de negocio CRM.',
      '',
      'Endpoint: GET /pcrm/v2/tipos-oportunidad-negocio/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_tipos_oportunidad_negocio.',
    ].join('\n'),
    {
      id: z.string().min(1).describe('idReg opaco del tipo de oportunidad (campo "idReg" en freematica_list_tipos_oportunidad_negocio).'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getTipoOportunidadNegocio(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // freematica_create_oportunidad_negocio_v1
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_oportunidad_negocio_v1',
    [
      'Crea una nueva oportunidad de negocio (v1).',
      '',
      'Endpoint: POST /pcrm/v1/oportunidades-negocio — body VoOportunidadNegocio.',
      '',
      'Los campos no expuestos se pasan en camposAdicionales con su nombre nativo.',
      'Devuelve el registro creado.',
    ].join('\n'),
    CreateOportunidadShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildOportunidadBody(args as OportunidadFields);
        const result = await client.createOportunidadNegocioV1(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_oportunidad_negocio
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_oportunidad_negocio',
    [
      'Crea una nueva oportunidad de negocio (v2).',
      '',
      'Endpoint: POST /pcrm/v2/oportunidades-negocio — body VoOportunidadNegocio.',
      '',
      'Versión v2 del alta de oportunidad. Los campos no expuestos se pasan en',
      'camposAdicionales con su nombre nativo.',
      'Devuelve el registro creado.',
    ].join('\n'),
    CreateOportunidadShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildOportunidadBody(args as OportunidadFields);
        const result = await client.createOportunidadNegocio(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_oportunidad_negocio_v1
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_oportunidad_negocio_v1',
    [
      'Actualiza una oportunidad de negocio existente (v1).',
      '',
      'Endpoint: PUT /pcrm/v1/oportunidades-negocio/{idReg} — body VoOportunidadNegocio.',
      '',
      'El parámetro `idReg` es el identificador opaco de freematica_list_oportunidades_negocio.',
      'Solo se envían los campos que se quieren modificar; los demás se ignoran.',
      'Devuelve el registro actualizado.',
    ].join('\n'),
    UpdateOportunidadShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const { idReg, ...rest } = args as { idReg: string } & OportunidadFields;
        const body = buildOportunidadBody(rest);
        const result = await client.updateOportunidadNegocioV1(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_oportunidad_negocio
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_oportunidad_negocio',
    [
      'Actualiza una oportunidad de negocio existente (v2).',
      '',
      'Endpoint: PUT /pcrm/v2/oportunidades-negocio/{idReg} — body VoOportunidadNegocio.',
      '',
      'El parámetro `idReg` es el identificador opaco de freematica_list_oportunidades_negocio.',
      'Solo se envían los campos que se quieren modificar; los demás se ignoran.',
      'Devuelve el registro actualizado.',
    ].join('\n'),
    UpdateOportunidadShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const { idReg, ...rest } = args as { idReg: string } & OportunidadFields;
        const body = buildOportunidadBody(rest);
        const result = await client.updateOportunidadNegocio(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_oportunidad_negocio_datos_ampliados
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_oportunidad_negocio_datos_ampliados',
    [
      'Actualiza los datos ampliados de una oportunidad de negocio.',
      '',
      'Endpoint: PUT /pcrm/v2/oportunidades-negocio/{idReg}/datos-ampliados — body VoContenidoVariableOpor.',
      '',
      'El parámetro `idReg` es el identificador opaco de freematica_list_oportunidades_negocio.',
      'COVR_TIPO_RESP define el tipo de respuesta: 0=lista, 1=Sí/No, 2=Texto, 3=PDF Base64, 4=Numérico, 5=Fecha.',
      'Solo proporciona el campo de valor correspondiente al tipo seleccionado.',
      'Devuelve el registro actualizado.',
    ].join('\n'),
    UpdateOportunidadDatosAmpladosShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const { idReg, ...rest } = args as UpdateOportunidadDatosAmpladosFields;
        const body = buildDatosAmpladosBody({ idReg, ...rest });
        const result = await client.updateOportunidadNegocioDatosAmpliados(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
