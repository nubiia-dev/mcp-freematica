import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreatePemfMarcajeShape,
  CreatePemfMarcajeFechaPersonaShape,
  buildPemfMarcajeBody,
  buildPemfMarcajeFechaPersonaBody,
  type PemfMarcajeFields,
  type PemfMarcajeFechaPersonaFields,
} from '../../schemas/pemf.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

export function registerPemfMarcajesTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // ---------------------------------------------------------------------------
  // GET /pemf/v2/marcajes — lista de marcajes e-Movifree (v2)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_marcajes',
    [
      'Lista paginada de marcajes de campo e-Movifree (v2).',
      '',
      'Endpoint: GET /pemf/v2/marcajes',
      '',
      'Marcajes de entrada/salida/novedad del personal de campo (operarios de seguridad).',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfMarcajes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v2/marcajes/:idReg — detalle de un marcaje (v2)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_get_pemf_marcaje',
    [
      'Detalle de un marcaje de campo e-Movifree por idReg (v2).',
      '',
      'Endpoint: GET /pemf/v2/marcajes/{idReg}',
      '',
      'El parámetro `idReg` debe ser el campo `idReg` de freematica_list_pemf_marcajes.',
    ].join('\n'),
    { idReg: z.string().min(1).describe('idReg opaco del marcaje (campo idReg de freematica_list_pemf_marcajes).') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getPemfMarcaje(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/tracking — marcajes de seguimiento (v1)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_tracking',
    [
      'Lista paginada de marcajes de tracking e-Movifree (v1).',
      '',
      'Endpoint: GET /pemf/v1/tracking',
      '',
      'Marcajes de seguimiento de operarios de campo (versión v1 del endpoint de tracking).',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfTracking({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/calls — marcajes CCR (llamadas fijas)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_calls',
    [
      'Lista paginada de marcajes CCR (llamadas fijas) de e-Movifree.',
      '',
      'Endpoint: GET /pemf/v1/calls',
      '',
      'Marcajes realizados mediante llamada telefónica fija (CCR legacy).',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfCalls({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/geoposition — geoposición de operarios (v1)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_geoposition',
    [
      'Lista paginada de marcajes de geoposición e-Movifree (v1).',
      '',
      'Endpoint: GET /pemf/v1/geoposition',
      '',
      'Posiciones GPS de los operarios de campo registradas desde la app e-Movifree.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfGeoposition({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v2/geoposition — geoposición de operarios (v2)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_geoposition_v2',
    [
      'Lista paginada de marcajes de geoposición e-Movifree (v2).',
      '',
      'Endpoint: GET /pemf/v2/geoposition',
      '',
      'Versión v2 de las posiciones GPS de los operarios de campo.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfGeopositionV2({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v2/cna — Control de Novedades Activo
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_cna',
    [
      'Lista paginada de novedades activas e-Movifree (CNA — Control Novedades Activo).',
      '',
      'Endpoint: GET /pemf/v2/cna',
      '',
      'Novedades activas de los operarios de campo en el momento actual.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfCna({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // ---------------------------------------------------------------------------
  // POST /pemf/v1/servicio/:idservicio/crear-marcaje — grabar marcaje por servicio
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_create_pemf_marcaje',
    [
      'Graba un marcaje de campo en e-Movifree para un servicio específico.',
      '',
      'Endpoint: POST /pemf/v1/servicio/{idservicio}/crear-marcaje',
      '',
      'Registra un nuevo marcaje (entrada, salida, novedad, posición, etc.) del personal de campo.',
      'El parámetro `idServicio` es el identificador del servicio en e-Movifree.',
    ].join('\n'),
    {
      idServicio: z.string().min(1).describe('Identificador del servicio en e-Movifree (idServicio).'),
      ...CreatePemfMarcajeShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ idServicio, ...rest }): Promise<CallToolResult> => {
      try {
        const body = buildPemfMarcajeBody(rest as PemfMarcajeFields);
        const result = await client.createPemfMarcaje(idServicio, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // POST /pemf/v2/marcaje-fechapersona — grabar marcaje por fecha y persona
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_create_pemf_marcaje_fecha_persona',
    [
      'Graba un marcaje de campo e-Movifree identificando al operario por fecha y tag de persona.',
      '',
      'Endpoint: POST /pemf/v2/marcaje-fechapersona',
      '',
      'Alternativa a crear-marcaje cuando se identifica al operario por personTag y fecha en lugar de idServicio.',
    ].join('\n'),
    { ...CreatePemfMarcajeFechaPersonaShape },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildPemfMarcajeFechaPersonaBody(args as PemfMarcajeFechaPersonaFields);
        const result = await client.createPemfMarcajeFechaPersona(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
