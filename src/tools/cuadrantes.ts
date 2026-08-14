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

const LIST_CAMPOS_ESTADISTICOS = 'freematica_list_campos_estadisticos';
const LIST_INSPECCIONES = 'freematica_list_inspecciones';
const LIST_PLANTILLAS = 'freematica_list_plantillas';
const LIST_NORMAS = 'freematica_list_normas';
const LIST_RUTAS_GESTION = 'freematica_list_rutas_gestion';
const LIST_RUTAS_PLANIFICACION = 'freematica_list_rutas_planificacion';
const LIST_ACOMPANANTE_RUTA = 'freematica_list_acompanante_ruta';
const CREATE_COMPUTO_PERS = 'freematica_create_computo_pers';
const UPDATE_COMPUTO_PERS = 'freematica_update_computo_pers';
const CREATE_COMPUTO_PERS_H = 'freematica_create_computo_pers_h';

const LIST_CUADRANTES = 'freematica_list_cuadrantes';
const LIST_CUADRANTES_DETALLES = 'freematica_list_cuadrantes_detalles';
const LIST_CUADRANTES_OBSERVACIONES = 'freematica_list_cuadrantes_observaciones';
const LIST_CUADRANTES_AUDITORIA = 'freematica_list_cuadrantes_auditoria';
const LIST_CUADRANTES_TAREAS = 'freematica_list_cuadrantes_tareas';
const LIST_COMPUTOS_PERS = 'freematica_list_computos_pers';
const GET_COMPUTOS_PERS = 'freematica_get_computos_pers';
const GET_COMPUTOS_PERS_H = 'freematica_get_computos_pers_h';
const LIST_CIERRE_PERSONAS = 'freematica_list_cuadrantes_cierre_personas';
const GET_CIERRE_PERSONA = 'freematica_get_cuadrante_cierre_persona';
const LIST_CIERRE_COMPLEMENTOS = 'freematica_list_cuadrantes_cierre_personas_complementos';
const GET_CIERRE_COMPLEMENTO = 'freematica_get_cuadrante_cierre_persona_complemento';
const LIST_CIERRE_ESPECIALES = 'freematica_list_cuadrantes_cierre_personas_especiales';
const GET_CIERRE_ESPECIAL = 'freematica_get_cuadrante_cierre_persona_especial';
const LIST_CIERRE_INCIDENCIAS = 'freematica_list_cuadrantes_cierre_personas_incidencias';
const GET_CIERRE_INCIDENCIA = 'freematica_get_cuadrante_cierre_persona_incidencia';

// ---------------------------------------------------------------------------
// Shared schema fragments
// ---------------------------------------------------------------------------

const OrderParam = {
  order: z
    .string()
    .min(1)
    .optional()
    .describe('Orden de los registros. Ejemplo: "CAMPO asc".'),
};

const DesdeParam = {
  desde: z
    .string()
    .optional()
    .describe(
      'Fecha de corte para sincronización incremental (formato YYYY-MM-DD). Si no se informa, devuelve todos los registros.',
    ),
};

const ListCuadrantesSchema = { ...PaginationSchema, ...OrderParam };
const ListCuadrantesAuditoriaSchema = { ...PaginationSchema, ...OrderParam, ...DesdeParam };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeListHandler(
  client: FreematicaClient,
  endpoint: string,
): (args: { page: number; items: number; order?: string; desde?: string }) => Promise<CallToolResult> {
  return async ({ page, items, order, desde }) => {
    try {
      const result = await client.listCuadrantes(endpoint, { page, items, order, desde });
      return okList({
        items: result.items,
        total: result.total,
        page,
        itemsPerPage: items,
      }) as CallToolResult;
    } catch (err) {
      if (err instanceof FreematicaError) return error(err) as CallToolResult;
      return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
    }
  };
}

function makeGetHandler(
  client: FreematicaClient,
  endpoint: string,
): (args: { idReg: string }) => Promise<CallToolResult> {
  return async ({ idReg }) => {
    try {
      const item = await client.getCuadrante(endpoint, idReg);
      return ok(item) as CallToolResult;
    } catch (err) {
      if (err instanceof FreematicaError) return error(err) as CallToolResult;
      return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
    }
  };
}

const idRegParam = (entity: string, listTool: string) => ({
  idReg: z
    .string()
    .min(1)
    .describe(
      `idReg opaco del/de la ${entity} (campo "idReg" en los items de ${listTool}).`,
    ),
});

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del dominio Cuadrantes.
 *
 * Tools expuestas (lectura):
 *  1.  freematica_list_cuadrantes
 *  2.  freematica_list_cuadrantes_detalles
 *  3.  freematica_list_cuadrantes_observaciones
 *  4.  freematica_list_cuadrantes_auditoria
 *  5.  freematica_list_cuadrantes_tareas
 *  6.  freematica_list_computos_pers
 *  7.  freematica_get_computos_pers
 *  8.  freematica_get_computos_pers_h
 *  9.  freematica_list_cuadrantes_cierre_personas
 *  10. freematica_get_cuadrante_cierre_persona
 *  11. freematica_list_cuadrantes_cierre_personas_complementos
 *  12. freematica_get_cuadrante_cierre_persona_complemento
 *  13. freematica_list_cuadrantes_cierre_personas_especiales
 *  14. freematica_get_cuadrante_cierre_persona_especial
 *  15. freematica_list_cuadrantes_cierre_personas_incidencias
 *  16. freematica_get_cuadrante_cierre_persona_incidencia
 *  17. freematica_list_campos_estadisticos
 *  18. freematica_list_inspecciones
 *  19. freematica_list_plantillas
 *  20. freematica_list_normas
 *  21. freematica_list_rutas_gestion
 *  22. freematica_list_rutas_planificacion
 *  23. freematica_list_acompanante_ruta
 *
 * Tools expuestas (escritura, enableWrites=true):
 *  24. freematica_create_computo_pers
 *  25. freematica_update_computo_pers
 *  26. freematica_create_computo_pers_h
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa tools de escritura).
 */
export function registerCuadrantesTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_cuadrantes
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CUADRANTES,
    'Devuelve la lista paginada de cuadrantes de planificación.\n\nEndpoint: GET /pvss/v1/cuadrantes.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/cuadrantes'),
  );

  // -------------------------------------------------------------------------
  // 2. freematica_list_cuadrantes_detalles
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CUADRANTES_DETALLES,
    'Devuelve la lista paginada de líneas de detalle de cuadrantes.\n\nEndpoint: GET /pvss/v1/cuadrantes-detalles.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/cuadrantes-detalles'),
  );

  // -------------------------------------------------------------------------
  // 3. freematica_list_cuadrantes_observaciones
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CUADRANTES_OBSERVACIONES,
    'Devuelve la lista paginada de observaciones asociadas a cuadrantes.\n\nEndpoint: GET /pvss/v1/cuadrantes-observaciones.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/cuadrantes-observaciones'),
  );

  // -------------------------------------------------------------------------
  // 4. freematica_list_cuadrantes_auditoria
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CUADRANTES_AUDITORIA,
    'Devuelve la lista paginada de registros de auditoría de cuadrantes (feed incremental). Usar con `desde` para sincronización incremental.\n\nEndpoint: GET /pvss/v1/cuadrantes-auditoria.',
    ListCuadrantesAuditoriaSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/cuadrantes-auditoria'),
  );

  // -------------------------------------------------------------------------
  // 5. freematica_list_cuadrantes_tareas
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CUADRANTES_TAREAS,
    'Devuelve la lista paginada de tareas de cuadrantes.\n\nEndpoint: GET /pvss/v2/cuadrantes-tareas.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v2/cuadrantes-tareas'),
  );

  // -------------------------------------------------------------------------
  // 6. freematica_list_computos_pers
  // -------------------------------------------------------------------------
  server.tool(
    LIST_COMPUTOS_PERS,
    'Devuelve la lista paginada de cómputos de personas.\n\nEndpoint: GET /pvss/v2/computos-pers.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listComputosPersonas({ page, items });
        return okList({
          items: result.items,
          total: result.total,
          page,
          itemsPerPage: items,
        }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 7. freematica_get_computos_pers
  // -------------------------------------------------------------------------
  server.tool(
    GET_COMPUTOS_PERS,
    'Devuelve el detalle de cómputos de una persona por su idReg opaco.\n\nEndpoint: GET /pvss/v2/computos-pers/{idreg}.',
    idRegParam('cómputo de persona', LIST_COMPUTOS_PERS),
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const item = await client.getComputosPersonas(idReg);
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 8. freematica_get_computos_pers_h
  // -------------------------------------------------------------------------
  server.tool(
    GET_COMPUTOS_PERS_H,
    'Devuelve el detalle de cómputos históricos de una persona por su idReg opaco.\n\nEndpoint: GET /pvss/v2/computos-pers-h/{idreg}.',
    {
      idReg: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del cómputo histórico de persona (campo "idReg" en los items de freematica_list_computos_pers).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const item = await client.getComputosPersonasH(idReg);
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 9 & 10. Cierre personas
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CIERRE_PERSONAS,
    'Devuelve la lista paginada de cierres de cuadrante por persona.\n\nEndpoint: GET /pvss/v1/cuadrantes-cierre-personas.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/cuadrantes-cierre-personas'),
  );

  server.tool(
    GET_CIERRE_PERSONA,
    'Devuelve el detalle de un cierre de cuadrante por persona por su idReg opaco.\n\nEndpoint: GET /pvss/v1/cuadrantes-cierre-personas/{idreg}.',
    idRegParam('cierre de cuadrante de persona', LIST_CIERRE_PERSONAS),
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeGetHandler(client, '/pvss/v1/cuadrantes-cierre-personas'),
  );

  // -------------------------------------------------------------------------
  // 11 & 12. Cierre personas complementos
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CIERRE_COMPLEMENTOS,
    'Devuelve la lista paginada de complementos de cierres de cuadrante por persona.\n\nEndpoint: GET /pvss/v1/cuadrantes-cierre-personas-complementos.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/cuadrantes-cierre-personas-complementos'),
  );

  server.tool(
    GET_CIERRE_COMPLEMENTO,
    'Devuelve el detalle de un complemento de cierre de cuadrante por persona por su idReg opaco.\n\nEndpoint: GET /pvss/v1/cuadrantes-cierre-personas-complementos/{idreg}.',
    idRegParam('complemento de cierre de cuadrante', LIST_CIERRE_COMPLEMENTOS),
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeGetHandler(client, '/pvss/v1/cuadrantes-cierre-personas-complementos'),
  );

  // -------------------------------------------------------------------------
  // 13 & 14. Cierre personas especiales
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CIERRE_ESPECIALES,
    'Devuelve la lista paginada de jornadas especiales de cierres de cuadrante por persona.\n\nEndpoint: GET /pvss/v1/cuadrantes-cierre-personas-especiales.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/cuadrantes-cierre-personas-especiales'),
  );

  server.tool(
    GET_CIERRE_ESPECIAL,
    'Devuelve el detalle de una jornada especial de cierre de cuadrante por persona por su idReg opaco.\n\nEndpoint: GET /pvss/v1/cuadrantes-cierre-personas-especiales/{idreg}.',
    idRegParam('jornada especial de cierre de cuadrante', LIST_CIERRE_ESPECIALES),
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeGetHandler(client, '/pvss/v1/cuadrantes-cierre-personas-especiales'),
  );

  // -------------------------------------------------------------------------
  // 15 & 16. Cierre personas incidencias
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CIERRE_INCIDENCIAS,
    'Devuelve la lista paginada de incidencias de cierres de cuadrante por persona.\n\nEndpoint: GET /pvss/v1/cuadrantes-cierre-personas-incidencias.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/cuadrantes-cierre-personas-incidencias'),
  );

  server.tool(
    GET_CIERRE_INCIDENCIA,
    'Devuelve el detalle de una incidencia de cierre de cuadrante por persona por su idReg opaco.\n\nEndpoint: GET /pvss/v1/cuadrantes-cierre-personas-incidencias/{idreg}.',
    idRegParam('incidencia de cierre de cuadrante', LIST_CIERRE_INCIDENCIAS),
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeGetHandler(client, '/pvss/v1/cuadrantes-cierre-personas-incidencias'),
  );

  // -------------------------------------------------------------------------
  // 17. freematica_list_campos_estadisticos
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CAMPOS_ESTADISTICOS,
    'Devuelve la lista paginada de campos estadísticos de cuadrantes.\n\nEndpoint: GET /pvss/v2/campos-estadisticos.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v2/campos-estadisticos'),
  );

  // -------------------------------------------------------------------------
  // 18. freematica_list_inspecciones
  // -------------------------------------------------------------------------
  server.tool(
    LIST_INSPECCIONES,
    'Devuelve la lista paginada de inspecciones de cuadrantes.\n\nEndpoint: GET /pvss/v2/inspecciones.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v2/inspecciones'),
  );

  // -------------------------------------------------------------------------
  // 19. freematica_list_plantillas
  // -------------------------------------------------------------------------
  server.tool(
    LIST_PLANTILLAS,
    'Devuelve la lista paginada de plantillas de cuadrantes.\n\nEndpoint: GET /pvss/v2/plantillas.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v2/plantillas'),
  );

  // -------------------------------------------------------------------------
  // 20. freematica_list_normas
  // -------------------------------------------------------------------------
  server.tool(
    LIST_NORMAS,
    'Devuelve la lista paginada de normas de cuadrantes.\n\nEndpoint: GET /pvss/v2/normas.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v2/normas'),
  );

  // -------------------------------------------------------------------------
  // 21. freematica_list_rutas_gestion
  // -------------------------------------------------------------------------
  server.tool(
    LIST_RUTAS_GESTION,
    'Devuelve la lista paginada de rutas de gestión.\n\nEndpoint: GET /pvss/v1/rutas-gestion.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/rutas-gestion'),
  );

  // -------------------------------------------------------------------------
  // 22. freematica_list_rutas_planificacion
  // -------------------------------------------------------------------------
  server.tool(
    LIST_RUTAS_PLANIFICACION,
    'Devuelve la lista paginada de rutas de planificación.\n\nEndpoint: GET /pvss/v1/rutas-planificacion.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v1/rutas-planificacion'),
  );

  // -------------------------------------------------------------------------
  // 23. freematica_list_acompanante_ruta
  // -------------------------------------------------------------------------
  server.tool(
    LIST_ACOMPANANTE_RUTA,
    'Devuelve la lista paginada de acompañantes de ruta.\n\nEndpoint: GET /pvss/v2/acompanante-ruta.',
    ListCuadrantesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeListHandler(client, '/pvss/v2/acompanante-ruta'),
  );

  // =========================================================================
  // ESCRITURAS (requieren enableWrites: true)
  // =========================================================================

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // 24. freematica_create_computo_pers
  // -------------------------------------------------------------------------

  const ComputoPersBodySchema = {
    CONFCP_EMP: z.string().optional().describe('Empresa'),
    CONFCP_DLG: z.string().optional().describe('Delegación'),
    CONFCP_CAL: z.string().optional().describe('Calendario'),
    CONFCP_MES: z.number().int().optional().describe('Mes'),
    CONFCP_PERS: z.string().optional().describe('Código persona'),
    CONFCP_CONTRATO: z.number().int().optional().describe('Contrato'),
    camposAdicionales: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Campos adicionales CONFCP_* para el alta.'),
  };

  server.tool(
    CREATE_COMPUTO_PERS,
    'Crea un cómputo de persona.\n\nEndpoint: POST /pvss/v2/computos-pers.',
    ComputoPersBodySchema,
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async (args): Promise<CallToolResult> => {
      try {
        const { camposAdicionales, ...explicit } = args;
        const body: Record<string, unknown> = { ...explicit, ...(camposAdicionales ?? {}) };
        const result = await client.createComputoPers(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 25. freematica_update_computo_pers
  // -------------------------------------------------------------------------

  server.tool(
    UPDATE_COMPUTO_PERS,
    'Actualiza un cómputo de persona.\n\nEndpoint: PUT /pvss/v2/computos-pers/:idReg.',
    {
      idReg: z.string().min(1).describe('idReg opaco del cómputo de persona.'),
      CONFCP_EMP: z.string().optional().describe('Empresa'),
      CONFCP_DLG: z.string().optional().describe('Delegación'),
      CONFCP_CAL: z.string().optional().describe('Calendario'),
      CONFCP_MES: z.number().int().optional().describe('Mes'),
      CONFCP_PERS: z.string().optional().describe('Código persona'),
      CONFCP_CONTRATO: z.number().int().optional().describe('Contrato'),
      camposAdicionales: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos adicionales CONFCP_* para la actualización.'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async (args): Promise<CallToolResult> => {
      try {
        const { idReg, camposAdicionales, ...explicit } = args;
        const body: Record<string, unknown> = { ...explicit, ...(camposAdicionales ?? {}) };
        const result = await client.updateComputoPers(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 26. freematica_create_computo_pers_h
  // -------------------------------------------------------------------------

  server.tool(
    CREATE_COMPUTO_PERS_H,
    'Crea un cómputo histórico de persona.\n\nEndpoint: POST /pvss/v2/computos-pers-h.',
    {
      CONFCPH_EMP: z.string().optional().describe('Empresa persona'),
      CONFCPH_DLG: z.string().optional().describe('Delegación persona'),
      CONFCPH_CAL: z.string().optional().describe('Calendario detalle'),
      CONFCPH_MES: z.number().int().optional().describe('Mes'),
      CONFCPH_PERS: z.string().optional().describe('Persona detalle'),
      CONFCPH_CONTRATO: z.number().int().optional().describe('Contrato'),
      CONFCPH_ID: z.string().optional().describe('Id'),
      CONFCPH_H_EMP: z.string().optional().describe('Empresa servicio'),
      CONFCPH_H_DELEG: z.string().optional().describe('Delegación servicio'),
      CONFCPH_H_CTRT: z.string().optional().describe('Contrato servicio'),
      CONFCPH_H_SERV: z.string().optional().describe('Servicio'),
      CONFCPH_H_CAL: z.string().optional().describe('Calendario detalle servicio'),
      CONFCPH_H_MES: z.number().int().optional().describe('Mes'),
      CONFCPH_H_TRAMO: z.number().int().optional().describe('Tramo'),
      CONFCPH_H_TURNO: z.number().int().optional().describe('Turno'),
      CONFCPH_H_DIA: z.number().int().optional().describe('Día'),
      CONFCPH_H_HINI: z.string().optional().describe('Horario inicial'),
      CONFCPH_H_HFIN: z.string().optional().describe('Horario final'),
      CONFCPH_H_HTOT: z.number().optional().describe('Total horas'),
      CONFCPH_H_HNOC: z.number().optional().describe('Horas nocturnas'),
      CONFCPH_H_HFES: z.number().optional().describe('Horas festivas'),
      CONFCPH_H_HNOCFES: z.number().optional().describe('Horas nocturnas festivas'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async (args): Promise<CallToolResult> => {
      try {
        const result = await client.createComputoPersH(args as Record<string, unknown>);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
