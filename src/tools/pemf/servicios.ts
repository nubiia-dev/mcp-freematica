import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import { error, ok, okList } from '../helpers.js';

export function registerPemfServiciosTools(
  server: McpServer,
  client: FreematicaClient,
): void {
  // ---------------------------------------------------------------------------
  // GET /pemf/v1/services — lista de servicios de campo
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_services',
    [
      'Lista paginada de servicios de campo e-Movifree.',
      '',
      'Endpoint: GET /pemf/v1/services',
      '',
      'Servicios de seguridad/vigilancia asignados a los operarios de campo.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfServices({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/services/:idService — detalle de un servicio
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_get_pemf_service',
    [
      'Detalle de un servicio de campo e-Movifree por idService.',
      '',
      'Endpoint: GET /pemf/v1/services/{idService}',
      '',
      'El parámetro `idService` debe ser el campo `idReg` de freematica_list_pemf_services.',
    ].join('\n'),
    { idService: z.string().min(1).describe('Identificador del servicio (campo idReg de freematica_list_pemf_services).') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idService }): Promise<CallToolResult> => {
      try {
        const result = await client.getPemfService(idService);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/services/:idService/alarms — alarmas de un servicio
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_service_alarms',
    [
      'Lista de alarmas activas de un servicio de campo e-Movifree.',
      '',
      'Endpoint: GET /pemf/v1/services/{idService}/alarms',
      '',
      'El parámetro `idService` debe ser el campo `idReg` de freematica_list_pemf_services.',
    ].join('\n'),
    { idService: z.string().min(1).describe('Identificador del servicio (campo idReg de freematica_list_pemf_services).') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idService }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfServiceAlarms(idService);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/services/:idService/issues — incidencias de un servicio
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_service_issues',
    [
      'Lista de incidencias de un servicio de campo e-Movifree.',
      '',
      'Endpoint: GET /pemf/v1/services/{idService}/issues',
      '',
      'El parámetro `idService` debe ser el campo `idReg` de freematica_list_pemf_services.',
    ].join('\n'),
    { idService: z.string().min(1).describe('Identificador del servicio (campo idReg de freematica_list_pemf_services).') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idService }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfServiceIssues(idService);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/services/:idService/rounds — rondas de un servicio
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_service_rounds',
    [
      'Lista de rondas de un servicio de campo e-Movifree.',
      '',
      'Endpoint: GET /pemf/v1/services/{idService}/rounds',
      '',
      'El parámetro `idService` debe ser el campo `idReg` de freematica_list_pemf_services.',
    ].join('\n'),
    { idService: z.string().min(1).describe('Identificador del servicio (campo idReg de freematica_list_pemf_services).') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idService }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfServiceRounds(idService);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/services/:idService/jobs — trabajos/tareas de un servicio
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_service_jobs',
    [
      'Lista de trabajos/tareas de un servicio de campo e-Movifree.',
      '',
      'Endpoint: GET /pemf/v1/services/{idService}/jobs',
      '',
      'El parámetro `idService` debe ser el campo `idReg` de freematica_list_pemf_services.',
    ].join('\n'),
    { idService: z.string().min(1).describe('Identificador del servicio (campo idReg de freematica_list_pemf_services).') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idService }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfServiceJobs(idService);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v2/identificadores-servicio — identificadores de servicio
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_identificadores_servicio',
    [
      'Lista paginada de identificadores de servicio e-Movifree.',
      '',
      'Endpoint: GET /pemf/v2/identificadores-servicio',
      '',
      'Tags/códigos de identificación de los servicios de campo (códigos QR, NFC, etc.).',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfIdentificadoresServicio({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v2/routes — lista de rutas
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_rutas',
    [
      'Lista paginada de rutas de campo e-Movifree.',
      '',
      'Endpoint: GET /pemf/v2/routes',
      '',
      'Rutas de trabajo asignadas a los operarios de campo (turnos, frecuencias, horarios).',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfRutas({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
