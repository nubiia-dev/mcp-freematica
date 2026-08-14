import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const LIST_CUENTAS_CONTABLES_TOOL = 'freematica_list_cuentas_contables';
const LIST_CUENTAS_ANALITICAS_TOOL = 'freematica_list_cuentas_analiticas';
const EXPORT_ASIENTOS_TOOL = 'freematica_export_asientos';
const IMPORT_ASIENTOS_TOOL = 'freematica_import_asientos';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const LIST_CUENTAS_CONTABLES_DESCRIPTION = [
  'Devuelve el plan de cuentas contables de Freemática.',
  '',
  'Endpoint: GET /pcon/v2/cuentas.',
  'Devuelve los registros del catálogo de cuentas del Plan Contable (COD_CTA, COD_PLAN, COD_GRUPO_CTA, CTA_ACTIVA, NOMBRE_CTA, etc.).',
  '',
  'Filtros FIQL disponibles:',
  '  - codPlan: filtra por código de plan contable (COD_PLAN).',
  '  - prefijoCuenta: filtra cuentas cuyo COD_CTA comienza por el prefijo indicado (prefijo match).',
  '  - activa: si true, devuelve solo cuentas activas (CTA_ACTIVA==1); si false, solo inactivas.',
  '  - grupoCuenta: filtra por código de grupo de cuenta (COD_GRUPO_CTA).',
  '',
  'Los filtros se combinan con AND. Todos son opcionales.',
].join('\n');

const LIST_CUENTAS_ANALITICAS_DESCRIPTION = [
  'Devuelve el catálogo de cuentas analíticas de Freemática.',
  '',
  'Endpoint: GET /pcon/v2/cuentas-analiticas.',
  'Devuelve los registros de cuentas analíticas (COD_CTA_ANL, COD_PLAN, COD_GRUPO_ANL, CTA_ACTIVA_ANL, AREA_ANL, DELEG, etc.).',
  '',
  'Filtros FIQL disponibles:',
  '  - codPlan: filtra por código de plan (COD_PLAN).',
  '  - prefijoCuenta: filtra cuentas cuyo COD_CTA_ANL comienza por el prefijo indicado.',
  '  - activa: si true, solo cuentas activas (CTA_ACTIVA_ANL==1); si false, solo inactivas.',
  '  - grupoCuenta: filtra por código de grupo analítico (COD_GRUPO_ANL).',
  '  - area: filtra por área analítica (AREA_ANL).',
  '  - delegacion: filtra por delegación (DELEG).',
  '',
  'Los filtros se combinan con AND. Todos son opcionales.',
].join('\n');

const EXPORT_ASIENTOS_DESCRIPTION = [
  'Exporta asientos contables de Freemática en batch.',
  '',
  'Endpoint: GET /pcon/v2/export-asientos.',
  '',
  '⚠️ AVISO: Este endpoint puede devolver volúmenes MUY GRANDES de datos.',
  'Acota siempre con `periodo` o con UNA fecha (fechaDesde O fechaHasta —',
  'son excluyentes: el API devuelve 0 filas si se combinan ambas).',
  '',
  'Parámetros obligatorios:',
  '  - empresa: código de empresa de 4 caracteres exactos (ej. "0001").',
  '  - cal: código de calendario/ejercicio contable de 4 caracteres exactos (ej. "2025").',
  '',
  'Parámetros opcionales nativos (query param directo, no FIQL):',
  '  - periodo: número de periodo contable (1-12, puede tener ceros, ej. "01").',
  '',
  'Filtros FIQL adicionales (opcionales):',
  '  - fechaDesde O fechaHasta (excluyentes): límite de fecha sobre ASI_FCHASI, YYYY-MM-DD.',
  '  - diario: código del diario contable (ASI_DIARIO).',
  '  - borrador: si true, incluye solo asientos borrador (ASI_BORR no nulo).',
  '',
  'Protección de tamaño: si la respuesta supera FREEMATICA_MAX_RESPONSE_SIZE_MB (default 10 MB),',
  'la tool devuelve los datos truncados con un campo "warning" indicando el truncado.',
  'Se recomienda usar rangos de fecha cortos (máx. 1 mes) para evitar truncados.',
].join('\n');

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

/**
 * Schema de filtros para freematica_list_cuentas_contables.
 */
const CuentasContablesFiltersSchema = {
  codPlan: z
    .string()
    .min(1)
    .optional()
    .describe('Código del plan contable (COD_PLAN en Freemática). Opcional.'),
  prefijoCuenta: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Prefijo del código de cuenta (COD_CTA). La tool aplica prefix match (COD_CTA starts-with). Opcional.',
    ),
  activa: z
    .boolean()
    .optional()
    .describe(
      'Si true, devuelve solo cuentas activas (CTA_ACTIVA==1). Si false, solo inactivas. Omitir para todas.',
    ),
  grupoCuenta: z
    .string()
    .min(1)
    .optional()
    .describe('Código de grupo de cuenta (COD_GRUPO_CTA). Opcional.'),
};

/**
 * Schema de filtros para freematica_list_cuentas_analiticas.
 */
const CuentasAnaliticasFiltersSchema = {
  codPlan: z
    .string()
    .min(1)
    .optional()
    .describe('Código del plan contable (COD_PLAN). Opcional.'),
  prefijoCuenta: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Prefijo del código de cuenta analítica (COD_CTA_ANL). Prefix match. Opcional.',
    ),
  activa: z
    .boolean()
    .optional()
    .describe(
      'Si true, solo cuentas activas (CTA_ACTIVA_ANL==1). Si false, solo inactivas. Omitir para todas.',
    ),
  grupoCuenta: z
    .string()
    .min(1)
    .optional()
    .describe('Código de grupo analítico (COD_GRUPO_ANL). Opcional.'),
  area: z
    .string()
    .min(1)
    .optional()
    .describe('Área analítica (AREA_ANL). Opcional.'),
  delegacion: z
    .string()
    .min(1)
    .optional()
    .describe('Código de delegación (DELEG). Opcional.'),
};

/**
 * Schema de input para freematica_export_asientos.
 *
 * - empresa y cal son obligatorios (4 chars exactos), se envían como query params nativos.
 * - periodo es opcional (hasta 2 chars) y también es query param nativo.
 * - fechaDesde/Hasta, diario, borrador son filtros FIQL opcionales.
 */
const ExportAsientosSchema = {
  empresa: z
    .string()
    .length(4)
    .describe(
      'Código de empresa (4 caracteres exactos, ej. "0001"). OBLIGATORIO. Se envía como query param nativo.',
    ),
  cal: z
    .string()
    .length(4)
    .describe(
      'Código de calendario/ejercicio contable (4 caracteres exactos, ej. "2025" — ver freematica_list_calendarios, campo COD_CALEN_EJER). OBLIGATORIO. Se envía como query param nativo.',
    ),
  periodo: z
    .string()
    .max(2)
    .optional()
    .describe(
      'Número de periodo contable (máx. 2 chars, ej. "01" para enero). Opcional. Se envía como query param nativo.',
    ),
  fechaDesde: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato YYYY-MM-DD',
    )
    .optional()
    .describe(
      'Fecha inicio (inclusive) sobre ASI_FCHASI, YYYY-MM-DD. EXCLUYENTE con fechaHasta: usa solo uno de los dos (limitación del API).',
    ),
  fechaHasta: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato YYYY-MM-DD',
    )
    .optional()
    .describe(
      'Fecha fin (inclusive) sobre ASI_FCHASI, YYYY-MM-DD. EXCLUYENTE con fechaDesde: usa solo uno de los dos (limitación del API).',
    ),
  diario: z
    .string()
    .min(1)
    .optional()
    .describe('Código del diario contable (ASI_DIARIO). Opcional.'),
  borrador: z
    .boolean()
    .optional()
    .describe(
      'Si true, incluye solo asientos en estado borrador (ASI_BORR no nulo). Si false, solo asientos definitivos. Omitir para todos.',
    ),
};

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools de contabilidad en el MCP server.
 *
 * Tools registradas (lectura):
 * - freematica_list_cuentas_contables  → GET /pcon/v2/cuentas
 * - freematica_list_cuentas_analiticas → GET /pcon/v2/cuentas-analiticas
 * - freematica_export_asientos          → GET /pcon/v2/export-asientos
 *
 * Tools registradas (escritura, enableWrites=true):
 * - freematica_import_asientos          → POST /pcon/v2/import-asientos
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente tipado de Freemática.
 * @param opts   - Opciones de registro (enableWrites activa tools de escritura).
 */
export function registerContabilidadTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // freematica_list_cuentas_contables
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CUENTAS_CONTABLES_TOOL,
    LIST_CUENTAS_CONTABLES_DESCRIPTION,
    CuentasContablesFiltersSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ codPlan, prefijoCuenta, activa, grupoCuenta }): Promise<CallToolResult> => {
      try {
        const result = await client.listCuentasContables({
          codPlan,
          prefijoCuenta,
          activa,
          grupoCuenta,
        });
        return okList({ items: result.items, total: result.total }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_cuentas_analiticas
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CUENTAS_ANALITICAS_TOOL,
    LIST_CUENTAS_ANALITICAS_DESCRIPTION,
    CuentasAnaliticasFiltersSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ codPlan, prefijoCuenta, activa, grupoCuenta, area, delegacion }): Promise<CallToolResult> => {
      try {
        const result = await client.listCuentasAnaliticas({
          codPlan,
          prefijoCuenta,
          activa,
          grupoCuenta,
          area,
          delegacion,
        });
        return okList({ items: result.items, total: result.total }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_export_asientos
  // -------------------------------------------------------------------------
  server.tool(
    EXPORT_ASIENTOS_TOOL,
    EXPORT_ASIENTOS_DESCRIPTION,
    ExportAsientosSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      empresa,
      cal,
      periodo,
      fechaDesde,
      fechaHasta,
      diario,
      borrador,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.exportAsientos({
          empresa,
          cal,
          periodo,
          fechaDesde,
          fechaHasta,
          diario,
          borrador,
        });

        if (result.truncated) {
          // Respuesta truncada por exceder MAX_RESPONSE_SIZE_MB
          const payload = {
            items: result.items,
            count: result.items.length,
            total: result.total,
            warning: result.warning,
            truncated: true,
          };
          return ok(payload) as CallToolResult;
        }

        return okList({ items: result.items, total: result.total }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // =========================================================================
  // ESCRITURAS (requieren enableWrites: true)
  // =========================================================================

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // freematica_import_asientos
  // -------------------------------------------------------------------------

  server.tool(
    IMPORT_ASIENTOS_TOOL,
    [
      'Importa asientos contables en Freemática.',
      '',
      'Endpoint: POST /pcon/v2/import-asientos.',
      '',
      'Campos BORR_* para la cabecera del asiento. El campo LINEAS acepta',
      'el array de líneas del asiento.',
    ].join('\n'),
    {
      BORR_CODEMP: z.string().optional().describe('Empresa'),
      BORR_COD: z.string().optional().describe('Código'),
      BORR_PLANT: z.string().optional().describe('Plantilla'),
      BORR_FCHASI: z.string().optional().describe('Fecha asiento (ISO)'),
      BORR_CALEN: z.string().optional().describe('Calendario'),
      BORR_PER: z.number().int().optional().describe('Período'),
      BORR_DIARIO: z.string().optional().describe('Diario'),
      BORR_REF: z.string().optional().describe('Referencia'),
      BORR_CODDIV: z.string().optional().describe('Código divisa'),
      BORR_TCAMB: z.string().optional().describe('Tipo cambio'),
      BORR_VCAMB: z.number().optional().describe('Valor cambio'),
      BORR_NUMARCH: z.number().int().optional().describe('Número archivo'),
      LINEAS: z.unknown().optional().describe('Líneas del asiento (array o null)'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async (args): Promise<CallToolResult> => {
      try {
        const result = await client.importAsientos(args as Record<string, unknown>);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
