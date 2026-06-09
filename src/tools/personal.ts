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

const LIST_TOOL_NAME = 'freematica_list_personal';
const GET_TOOL_NAME = 'freematica_get_persona';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de personas (empleados / personal) de Freemática.',
  '',
  'Endpoint: GET /pers/v2/personal',
  '',
  'Permite filtrar por empresa (VSSPER_EMP), delegación (VSSPER_DELEG), código',
  'de persona (VSSPER_COD), nombre (VSSPER_NOM, búsqueda parcial), primer',
  'apellido (VSSPER_APELL1, búsqueda parcial), NIF (VSSPER_NIF), situación',
  '(VSSPER_SIT), departamento (VSSPER_DPTO), sección (VSSPER_SECCION) y activo',
  '(boolean traducido a FIQL VSSPER_ACTIVO==S o VSSPER_ACTIVO==N).',
  '',
  'Cada item incluye `idReg` opaco para usar en freematica_get_persona.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle completo de una persona.',
  '',
  'Endpoint: GET /pers/v2/personal/{idreg}',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece',
  'en los items de freematica_list_personal.',
].join('\n');

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Schema para freematica_list_personal. */
const ListPersonalSchema = {
  ...PaginationSchema,
  empresa: z
    .string()
    .min(1)
    .optional()
    .describe('Código de empresa (campo VSSPER_EMP en Freemática).'),
  delegacion: z
    .string()
    .min(1)
    .optional()
    .describe('Código de delegación (campo VSSPER_DELEG en Freemática).'),
  codPersona: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural de la persona (campo VSSPER_COD en Freemática).'),
  nombre: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Nombre de la persona — búsqueda parcial con FIQL LIKE (campo VSSPER_NOM). ' +
        'Introduce parte del nombre para buscar (ej. "Juan" encuentra "Juan Carlos").',
    ),
  apellido: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Primer apellido — búsqueda parcial con FIQL LIKE (campo VSSPER_APELL1). ' +
        'Introduce parte del apellido para buscar.',
    ),
  nif: z
    .string()
    .min(1)
    .optional()
    .describe('NIF/DNI de la persona (campo VSSPER_NIF en Freemática). Coincidencia exacta.'),
  situacion: z
    .string()
    .min(1)
    .optional()
    .describe('Código de situación laboral (campo VSSPER_SIT en Freemática).'),
  departamento: z
    .string()
    .min(1)
    .optional()
    .describe('Código de departamento (campo VSSPER_DPTO en Freemática).'),
  seccion: z
    .string()
    .min(1)
    .optional()
    .describe('Código de sección (campo VSSPER_SECCION en Freemática).'),
  activo: z
    .boolean()
    .optional()
    .describe(
      'Filtra por personas activas (true → VSSPER_ACTIVO==S) o inactivas (false → VSSPER_ACTIVO==N). ' +
        'Si se omite, devuelve todas.',
    ),
};

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP del dominio Personal (RRHH).
 *
 * Tools expuestas:
 *  1. freematica_list_personal  — lista paginada con filtros FIQL
 *  2. freematica_get_persona    — detalle por idReg
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerPersonalTools(server: McpServer, client: FreematicaClient): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_personal
  // -------------------------------------------------------------------------
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    ListPersonalSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      page,
      items,
      empresa,
      delegacion,
      codPersona,
      nombre,
      apellido,
      nif,
      situacion,
      departamento,
      seccion,
      activo,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonal({
          page,
          items,
          empresa,
          delegacion,
          codPersona,
          nombre,
          apellido,
          nif,
          situacion,
          departamento,
          seccion,
          activo,
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_get_persona
  // -------------------------------------------------------------------------
  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco de la persona (campo "idReg" en los items de freematica_list_personal).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const persona = await client.getPersona(id);
        return ok(persona) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
