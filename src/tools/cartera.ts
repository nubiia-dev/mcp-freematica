import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { ListCarteraFiltersSchema } from '../schemas/cartera.js';
import { error, ok, okList } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_cartera_clientes';
const GET_TOOL_NAME = 'freematica_get_cartera_cliente';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de documentos de cartera de clientes (cobros, efectos, impagados).',
  '',
  'Útil para analizar el estado de cobros: deudas pendientes, impagados, vencimientos próximos.',
  '',
  'Cada item contiene ~40 campos: CARCL_CODAUX (código cliente), CARCL_IMPCOB (importe cobrado),',
  'CARCL_IMPPEN (importe pendiente), CARCL_FECDOC (fecha documento), CARCL_FECVCTO (fecha vencimiento),',
  'CARCL_SITCAR (estado: 1=pendiente, 2=cancelado, 3=derivado), CARCL_FECIMPAG (fecha impago, null si no hay)',
  'más un campo `idReg` opaco (base64) para `freematica_get_cartera_cliente`.',
  '',
  'Filtros disponibles:',
  '- empresa, codCliente, grupoCliente, representante, formaPago, modoPago',
  '- fechaDocDesde/Hasta (rango de fecha del documento)',
  '- fechaVencimientoDesde/Hasta (rango de vencimiento)',
  '- estado: "pendiente" | "cancelado" | "derivado"',
  '- soloImpagados: true → solo documentos con impago registrado (CARCL_FECIMPAG no nulo)',
  '- referencia: referencia exacta del documento (CARCL_REFCAR)',
  '',
  'Paginación 1-indexed. Default: page=1, items=20.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle completo de un documento de cartera de clientes.',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en los items de',
  'freematica_list_cartera_clientes. NO usar CARCL_CODAUX ni otro código natural.',
].join('\n');

const IdSchema = {
  id: z
    .string()
    .min(1)
    .describe(
      'idReg opaco del documento de cartera (campo "idReg" en los items de freematica_list_cartera_clientes).',
    ),
};

/**
 * Registra las tools MCP del dominio "Cartera de Clientes".
 *
 * Expone 2 tools:
 * - `freematica_list_cartera_clientes`: listado paginado con filtros FIQL
 * - `freematica_get_cartera_cliente`: detalle por idReg
 *
 * @param server - Instancia MCP donde se registran las tools.
 * @param client - Cliente tipado de Freemática.
 */
export function registerCarteraTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    ListCarteraFiltersSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const result = await client.listCarteraClientes(args);
        return okList({
          items: result.items,
          total: result.total,
          page: args.page,
          itemsPerPage: args.items,
        }) as CallToolResult;
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
        const doc = await client.getCarteraCliente(id);
        return ok(doc) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
