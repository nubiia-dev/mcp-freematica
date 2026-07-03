import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import {
  CreateClienteShape,
  UpdateClienteShape,
  buildClienteBody,
  buildClienteIdReg,
  mergeForUpdate,
  type ClienteFields,
} from '../schemas/clientes.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_clientes';
const GET_TOOL_NAME = 'freematica_get_cliente';
const CREATE_TOOL_NAME = 'freematica_create_cliente';
const UPDATE_TOOL_NAME = 'freematica_update_cliente';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de clientes de Freemática.',
  '',
  'Cada item tiene ~87 campos (COD_CLI, NOMBRE_CLI, NIF, FECHA_ALTA, etc.) más un campo `idReg` opaco (base64) que se usa para el endpoint singular `freematica_get_cliente`.',
  '',
  'Paginación 1-indexed: la primera página es page=1. Devuelve también `total` con el total de clientes en el dataset.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle completo de un cliente.',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en los items de freematica_list_clientes. NO usar COD_CLI ni otro código natural — el API devuelve not_found.',
].join('\n');

const CREATE_DESCRIPTION = [
  'Da de alta un cliente en Freemática.',
  '',
  'Endpoint: POST /pgrl/v2/clientes — body VoClientes (109 campos).',
  'Requeridos: grupoCliente, codCliente, nombre (40c), nif, tipoImpuesto,',
  'divisa (ej. EUR) y tipoFacturacion (D=Diario, M=Mensual, Q=Quincenal).',
  'El idReg del cliente se calcula automáticamente (Base64 "GRUPO__COD").',
  '',
  'Los campos no expuestos con nombre amigable se pasan en camposAdicionales',
  'con su nombre nativo (ej. COD_TARIFA, CREDITO). Devuelve el cliente creado.',
].join('\n');

const UPDATE_DESCRIPTION = [
  'Actualiza un cliente existente (actualización parcial).',
  '',
  'Endpoint: PUT /pgrl/v2/clientes/{idReg}. La tool primero recupera el',
  'cliente actual, aplica encima los campos informados y envía el objeto',
  'completo (el API exige los campos obligatorios en cada PUT). El estado',
  'previo queda en el log de auditoría.',
].join('\n');

export function registerClientesTools(
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
        const result = await client.listClientes({ page, items });
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
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del cliente (campo "idReg" en los items de freematica_list_clientes).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const cliente = await client.getCliente(id);
        return ok(cliente) as CallToolResult;
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
    CreateClienteShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const fields = args as ClienteFields & { grupoCliente: number; codCliente: string };
        const body = buildClienteBody(fields);
        // El API exige idReg también en el alta; se deriva de los códigos naturales.
        body['idReg'] = buildClienteIdReg(fields.grupoCliente, fields.codCliente);
        const created = await client.createCliente(body);
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
    UpdateClienteShape,
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...fields }): Promise<CallToolResult> => {
      try {
        const changes = buildClienteBody(fields as ClienteFields);
        if (Object.keys(changes).length === 0) {
          return error(
            new Error('Debes informar al menos un campo a actualizar además de idReg.'),
          ) as CallToolResult;
        }
        const current = await client.getCliente(idReg);
        const body = mergeForUpdate(current as Record<string, unknown>, changes);
        const updated = await client.updateCliente(idReg, body);
        return ok(updated) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
