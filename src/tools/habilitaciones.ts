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

const LIST_SERV_ALTA = 'freematica_list_habilitaciones_servicios_alta';
const LIST_SERV_BAJA = 'freematica_list_habilitaciones_servicios_baja';
const LIST_PERS_ALTA = 'freematica_list_habilitaciones_personal_alta';
const LIST_PERS_BAJA = 'freematica_list_habilitaciones_personal_baja';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const DESC_SERV_ALTA = [
  'Devuelve altas de servicios-personal en el módulo de habilitaciones CAE (feed incremental).',
  'Usar para detectar nuevas asignaciones de trabajadores a centros de trabajo.',
  '',
  'Endpoint: GET /peqv/v2/habilitaciones/servicios/alta.',
].join('\n');

const DESC_SERV_BAJA = [
  'Devuelve bajas de servicios-personal en el módulo de habilitaciones CAE (feed incremental).',
  'Usar para detectar desvinculaciones de trabajadores de centros de trabajo.',
  '',
  'Endpoint: GET /peqv/v2/habilitaciones/servicios/baja.',
].join('\n');

const DESC_PERS_ALTA = [
  'Devuelve altas de licencias de personal en el módulo de habilitaciones CAE (feed incremental).',
  'Usar para detectar nuevas habilitaciones del personal.',
  '',
  'Endpoint: GET /peqv/v2/habilitaciones/personal/alta.',
].join('\n');

const DESC_PERS_BAJA = [
  'Devuelve bajas de licencias de personal en el módulo de habilitaciones CAE (feed incremental).',
  'Usar para detectar revocaciones de habilitaciones del personal.',
  '',
  'Endpoint: GET /peqv/v2/habilitaciones/personal/baja.',
].join('\n');

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ListHabilitacionesSchema = {
  ...PaginationSchema,
  desde: z
    .string()
    .optional()
    .describe(
      'Fecha de corte para sincronización incremental (formato YYYY-MM-DD). Si no se informa, devuelve todos los registros.',
    ),
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeHandler(
  client: FreematicaClient,
  endpoint: string,
): (args: { page: number; items: number; desde?: string }) => Promise<CallToolResult> {
  return async ({ page, items, desde }) => {
    try {
      const result = await client.listHabilitaciones(endpoint, { page, items, desde });
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

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del dominio Habilitaciones CAE.
 *
 * Tools expuestas:
 *  1. freematica_list_habilitaciones_servicios_alta
 *  2. freematica_list_habilitaciones_servicios_baja
 *  3. freematica_list_habilitaciones_personal_alta
 *  4. freematica_list_habilitaciones_personal_baja
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerHabilitacionesTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    LIST_SERV_ALTA,
    DESC_SERV_ALTA,
    ListHabilitacionesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeHandler(client, '/peqv/v2/habilitaciones/servicios/alta'),
  );

  server.tool(
    LIST_SERV_BAJA,
    DESC_SERV_BAJA,
    ListHabilitacionesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeHandler(client, '/peqv/v2/habilitaciones/servicios/baja'),
  );

  server.tool(
    LIST_PERS_ALTA,
    DESC_PERS_ALTA,
    ListHabilitacionesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeHandler(client, '/peqv/v2/habilitaciones/personal/alta'),
  );

  server.tool(
    LIST_PERS_BAJA,
    DESC_PERS_BAJA,
    ListHabilitacionesSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    makeHandler(client, '/peqv/v2/habilitaciones/personal/baja'),
  );
}
