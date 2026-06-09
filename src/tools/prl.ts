import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList } from './helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const FICHA_TOOL_NAME = 'freematica_get_ficha_prev_cliente';
const LIST_VS_TOOL_NAME = 'freematica_list_vigilancia_salud';
const GET_VS_TOOL_NAME = 'freematica_get_vigilancia_salud';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const FICHA_DESCRIPTION = [
  'Devuelve la ficha de Prevención de Riesgos Laborales (PRL) de un cliente.',
  '',
  'Endpoint: GET /pprl/v2/ficha-prev-cliente',
  '',
  'Los filtros se envían como query params nativos (NO FIQL). Al menos uno de los',
  'cuatro identificadores es obligatorio: codCliente, grupoCliente,',
  'codLocalizacionServicio o codigoFicha. Si se pasan varios se combinan con AND.',
  '',
  'IMPORTANTE: si no se pasa ningún identificador, la tool devuelve un error de',
  'validación sin llamar al API.',
  '',
  'Campos de respuesta principales: COD_CLI, NOMBRE_CLI, COD_GRUPO_CLI,',
  'COD_LOC_SERV, CODIGO_FICHA, FECHA_ALTA, ESTADO, etc.',
].join('\n');

const LIST_VS_DESCRIPTION = [
  'Devuelve la lista paginada de registros de Vigilancia de la Salud.',
  '',
  'Endpoint: GET /pprl/v1/vigilancia-salud',
  '',
  'Permite filtrar por persona (idRegPersona nativo), empresa (PERVS_EMP),',
  'delegación (PERVS_DELEG), código de persona (PERVS_PERSO), tipo de revisión',
  '(PERVS_TIPO_REVISION), resultado (PERVS_RESULTADO) y rango de fecha de cita',
  '(PERVS_FCH_CITA). Los filtros FIQL se combinan con AND.',
  '',
  'Campos principales: PERVS_EMP, PERVS_DELEG, PERVS_PERSO, PERVS_TIPO_REVISION,',
  'PERVS_RESULTADO, PERVS_FCH_CITA, idReg.',
].join('\n');

const GET_VS_DESCRIPTION = [
  'Devuelve el detalle completo de un registro de Vigilancia de la Salud.',
  '',
  'Endpoint: GET /pprl/v1/vigilancia-salud/{idreg}',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece',
  'en los items de freematica_list_vigilancia_salud.',
].join('\n');

// ---------------------------------------------------------------------------
// Schemas (ZodRawShape: plain objects of zod fields, compatible with server.tool)
// ---------------------------------------------------------------------------

/**
 * Shape de Zod para freematica_get_ficha_prev_cliente.
 *
 * El MCP SDK requiere un ZodRawShape (objeto plano de esquemas Zod), no un
 * ZodObject ni ZodEffects. La validación "al menos uno requerido" se ejecuta
 * dentro del handler mediante `FichaPrevClienteRefinedSchema.safeParse()`.
 *
 * Campos:
 *  - codCliente              → query param codCli  (string)
 *  - grupoCliente            → query param grpCli  (number, máx. 2 dígitos)
 *  - codLocalizacionServicio → query param locServ (number, máx. 5 dígitos)
 *  - codigoFicha             → query param codigo  (string)
 */
const FichaPrevClienteShape = {
  codCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del cliente (query param codCli). Opcional: al menos uno requerido.'),
  grupoCliente: z
    .number()
    .int()
    .min(1)
    .max(99)
    .optional()
    .describe('Código de grupo de clientes (query param grpCli, máx. 2 dígitos). Opcional: al menos uno requerido.'),
  codLocalizacionServicio: z
    .number()
    .int()
    .min(1)
    .max(99999)
    .optional()
    .describe('Código de localización de servicio (query param locServ, máx. 5 dígitos). Opcional: al menos uno requerido.'),
  codigoFicha: z
    .string()
    .min(1)
    .optional()
    .describe('Código de ficha PRL (query param codigo). Opcional: al menos uno requerido.'),
};

/**
 * Schema Zod con `.refine()` para validar "al menos uno de los 4 identificadores".
 *
 * Se usa en los tests y dentro del handler. NO se pasa directamente a server.tool
 * porque ZodEffects no es ZodRawShapeCompat.
 */
export const FichaPrevClienteRefinedSchema = z
  .object(FichaPrevClienteShape)
  .refine(
    (v) =>
      v.codCliente !== undefined ||
      v.grupoCliente !== undefined ||
      v.codLocalizacionServicio !== undefined ||
      v.codigoFicha !== undefined,
    {
      message:
        'Se requiere al menos un identificador: codCliente, grupoCliente, codLocalizacionServicio o codigoFicha. ' +
        'Llamar sin ningún filtro devolvería el dataset completo.',
    },
  );

/** Schema para freematica_list_vigilancia_salud. */
const ListVigilanciaSaludShape = {
  ...PaginationSchema,
  idRegPersona: z
    .string()
    .min(1)
    .optional()
    .describe(
      'idReg opaco de la persona (query param nativo del API, no FIQL). Filtra registros de una persona concreta.',
    ),
  empresa: z
    .string()
    .min(1)
    .optional()
    .describe('Código de empresa (campo PERVS_EMP en Freemática).'),
  delegacion: z
    .string()
    .min(1)
    .optional()
    .describe('Código de delegación (campo PERVS_DELEG en Freemática).'),
  codPersona: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural de la persona (campo PERVS_PERSO en Freemática).'),
  tipoRevision: z
    .string()
    .min(1)
    .optional()
    .describe('Tipo de revisión médica (campo PERVS_TIPO_REVISION en Freemática).'),
  resultado: z
    .string()
    .min(1)
    .optional()
    .describe('Resultado de la revisión (campo PERVS_RESULTADO en Freemática).'),
  fechaCitaDesde: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/,
      'Debe ser una fecha ISO 8601 (YYYY-MM-DD)',
    )
    .optional()
    .describe('Fecha inicio del rango de cita (campo PERVS_FCH_CITA, ISO 8601, inclusive).'),
  fechaCitaHasta: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/,
      'Debe ser una fecha ISO 8601 (YYYY-MM-DD)',
    )
    .optional()
    .describe('Fecha fin del rango de cita (campo PERVS_FCH_CITA, ISO 8601, inclusive).'),
};

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del dominio PRL (Prevención de Riesgos Laborales).
 *
 * Tools expuestas:
 *  1. freematica_get_ficha_prev_cliente  — ficha PRL de un cliente
 *  2. freematica_list_vigilancia_salud   — lista paginada de VS con filtros
 *  3. freematica_get_vigilancia_salud    — detalle de un registro VS por idReg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerPrlTools(server: McpServer, client: FreematicaClient): void {
  // -------------------------------------------------------------------------
  // 1. freematica_get_ficha_prev_cliente
  // -------------------------------------------------------------------------
  server.tool(
    FICHA_TOOL_NAME,
    FICHA_DESCRIPTION,
    FichaPrevClienteShape,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ codCliente, grupoCliente, codLocalizacionServicio, codigoFicha }): Promise<CallToolResult> => {
      // Validación "al menos uno requerido" — previene llamadas sin filtro que
      // devolverían el dataset completo (potencialmente miles de registros).
      const validation = FichaPrevClienteRefinedSchema.safeParse({
        codCliente,
        grupoCliente,
        codLocalizacionServicio,
        codigoFicha,
      });
      if (!validation.success) {
        const msg = validation.error.errors.map((e) => e.message).join('; ');
        return error(new Error(msg)) as CallToolResult;
      }

      try {
        const result = await client.getFichaPrevCliente({
          codCliente,
          grupoCliente,
          codLocalizacionServicio,
          codigoFicha,
        });
        return okList({ items: result.items, total: result.total }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_list_vigilancia_salud
  // -------------------------------------------------------------------------
  server.tool(
    LIST_VS_TOOL_NAME,
    LIST_VS_DESCRIPTION,
    ListVigilanciaSaludShape,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      page,
      items,
      idRegPersona,
      empresa,
      delegacion,
      codPersona,
      tipoRevision,
      resultado,
      fechaCitaDesde,
      fechaCitaHasta,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.listVigilanciaSalud({
          page,
          items,
          idRegPersona,
          empresa,
          delegacion,
          codPersona,
          tipoRevision,
          resultado,
          fechaCitaDesde,
          fechaCitaHasta,
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_get_vigilancia_salud
  // -------------------------------------------------------------------------
  server.tool(
    GET_VS_TOOL_NAME,
    GET_VS_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del registro de vigilancia de la salud (campo "idReg" en los items de freematica_list_vigilancia_salud).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const vs = await client.getVigilanciaSalud(id);
        return ok(vs) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
