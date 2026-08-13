import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import { PaginationSchema } from '../../schemas/pagination.js';
import {
  CreatePemfDeviceShape,
  UpdatePemfDeviceShape,
  buildPemfDeviceBody,
  type PemfDeviceFields,
} from '../../schemas/pemf.js';
import { error, ok, okList, type RegisterOptions } from '../helpers.js';

export function registerPemfDispositivosTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // ---------------------------------------------------------------------------
  // GET /pemf/v1/devices — lista de dispositivos
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_devices',
    [
      'Lista paginada de dispositivos e-Movifree registrados.',
      '',
      'Endpoint: GET /pemf/v1/devices',
      '',
      'Dispositivos móviles, fijos y de control registrados en el sistema e-Movifree.',
      'Cada item incluye `idReg` (o idDevice) opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfDevices({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/devices/:idDevice — detalle de un dispositivo
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_get_pemf_device',
    [
      'Detalle de un dispositivo e-Movifree por idDevice.',
      '',
      'Endpoint: GET /pemf/v1/devices/{idDevice}',
      '',
      'El parámetro `idDevice` debe ser el campo `idReg` de freematica_list_pemf_devices.',
    ].join('\n'),
    { idDevice: z.string().min(1).describe('Identificador del dispositivo (campo idReg de freematica_list_pemf_devices).') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idDevice }): Promise<CallToolResult> => {
      try {
        const result = await client.getPemfDevice(idDevice);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // ---------------------------------------------------------------------------
  // POST /pemf/v1/devices — alta de dispositivo
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_create_pemf_device',
    [
      'Da de alta un dispositivo e-Movifree.',
      '',
      'Endpoint: POST /pemf/v1/devices',
      '',
      'Crea un nuevo dispositivo (móvil, fijo o de control) en el sistema e-Movifree.',
      'Devuelve el registro creado.',
    ].join('\n'),
    { ...CreatePemfDeviceShape },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildPemfDeviceBody(args as PemfDeviceFields);
        const result = await client.createPemfDevice(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // PUT /pemf/v1/devices/:idDevice — actualización de dispositivo
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_update_pemf_device',
    [
      'Actualiza un dispositivo e-Movifree.',
      '',
      'Endpoint: PUT /pemf/v1/devices/{idDevice}',
      '',
      'El parámetro `idDevice` debe ser el campo `idReg` de freematica_list_pemf_devices.',
    ].join('\n'),
    { ...UpdatePemfDeviceShape },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idDevice, ...rest }): Promise<CallToolResult> => {
      try {
        const body = buildPemfDeviceBody(rest as PemfDeviceFields);
        const result = await client.updatePemfDevice(idDevice, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
