import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

/**
 * Registra las tools MCP del dominio PETT (ETT — Empresas de Trabajo Temporal).
 *
 * Tools de lectura (siempre activas):
 *  1. freematica_list_pett_peticiones_serv         → GET /pett/v2/peticiones-serv
 *  2. freematica_list_pett_peticiones_serv_perso   → GET /pett/v2/peticiones-serv-perso
 *  3. freematica_list_pett_ofertas                 → GET /pett/v2/ofertas
 *  4. freematica_list_pett_partes_ett_c            → GET /pett/v1/partes_ett_c
 *
 * Tools de escritura (requieren enableWrites=true):
 *  5.  freematica_create_pett_peticion_serv                → POST /pett/v2/peticiones-serv
 *  6.  freematica_create_pett_peticion_serv_perso          → POST /pett/v2/peticiones-serv/perso
 *  7.  freematica_update_pett_peticion_serv                → PUT  /pett/v2/peticiones-serv/:idreg
 *  8.  freematica_update_pett_peticion_serv_perso_estado   → PUT  /pett/v2/peticiones-serv/perso/estado/:idreg
 *  9.  freematica_update_pett_peticion_serv_duplicar       → PUT  /pett/v2/peticiones-serv/duplicar/:idreg
 *  10. freematica_create_pett_gestion_partes_ett_c         → POST /pett/v1/gestion_partes_ett_c
 *  11. freematica_update_pett_proceso_servicio_fin         → PUT  /pett/v2/procesos_servicio_fin/:idreg
 *  12. freematica_update_pett_proceso_servicio             → PUT  /pett/v2/procesos-servicio/:idreg
 *  13. freematica_update_pett_proceso_servicio_prorroga    → PUT  /pett/v2/procesos-servicio-prorrogas/:idreg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro.
 */
export function registerPettTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_pett_peticiones_serv
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pett_peticiones_serv',
    'Lista paginada de peticiones de servicio ETT.\n\nEndpoint: GET /pett/v2/peticiones-serv',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPettPeticionesServ({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_list_pett_peticiones_serv_perso
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pett_peticiones_serv_perso',
    'Lista paginada de peticiones de servicio ETT (vista personal).\n\nEndpoint: GET /pett/v2/peticiones-serv-perso',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPettPeticionesServPerso({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_list_pett_ofertas
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pett_ofertas',
    'Lista paginada de ofertas ETT.\n\nEndpoint: GET /pett/v2/ofertas',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPettOfertas({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_list_pett_partes_ett_c
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pett_partes_ett_c',
    'Lista paginada de partes ETT (cabecera).\n\nEndpoint: GET /pett/v1/partes_ett_c',
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPettPartesEttC({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 5. freematica_create_pett_peticion_serv
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_pett_peticion_serv',
    'Crea una petición de servicio ETT.\n\nEndpoint: POST /pett/v2/peticiones-serv',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos de la petición de servicio (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPettPeticionServ(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 6. freematica_create_pett_peticion_serv_perso
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_pett_peticion_serv_perso',
    'Crea una petición de servicio ETT (vista personal).\n\nEndpoint: POST /pett/v2/peticiones-serv/perso',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos de la petición (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPettPeticionServPerso(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 7. freematica_update_pett_peticion_serv
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pett_peticion_serv',
    'Actualiza una petición de servicio ETT.\n\nEndpoint: PUT /pett/v2/peticiones-serv/:idreg',
    {
      idReg: z.string().min(1).describe('idReg opaco de la petición de servicio.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos a actualizar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePettPeticionServ(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 8. freematica_update_pett_peticion_serv_perso_estado
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pett_peticion_serv_perso_estado',
    'Actualiza el estado de una petición de servicio ETT (vista personal).\n\nEndpoint: PUT /pett/v2/peticiones-serv/perso/estado/:idreg',
    {
      idReg: z.string().min(1).describe('idReg opaco de la petición de servicio.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos de estado a actualizar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePettPeticionServPersoEstado(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 9. freematica_update_pett_peticion_serv_duplicar
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pett_peticion_serv_duplicar',
    'Duplica una petición de servicio ETT.\n\nEndpoint: PUT /pett/v2/peticiones-serv/duplicar/:idreg',
    {
      idReg: z.string().min(1).describe('idReg opaco de la petición de servicio a duplicar.'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.updatePettPeticionServDuplicar(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 10. freematica_create_pett_gestion_partes_ett_c
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_pett_gestion_partes_ett_c',
    'Gestiona partes ETT (cabecera).\n\nEndpoint: POST /pett/v1/gestion_partes_ett_c',
    {
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos del parte ETT (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPettGestionPartesEttC(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 11. freematica_update_pett_proceso_servicio_fin
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pett_proceso_servicio_fin',
    'Finaliza el proceso de servicio de una petición ETT.\n\nEndpoint: PUT /pett/v2/procesos_servicio_fin/:idreg',
    {
      idReg: z.string().min(1).describe('idReg opaco del proceso de servicio.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos a actualizar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePettProcesoServicioFin(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 12. freematica_update_pett_proceso_servicio
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pett_proceso_servicio',
    'Actualiza el proceso de servicio de una petición ETT.\n\nEndpoint: PUT /pett/v2/procesos-servicio/:idreg',
    {
      idReg: z.string().min(1).describe('idReg opaco del proceso de servicio.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos a actualizar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePettProcesoServicio(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 13. freematica_update_pett_proceso_servicio_prorroga
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_pett_proceso_servicio_prorroga',
    'Actualiza la prórroga del proceso de servicio de una petición ETT.\n\nEndpoint: PUT /pett/v2/procesos-servicio-prorrogas/:idreg',
    {
      idReg: z.string().min(1).describe('idReg opaco del proceso de servicio.'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos de prórroga a actualizar (ver docs Freemática).'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePettProcesoServicioProrroga(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
