import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

export function registerPgrlCorreoTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // --------------------------------------------------------------------------
  // Correos v2 (lista y detalle)
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_correos',
    'Devuelve la lista paginada de correos (v2) de Freemática. Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listCorreosV2({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_correo',
    'Devuelve el detalle de un correo (v2). El parámetro `idReg` debe ser el campo `idReg` de freematica_list_correos.',
    {
      idReg: z.string().min(1).describe('Identificador opaco del correo.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getCorreoV2(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_list_correos_destinatarios',
    'Devuelve la lista paginada de destinatarios de correos (v2). Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listCorreosDestinatarios({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_get_correos_totales',
    'Devuelve los totales de correos de Freemática (v2). No requiere parámetros.',
    {},
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (): Promise<CallToolResult> => {
      try {
        const result = await client.getCorreosTotales();
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Correo v1 (lista)
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_correo_v1',
    'Devuelve la lista paginada de correos (v1) de Freemática. Paginación 1-indexed.',
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listCorreoV1({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Verificación y mailing
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_verificar_mail',
    'Verifica si un email es válido según Freemática.',
    {
      email: z.string().min(1).describe('Email a verificar.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ email }): Promise<CallToolResult> => {
      try {
        const result = await client.verificarMail(email);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  // --------------------------------------------------------------------------
  // Escritura: alta/baja de mailing (cambian estado; solo con writes)
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_mailing_unsubscribe',
    'Da de baja a un contacto del mailing en Freemática.',
    {
      idReg: z.string().min(1).describe('idReg del contacto.'),
    },
    { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.mailingUnsubscribe(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_mailing_subscribe',
    'Da de alta a un contacto en el mailing en Freemática.',
    {
      idReg: z.string().min(1).describe('idReg del contacto.'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.mailingSubscribe(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Escritura: crear correos
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_create_correo_v1',
    [
      'Crea un correo en Freemática (v1).',
      '',
      'Endpoint: POST /pgrl/v1/correo.',
    ].join('\n'),
    {
      camposAdicionales: z.record(z.string(), z.unknown()).optional().describe('Campos del correo.'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const created = await client.createCorreoV1(camposAdicionales ?? {});
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_create_correo',
    [
      'Crea un correo en Freemática (v2).',
      '',
      'Endpoint: POST /pgrl/v2/correos.',
    ].join('\n'),
    {
      camposAdicionales: z.record(z.string(), z.unknown()).optional().describe('Campos del correo.'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const created = await client.createCorreoV2(camposAdicionales ?? {});
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // --------------------------------------------------------------------------
  // Escritura: actualizar estado
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_update_correo_estado_v1',
    [
      'Actualiza el estado de un correo (v1).',
      '',
      'Endpoint: PUT /pgrl/v1/correo/{idReg}/estado.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('Identificador del correo.'),
      fields: z.record(z.string(), z.unknown()).describe('Estado y otros campos.'),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idReg, fields }): Promise<CallToolResult> => {
      try {
        const updated = await client.updateCorreoEstadoV1(idReg, fields);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    'freematica_update_correo_estado',
    [
      'Actualiza el estado de un correo (v2).',
      '',
      'Endpoint: PUT /pgrl/v2/correos/{idReg}/estado.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('Identificador del correo.'),
      fields: z.record(z.string(), z.unknown()).describe('Estado y otros campos.'),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idReg, fields }): Promise<CallToolResult> => {
      try {
        const updated = await client.updateCorreoEstadoV2(idReg, fields);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
