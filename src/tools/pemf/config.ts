import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../../clients/base-client.js';
import type { FreematicaClient } from '../../clients/freematica-client.js';
import {
  SavePemfConfigShape,
  UpdatePemfConfigShape,
} from '../../schemas/pemf.js';
import { error, ok, type RegisterOptions } from '../helpers.js';

export function registerPemfConfigTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // ---------------------------------------------------------------------------
  // GET /pemf/v1/config — configuración global e-Movifree
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_get_pemf_config_global',
    [
      'Obtiene la configuración global de e-Movifree.',
      '',
      'Endpoint: GET /pemf/v1/config',
      '',
      'Configuración general del módulo e-Movifree (parámetros globales del sistema de campo).',
    ].join('\n'),
    {},
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (): Promise<CallToolResult> => {
      try {
        const result = await client.getPemfConfigGlobal();
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/config/:idConfig — configuración de un módulo (v1)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_get_pemf_config',
    [
      'Obtiene la configuración de un módulo e-Movifree por idConfig (v1).',
      '',
      'Endpoint: GET /pemf/v1/config/{idConfig}',
      '',
      'Configuración específica de un módulo del sistema de campo e-Movifree.',
    ].join('\n'),
    {
      idConfig: z.string().min(1).describe('Identificador del módulo de configuración (idConfig).'),
      version: z.union([z.literal('v1'), z.literal('v2')]).default('v1').describe('Versión del endpoint: v1 (default) o v2.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idConfig, version }): Promise<CallToolResult> => {
      try {
        const result = await client.getPemfConfig(idConfig, version);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /pemf/v1/usuarios-notificaciones — usuarios de notificaciones
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_list_pemf_usuarios_notificaciones',
    [
      'Obtiene la lista de usuarios de notificaciones de e-Movifree.',
      '',
      'Endpoint: GET /pemf/v1/usuarios-notificaciones',
      '',
      'Usuarios configurados para recibir notificaciones del sistema e-Movifree.',
    ].join('\n'),
    {},
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (): Promise<CallToolResult> => {
      try {
        const result = await client.listPemfUsuariosNotificaciones();
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // ---------------------------------------------------------------------------
  // POST /pemf/v1/config/:idConfig — guardar configuración (POST v1 o v2)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_save_pemf_config',
    [
      'Guarda la configuración de un módulo e-Movifree (POST).',
      '',
      'Endpoint: POST /pemf/v1/config/{idConfig} o POST /pemf/v2/config/{idConfig}',
      '',
      'Crea o guarda la configuración de un módulo del sistema de campo.',
      'Usa `version=v2` para el endpoint v2.',
    ].join('\n'),
    { ...SavePemfConfigShape },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ idConfig, version, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = {};
        if (camposAdicionales) Object.assign(body, camposAdicionales);
        const result = await client.savePemfConfig(idConfig, version ?? 'v1', body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // PUT /pemf/v1/config/:idConfig — actualizar configuración (PUT v1 o v2)
  // ---------------------------------------------------------------------------
  server.tool(
    'freematica_update_pemf_config',
    [
      'Actualiza la configuración de un módulo e-Movifree (PUT).',
      '',
      'Endpoint: PUT /pemf/v1/config/{idConfig} o PUT /pemf/v2/config/{idConfig}',
      '',
      'Actualiza la configuración de un módulo del sistema de campo.',
      'Usa `version=v2` para el endpoint v2.',
    ].join('\n'),
    { ...UpdatePemfConfigShape },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idConfig, version, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = {};
        if (camposAdicionales) Object.assign(body, camposAdicionales);
        const result = await client.updatePemfConfig(idConfig, version ?? 'v1', body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
