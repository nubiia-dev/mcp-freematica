import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import {
  CreateContactoClienteShape,
  UpdateContactoClienteShape,
  buildContactoClienteBody,
  mergeForUpdate,
  type ContactoClienteFields,
} from '../schemas/clientes.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_contactos_clientes';
const CREATE_TOOL_NAME = 'freematica_create_contacto_cliente';
const UPDATE_TOOL_NAME = 'freematica_update_contacto_cliente';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de contactos de clientes (personas asociadas a clientes corporativos).',
  '',
  'Cada item incluye un campo `idReg` opaco (base64) que se usa en freematica_update_contacto_cliente.',
  '',
  'Paginación 1-indexed.',
].join('\n');

const CREATE_DESCRIPTION = [
  'Da de alta un contacto de cliente.',
  '',
  'Endpoint: POST /pgrl/v2/contactos-clientes — body VoContactosClientes.',
  'Requeridos: grupoCliente y codCliente (el cliente al que pertenece).',
  'Opcionales frecuentes: nombreApellidos, cargo, telefono, movil, email,',
  'contactoPrincipal, decisor. El resto vía camposAdicionales (CC_*).',
].join('\n');

const UPDATE_DESCRIPTION = [
  'Actualiza un contacto de cliente existente (actualización parcial).',
  '',
  'Endpoint: PUT /pgrl/v2/contactos-clientes/{idReg}. La tool recupera el',
  'contacto actual, aplica encima los campos informados y envía el objeto',
  'completo. `idReg` sale de freematica_list_contactos_clientes.',
].join('\n');

export function registerContactosClientesTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listContactosClientes({ page, items });
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

  // --------------------------------------------------------------------------
  // Tools v1 y detalle de contacto de cliente
  // --------------------------------------------------------------------------

  server.tool(
    'freematica_list_contactos_clientes_v1',
    [
      'Devuelve la lista paginada de contactos de clientes usando el endpoint v1 de Freemática.',
      '',
      'Paginación 1-indexed.',
    ].join('\n'),
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listContactosClientesV1({ page, items });
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

  server.tool(
    'freematica_get_contacto_cliente',
    'Devuelve el detalle de un contacto de cliente por su `idReg`. El `idReg` sale de freematica_list_contactos_clientes.',
    {
      idReg: z.string().min(1).describe('Identificador del contacto de cliente.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getContactoCliente(idReg);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  if (!opts.enableWrites) return;

  server.tool(
    CREATE_TOOL_NAME,
    CREATE_DESCRIPTION,
    CreateContactoClienteShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildContactoClienteBody(args as ContactoClienteFields);
        const created = await client.createContactoCliente(body);
        return ok(created) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  server.tool(
    UPDATE_TOOL_NAME,
    UPDATE_DESCRIPTION,
    UpdateContactoClienteShape,
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...fields }): Promise<CallToolResult> => {
      try {
        const changes = buildContactoClienteBody(fields as ContactoClienteFields);
        if (Object.keys(changes).length === 0) {
          return error(
            new Error('Debes informar al menos un campo a actualizar además de idReg.'),
          ) as CallToolResult;
        }
        const current = await client.getContactoCliente(idReg);
        const body = mergeForUpdate(current, changes);
        const updated = await client.updateContactoCliente(idReg, body);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
