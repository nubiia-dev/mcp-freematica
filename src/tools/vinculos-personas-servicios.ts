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

const LIST_TOOL_NAME = 'freematica_list_vinculos_personas_servicios';
const GET_TOOL_NAME = 'freematica_get_vinculo_persona_servicio';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de vínculos entre personas y servicios.',
  'Permite resolver la relación centro/servicio → trabajador, clave para la integración CAE.',
  '',
  'Endpoint: GET /pvss/v2/vinculos-personas-servicios.',
  'Cada item contiene los campos de asignación de la persona al servicio.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle de un vínculo persona-servicio por su idReg opaco.',
  '',
  'Endpoint: GET /pvss/v2/vinculos-personas-servicios/{idreg}.',
].join('\n');

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ListVinculosSchema = {
  ...PaginationSchema,
  order: z
    .string()
    .min(1)
    .optional()
    .describe('Orden de los registros. Ejemplo: "CAMPO asc".'),
};

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del dominio Vínculos Personas↔Servicios.
 *
 * Tools expuestas:
 *  1. freematica_list_vinculos_personas_servicios  — lista paginada
 *  2. freematica_get_vinculo_persona_servicio      — detalle por idReg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerVinculosPersonasServiciosTools(
  server: McpServer,
  client: FreematicaClient,
): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_vinculos_personas_servicios
  // -------------------------------------------------------------------------
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    ListVinculosSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, order }): Promise<CallToolResult> => {
      try {
        const result = await client.listVinculosPersonasServicios({ page, items, order });
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
  // 2. freematica_get_vinculo_persona_servicio
  // -------------------------------------------------------------------------
  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      idReg: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del vínculo persona-servicio (campo "idReg" en los items de freematica_list_vinculos_personas_servicios).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const item = await client.getVinculoPersonaServicio(idReg);
        return ok(item) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
