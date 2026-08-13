import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreatePemfRondaShape,
  buildPemfRondaBody,
  type PemfRondaFields,
} from '../../schemas/pemf.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

const RondaPointsSchema = {
  idRonda: z.string().min(1).describe('idReg de la ronda.'),
  page: z.number().int().min(1).default(1).describe('Número de página (1-indexed).'),
  items: z.number().int().min(1).max(200).default(20).describe('Elementos por página (máx. 200).'),
};

export function registerPemfRondasTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // ---------------------------------------------------------------------------
  // GET /pemf/v1/rounds — lista de rondas (v1)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_rondas',
    [
      'Lista paginada de rondas de seguridad e-Movifree (v1).',
      '',
      'Endpoint: GET /pemf/v1/rounds',
      '',
      'Rondas de vigilancia/seguridad realizadas por los operarios de campo.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfRondas({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v2/rounds — lista de rondas (v2)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_rondas_v2',
    [
      'Lista paginada de rondas de seguridad e-Movifree (v2).',
      '',
      'Endpoint: GET /pemf/v2/rounds',
      '',
      'Versión v2 de las rondas de vigilancia/seguridad de los operarios de campo.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfRondasV2({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/rounds/:idRonda/points — puntos de una ronda (v1)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_ronda_points',
    [
      'Lista los puntos de control de una ronda e-Movifree (v1).',
      '',
      'Endpoint: GET /pemf/v1/rounds/{idRonda}/points',
      '',
      'Puntos de control (checkpoints) de una ronda de seguridad.',
      'El parámetro `idRonda` debe ser el campo `idReg` de freematica_list_pemf_rondas.',
    ].join('\n'),
    { ...RondaPointsSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idRonda, page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfRondaPoints(idRonda, { page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v2/rounds/:idRonda/points — puntos de una ronda (v2)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_ronda_points_v2',
    [
      'Lista los puntos de control de una ronda e-Movifree (v2).',
      '',
      'Endpoint: GET /pemf/v2/rounds/{idRonda}/points',
      '',
      'Versión v2 de los puntos de control de una ronda de seguridad.',
      'El parámetro `idRonda` debe ser el campo `idReg` de freematica_list_pemf_rondas_v2.',
    ].join('\n'),
    { ...RondaPointsSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idRonda, page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfRondaPointsV2(idRonda, { page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // ---------------------------------------------------------------------------
  // POST /pemf/v1/rounds — alta de ronda
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_create_pemf_ronda',
    [
      'Crea una nueva ronda de seguridad e-Movifree.',
      '',
      'Endpoint: POST /pemf/v1/rounds',
      '',
      'Registra una nueva ronda de vigilancia/seguridad en el sistema.',
      'Devuelve el registro creado.',
    ].join('\n'),
    { ...CreatePemfRondaShape },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildPemfRondaBody(args as PemfRondaFields);
        const result = await client.createPemfRonda(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
