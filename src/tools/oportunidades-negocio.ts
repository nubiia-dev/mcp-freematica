import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_oportunidades_negocio';
const GET_TOOL_NAME = 'freematica_get_oportunidad_negocio';
const AMP_TOOL_NAME = 'freematica_get_oportunidad_negocio_datos_ampliados';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de oportunidades de negocio (CRM).',
  '',
  'Cada item tiene ~33 campos: COD_CLI (id del cliente), COD_ESTADO_OPOR, COD_ETAPA_OPOR, NOMBRE, VALOR, ID_OPORTUNIDAD, FECHA, FECHA_CREACION, USU_ASIGNADO, etc. Más `idReg` opaco para el endpoint singular.',
  '',
  'Paginación 1-indexed.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle de una oportunidad de negocio.',
  '',
  'El parámetro `id` DEBE ser el `idReg` opaco que aparece en los items de freematica_list_oportunidades_negocio.',
].join('\n');

const AMP_DESCRIPTION = [
  'Devuelve los datos ampliados de una oportunidad de negocio.',
  '',
  'NOTA: Este endpoint puede devolver `not_found` si la oportunidad no tiene datos ampliados configurados. Es un caso esperado, no un error de software — explicarle al usuario que esa oportunidad no tiene info adicional.',
  '',
  'El parámetro `id` DEBE ser el `idReg` opaco (mismo que en get_oportunidad_negocio).',
].join('\n');

const IdSchema = {
  id: z
    .string()
    .min(1)
    .describe(
      'idReg opaco de la oportunidad (campo "idReg" en los items de freematica_list_oportunidades_negocio).',
    ),
};

export function registerOportunidadesNegocioTools(
  server: McpServer,
  client: FreematicaClient,
): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listOportunidadesNegocio({ page, items });
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
    IdSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const opo = await client.getOportunidadNegocio(id);
        return ok(opo) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    AMP_TOOL_NAME,
    AMP_DESCRIPTION,
    IdSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const datos = await client.getOportunidadNegocioDatosAmpliados(id);
        return ok(datos) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
