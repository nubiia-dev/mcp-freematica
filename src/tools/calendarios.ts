import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, okList } from './helpers.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const LIST_CALENDARIOS_TOOL_NAME = 'freematica_list_calendarios';
const LIST_PERIODOS_TOOL_NAME = 'freematica_list_calendario_periodos';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const LIST_CALENDARIOS_DESCRIPTION = [
  'Devuelve la lista paginada de calendarios laborales registrados en Freemática.',
  '',
  'Endpoint: GET /pgrl/v1/calendarios',
  '',
  'Cada item incluye `idReg` opaco que se usa en freematica_list_calendario_periodos',
  'para obtener los periodos de un calendario concreto.',
  '',
  'Soporta paginación estándar (page, items).',
].join('\n');

const LIST_PERIODOS_DESCRIPTION = [
  'Devuelve los periodos de un calendario laboral concreto.',
  '',
  'Endpoint: GET /pgrl/v1/calendarios/{idreg}/periodos',
  '',
  'El parámetro `idCalendario` DEBE ser el campo `idReg` (string opaco base64)',
  'que aparece en los items de freematica_list_calendarios.',
  '',
  'Soporta paginación estándar (page, items).',
].join('\n');

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del dominio Calendarios Laborales.
 *
 * Tools expuestas:
 *  1. freematica_list_calendarios         — lista paginada de calendarios
 *  2. freematica_list_calendario_periodos — periodos de un calendario (idReg)
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerCalendariosTools(server: McpServer, client: FreematicaClient): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_calendarios
  // -------------------------------------------------------------------------
  server.tool(
    LIST_CALENDARIOS_TOOL_NAME,
    LIST_CALENDARIOS_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listCalendarios({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_list_calendario_periodos
  // -------------------------------------------------------------------------
  server.tool(
    LIST_PERIODOS_TOOL_NAME,
    LIST_PERIODOS_DESCRIPTION,
    {
      idCalendario: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del calendario (campo "idReg" en los items de freematica_list_calendarios).',
        ),
      ...PaginationSchema,
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idCalendario, page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listCalendarioPeriodos(idCalendario, { page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
