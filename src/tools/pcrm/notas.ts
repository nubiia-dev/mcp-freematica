import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

const idRegField = z
  .string()
  .min(1)
  .describe('idReg opaco de la nota (campo "idReg" en freematica_list_pcrm_notas).');

/**
 * Registra las tools MCP del área de Notas CRM.
 *
 * Cubre los endpoints GET /pcrm/v2/notas (lista y detalle) y la
 * operación de creación POST (condicional a enableWrites).
 *
 * Nota: El body de POST /pcrm/v2/notas está vacío en la colección Postman,
 * por lo que la tool de escritura acepta un objeto libre de campos nativos.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 * @param opts   - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerPcrmNotasTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // -------------------------------------------------------------------------
  // freematica_list_pcrm_notas
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_pcrm_notas',
    [
      'Lista paginada de notas CRM.',
      '',
      'Endpoint: GET /pcrm/v2/notas',
      '',
      'Devuelve las notas del módulo CRM. Cada item incluye `idReg` opaco',
      'para usar en freematica_get_pcrm_nota.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPcrmNotas({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_pcrm_nota
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_pcrm_nota',
    [
      'Detalle de una nota CRM.',
      '',
      'Endpoint: GET /pcrm/v2/notas/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_pcrm_notas.',
    ].join('\n'),
    { id: idRegField },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPcrmNota(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // freematica_create_pcrm_nota
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_pcrm_nota',
    [
      'Crea una nueva nota CRM.',
      '',
      'Endpoint: POST /pcrm/v2/notas — body VoNotaCrm.',
      '',
      'El body es de forma libre: usa `camposNativos` para pasar los campos',
      'nativos de la nota (el API acepta un objeto JSON).',
      'Devuelve el registro creado.',
    ].join('\n'),
    {
      camposNativos: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional()
        .describe('Campos nativos de la nota a crear (el API acepta un objeto JSON libre).'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposNativos }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = camposNativos ?? {};
        const result = await client.createPcrmNota(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
