import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import {
  PassthroughBodyShape,
  CreatePersonaShape,
  UpdatePersonaShape,
  CreatePersonaNotaShape,
  UpdatePersonaNotaShape,
  CreatePersonaExperienciaShape,
  CreatePersonaTramoShape,
  UpdatePersonaTramoShape,
  CreatePersonaContratoShape,
  UpdatePersonaContratoShape,
  CreatePersonaAdicionalShape,
  UpdatePersonaAdicionalShape,
  UpdateCpdGestionShape,
  buildPersonaBody,
  buildPersonaNotaBody,
  buildPersonaExperienciaBody,
  buildPersonaTramoBody,
  buildPersonaContratoBody,
  buildPersonaAdicionalBody,
  buildCpdGestionBody,
  type PersonaFields,
  type PersonaNotaFields,
  type PersonaExperienciaFields,
  type PersonaTramoFields,
  type PersonaContratoFields,
  type PersonaAdicionalFields,
  type CpdGestionFields,
} from '../schemas/personal.js';
import { error, ok, okList, type RegisterOptions } from './helpers.js';

// ---------------------------------------------------------------------------
// Helper: idReg path param
// ---------------------------------------------------------------------------
const idRegField = (context: string) =>
  z.string().min(1).describe(`idReg opaco del registro (campo "idReg" en la tool de listado de ${context}).`);

// ---------------------------------------------------------------------------
// Register function
// ---------------------------------------------------------------------------

/**
 * Registra las tools MCP extendidas del dominio Personal/RRHH (módulo /pers/).
 *
 * NO duplica las dos tools ya existentes en personal.ts:
 *  - freematica_list_personal
 *  - freematica_get_persona
 *
 * @param server  - Instancia del servidor MCP.
 * @param client  - Cliente Freemática autenticado.
 * @param opts    - Opciones de registro (enableWrites activa las tools de escritura).
 */
export function registerPersonalExtTools(
  server: McpServer,
  client: FreematicaClient,
  opts: RegisterOptions = { enableWrites: false },
): void {
  // =========================================================================
  // SECCIÓN 1: Personal maestro — sub-recursos
  // =========================================================================

  // -------------------------------------------------------------------------
  // freematica_list_personal_v2
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_v2',
    [
      'Lista de personas (endpoint de sincronización incremental v2).',
      '',
      'Endpoint: GET /pers/v2/personal',
      '',
      'A diferencia de freematica_list_personal (v1), este endpoint acepta el',
      'parámetro opcional `fchmodificacion` (YYYY-MM-DD) para recuperar solo los',
      'registros modificados desde esa fecha. Útil para sincronización incremental.',
      '',
      'Cada item incluye `idReg` opaco para usar en freematica_get_persona.',
    ].join('\n'),
    {
      ...PaginationSchema,
      fchmodificacion: z
        .string()
        .optional()
        .describe('Fecha de última modificación (YYYY-MM-DD). Devuelve solo personas modificadas desde esa fecha.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, fchmodificacion }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalV2({ page, items, fchmodificacion });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_personal_identificacion
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_identificacion',
    [
      'Lista paginada de datos de identificación de personas.',
      '',
      'Endpoint: GET /pers/v2/personal-identificacion',
      '',
      'Devuelve documentos de identificación (DNI, NIE, pasaporte, etc.) asociados',
      'a las personas del módulo de personal.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalIdentificacion({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_personal_notas
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_notas',
    [
      'Lista paginada de notas de personal.',
      '',
      'Endpoint: GET /pers/v2/personal-notas',
      '',
      'Parámetro opcional `idReg` para filtrar las notas de una persona concreta.',
      'Sin `idReg` devuelve todas las notas del sistema.',
      '',
      'Cada item incluye `idReg` opaco para usar en freematica_get_personal_nota.',
    ].join('\n'),
    {
      ...PaginationSchema,
      idReg: z
        .string()
        .optional()
        .describe('idReg opaco de la persona (campo "idReg" en freematica_list_personal). Filtra las notas de esa persona.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalNotas({ page, items, idReg });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_personal_nota
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_personal_nota',
    [
      'Devuelve el detalle de una nota de personal.',
      '',
      'Endpoint: GET /pers/v2/personal-notas/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_personal_notas.',
    ].join('\n'),
    { id: idRegField('freematica_list_personal_notas') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPersonalNota(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_personal_experiencias
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_experiencias',
    [
      'Lista paginada de experiencias profesionales previas de las personas.',
      '',
      'Endpoint: GET /pers/v1/personal-experiencias',
      '',
      'Parámetro opcional `idReg` para filtrar las experiencias de una persona.',
      '',
      'Cada item incluye `idReg` opaco para usar en freematica_get_personal_experiencia.',
    ].join('\n'),
    {
      ...PaginationSchema,
      idReg: z
        .string()
        .optional()
        .describe('idReg opaco de la persona. Filtra las experiencias de esa persona.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalExperiencias({ page, items, idReg });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_personal_experiencia
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_personal_experiencia',
    [
      'Devuelve el detalle de una experiencia profesional previa.',
      '',
      'Endpoint: GET /pers/v1/personal-experiencias/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_personal_experiencias.',
    ].join('\n'),
    { id: idRegField('freematica_list_personal_experiencias') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPersonalExperiencia(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_personal_formaciones
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_formaciones',
    [
      'Lista paginada de formaciones académicas/profesionales de las personas.',
      '',
      'Endpoint: GET /pers/v1/personal-formaciones',
      '',
      'Parámetro opcional `idReg` para filtrar las formaciones de una persona.',
      '',
      'Cada item incluye `idReg` opaco para usar en freematica_get_personal_formacion.',
    ].join('\n'),
    {
      ...PaginationSchema,
      idReg: z
        .string()
        .optional()
        .describe('idReg opaco de la persona. Filtra las formaciones de esa persona.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalFormaciones({ page, items, idReg });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_personal_formacion
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_personal_formacion',
    [
      'Devuelve el detalle de una formación de personal.',
      '',
      'Endpoint: GET /pers/v1/personal-formaciones/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_personal_formaciones.',
    ].join('\n'),
    { id: idRegField('freematica_list_personal_formaciones') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPersonalFormacion(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_personal_contratos
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_contratos',
    [
      'Lista paginada de contratos laborales de las personas.',
      '',
      'Endpoint: GET /pers/v1/personal_contratos',
      '',
      'Incluye tipo de contrato, fechas de inicio/fin, categoría y salario.',
      'Cada item incluye `idReg` para usar en freematica_get_personal_contrato.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalContratos({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_personal_contrato
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_personal_contrato',
    [
      'Devuelve el detalle de un contrato laboral.',
      '',
      'Endpoint: GET /pers/v1/personal_contratos/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_personal_contratos.',
    ].join('\n'),
    { id: idRegField('freematica_list_personal_contratos') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPersonalContrato(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_personal_tramos
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_tramos',
    [
      'Lista paginada de tramos horarios de las personas (v1).',
      '',
      'Endpoint: GET /pers/v1/personal_tramos',
      '',
      'Incluye código de horario, jornada, fechas de vigencia.',
      'Cada item incluye `idReg` para usar en freematica_get_personal_tramo.',
      '',
      'Para sincronización incremental usa freematica_list_personal_tramos_sync (v2).',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalTramos({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_personal_tramo
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_personal_tramo',
    [
      'Devuelve el detalle de un tramo horario (v1).',
      '',
      'Endpoint: GET /pers/v1/personal_tramos/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_personal_tramos.',
    ].join('\n'),
    { id: idRegField('freematica_list_personal_tramos') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPersonalTramo(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_personal_tramos_sync
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_tramos_sync',
    [
      'Lista de tramos horarios — endpoint de sincronización incremental (v2).',
      '',
      'Endpoint: GET /pers/v2/personal/tramos',
      '',
      'Parámetro opcional `fchmodificacion` (YYYY-MM-DD) para recuperar solo los',
      'tramos modificados desde esa fecha.',
      '',
      'Cada item incluye `idReg` para usar en freematica_get_personal_tramo_v2.',
    ].join('\n'),
    {
      ...PaginationSchema,
      fchmodificacion: z
        .string()
        .optional()
        .describe('Fecha de última modificación (YYYY-MM-DD). Devuelve solo tramos modificados desde esa fecha.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, fchmodificacion }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalTramosSync({ page, items, fchmodificacion });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_personal_tramo_v2
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_personal_tramo_v2',
    [
      'Devuelve el detalle de un tramo horario (v2 — sincronización).',
      '',
      'Endpoint: GET /pers/v2/personal/tramos/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_personal_tramos_sync.',
    ].join('\n'),
    { id: idRegField('freematica_list_personal_tramos_sync') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPersonalTramoV2(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_personal_pago
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_pago',
    [
      'Lista paginada de datos bancarios/de pago de las personas.',
      '',
      'Endpoint: GET /pers/v1/personal_pago',
      '',
      'Incluye IBAN, entidad bancaria, forma de pago.',
      'Cada item incluye `idReg` para usar en freematica_get_personal_pago.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalPago({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_personal_pago
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_personal_pago',
    [
      'Devuelve el detalle de los datos bancarios/de pago de una persona.',
      '',
      'Endpoint: GET /pers/v1/personal_pago/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_personal_pago.',
    ].join('\n'),
    { id: idRegField('freematica_list_personal_pago') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPersonalPago(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_personal_adicionales
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_adicionales',
    [
      'Lista paginada de datos adicionales (campos extra) de las personas.',
      '',
      'Endpoint: GET /pers/v2/personal-adicionales',
      '',
      'Los datos adicionales son campos configurables por empresa que no existen',
      'en la ficha estándar de personal (VSSPERA_*).',
      '',
      'Cada item incluye `idReg` para operaciones de escritura.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalAdicionales({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_personal_prorroga
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_prorroga',
    [
      'Lista paginada de prórrogas de contratos laborales.',
      '',
      'Endpoint: GET /pers/v1/personal-prorroga',
      '',
      'Incluye extensiones y renovaciones de contratos.',
      'Cada item incluye `idReg` para usar en freematica_get_personal_prorroga.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalProrroga({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_personal_prorroga
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_personal_prorroga',
    [
      'Devuelve el detalle de una prórroga de contrato laboral.',
      '',
      'Endpoint: GET /pers/v1/personal-prorroga/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_personal_prorroga.',
    ].join('\n'),
    { id: idRegField('freematica_list_personal_prorroga') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPersonalProrroga(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_incidencias_personal
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_incidencias_personal',
    [
      'Lista paginada de incidencias de personal.',
      '',
      'Endpoint: GET /pers/v2/incidencias',
      '',
      'Incidencias laborales registradas en el módulo de RRHH.',
      'Cada item incluye `idReg` opaco.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listIncidenciasPersonal({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_agenda_persona
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_agenda_persona',
    [
      'Devuelve la agenda de una persona (eventos, citas, tareas programadas).',
      '',
      'Endpoint: GET /pers/v1/agenda-persona',
      '',
      'Parámetro opcional `idReg` para filtrar la agenda de una persona concreta.',
    ].join('\n'),
    {
      ...PaginationSchema,
      idReg: z
        .string()
        .optional()
        .describe('idReg opaco de la persona para filtrar su agenda.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items, idReg }): Promise<CallToolResult> => {
      try {
        const result = await client.getAgendaPersona({ page, items, idReg });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_equipamiento_ficha_seguridad
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_equipamiento_ficha_seguridad',
    [
      'Lista paginada de equipamiento de ficha de seguridad del personal.',
      '',
      'Endpoint: GET /pers/v2/equipamiento-ficha-seguridad',
      '',
      'EPIs (Equipos de Protección Individual) y equipamiento de seguridad',
      'asignado al personal.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listEquipamientoFichaSeguridad({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // =========================================================================
  // SECCIÓN 2: Anticipos
  // =========================================================================

  // -------------------------------------------------------------------------
  // freematica_list_anticipos_personal
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_anticipos_personal',
    [
      'Lista paginada de anticipos de nómina del personal.',
      '',
      'Endpoint: GET /pers/v2/personal/anticipos',
      '',
      'Anticipos de salario solicitados o concedidos a los empleados.',
      'Cada item incluye `idReg` para usar en freematica_get_anticipo_personal.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listAnticiposPersonal({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_anticipo_personal
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_anticipo_personal',
    [
      'Devuelve el detalle de un anticipo de nómina.',
      '',
      'Endpoint: GET /pers/v2/personal/anticipos/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_anticipos_personal.',
    ].join('\n'),
    { id: idRegField('freematica_list_anticipos_personal') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getAnticipoPersonal(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // =========================================================================
  // SECCIÓN 3: Calendario Personal
  // =========================================================================

  // -------------------------------------------------------------------------
  // freematica_list_calendario_personal
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_calendario_personal',
    [
      'Lista paginada de entradas del calendario personal de los empleados.',
      '',
      'Endpoint: GET /pers/v2/personal-cal',
      '',
      'Vacaciones, permisos, ausencias y días especiales del calendario',
      'individual de cada empleado.',
      'Cada item incluye `idReg` para usar en freematica_get_calendario_personal.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listCalendarioPersonal({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_calendario_personal
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_calendario_personal',
    [
      'Devuelve el detalle de una entrada del calendario personal.',
      '',
      'Endpoint: GET /pers/v2/personal-cal/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_calendario_personal.',
    ].join('\n'),
    { id: idRegField('freematica_list_calendario_personal') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getCalendarioPersonal(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // =========================================================================
  // SECCIÓN 4: CPD — Cuadro Personal de Documentos
  // =========================================================================

  // -------------------------------------------------------------------------
  // freematica_list_cpd
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_cpd',
    [
      'Lista paginada de documentos del CPD (Cuadro Personal de Documentos).',
      '',
      'Endpoint: GET /pers/v1/cpd',
      '',
      'Documentos que los empleados deben firmar o gestionar (contratos, nóminas,',
      'comunicaciones, etc.).',
      'Cada item incluye `idReg` para usar en freematica_get_cpd.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listCpd({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_cpd
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_cpd',
    [
      'Devuelve el detalle de un documento CPD.',
      '',
      'Endpoint: GET /pers/v1/cpd/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_cpd.',
      '',
      'NOTA: El endpoint de descarga binaria (GET /pers/v1/cpd/download) no está',
      'expuesto porque devuelve un ZIP binario no manejable por herramientas LLM.',
    ].join('\n'),
    { id: idRegField('freematica_list_cpd') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getCpd(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_cpd_movimientos
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_cpd_movimientos',
    [
      'Lista los movimientos/historial de un documento CPD.',
      '',
      'Endpoint: GET /pers/v1/cpd/{idreg}/movimientos',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_cpd.',
      'Devuelve el historial de estados y acciones sobre el documento.',
    ].join('\n'),
    {
      id: idRegField('freematica_list_cpd'),
      ...PaginationSchema,
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id, page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listCpdMovimientos(id, { page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_list_cpd_firmados_vid
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_cpd_firmados_vid',
    [
      'Lista paginada de documentos CPD firmados mediante VID (firma digital).',
      '',
      'Endpoint: GET /pers/v1/cpd/firmados-vid',
      '',
      'Documentos que han sido firmados electrónicamente por los empleados.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listCpdFirmadosVid({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // =========================================================================
  // SECCIÓN 5: IRPF
  // =========================================================================

  // -------------------------------------------------------------------------
  // freematica_list_personal_irpf
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_personal_irpf',
    [
      'Lista paginada de datos de IRPF de las personas.',
      '',
      'Endpoint: GET /pers/v2/personal_irpf',
      '',
      'Tipos de retención, situaciones familiares, y demás datos fiscales',
      'necesarios para el cálculo del IRPF.',
      'Cada item incluye `idReg` para usar en freematica_get_personal_irpf.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listPersonalIrpf({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_personal_irpf
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_personal_irpf',
    [
      'Devuelve el detalle de los datos de IRPF de una persona.',
      '',
      'Endpoint: GET /pers/v2/personal_irpf/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_personal_irpf.',
    ].join('\n'),
    { id: idRegField('freematica_list_personal_irpf') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getPersonalIrpf(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // =========================================================================
  // SECCIÓN 6: Formación (sesiones)
  // =========================================================================

  // -------------------------------------------------------------------------
  // freematica_list_sesiones_formacion
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_sesiones_formacion',
    [
      'Lista paginada de sesiones de formación.',
      '',
      'Endpoint: GET /pers/v1/sesiones-formacion',
      '',
      'Sesiones formativas impartidas o planificadas para el personal.',
      'Cada item incluye `idReg` para usar en freematica_get_sesion_formacion.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listSesionesFormacion({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_sesion_formacion
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_sesion_formacion',
    [
      'Devuelve el detalle de una sesión de formación.',
      '',
      'Endpoint: GET /pers/v1/sesiones-formacion/{idreg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_sesiones_formacion.',
    ].join('\n'),
    { id: idRegField('freematica_list_sesiones_formacion') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getSesionFormacion(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // =========================================================================
  // SECCIÓN 7: VSS Incidencias (Vigilancia de la Salud)
  // =========================================================================

  // -------------------------------------------------------------------------
  // freematica_list_vss_incidencias
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_list_vss_incidencias',
    [
      'Lista paginada de incidencias de Vigilancia de la Salud (VSS).',
      '',
      'Endpoint: GET /pers/v2/vss-incidencias',
      '',
      'Incidencias médico-laborales: accidentes, enfermedades profesionales,',
      'bajas por IT, reconocimientos médicos.',
      'Cada item incluye `idReg` para usar en freematica_get_vss_incidencia.',
    ].join('\n'),
    { ...PaginationSchema },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.listVssIncidencias({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_get_vss_incidencia
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_get_vss_incidencia',
    [
      'Devuelve el detalle de una incidencia de Vigilancia de la Salud.',
      '',
      'Endpoint: GET /pers/v2/vss-incidencias/{idReg}',
      '',
      'El parámetro `id` debe ser el campo `idReg` de freematica_list_vss_incidencias.',
    ].join('\n'),
    { id: idRegField('freematica_list_vss_incidencias') },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const result = await client.getVssIncidencia(id);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // =========================================================================
  // SECCIÓN 8: TOOLS DE ESCRITURA (solo si enableWrites === true)
  // =========================================================================

  if (!opts.enableWrites) return;

  // -------------------------------------------------------------------------
  // freematica_create_persona
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_persona',
    [
      'Da de alta una persona (empleado) en Freemática.',
      '',
      'Endpoint: POST /pers/v1/personal — body VoPersonal (VSSPER_*).',
      'Campos requeridos: empresa, delegacion, codPersona, apellido1, nombre.',
      '',
      'Los campos no expuestos con nombre amigable se pasan en camposAdicionales',
      'con su nombre nativo (ej. VSSPER_SIT, VSSPER_DPTO).',
      'Devuelve el registro creado.',
    ].join('\n'),
    CreatePersonaShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildPersonaBody(args as PersonaFields);
        const result = await client.createPersona(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_persona
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_persona',
    [
      'Actualiza los datos de una persona existente (actualización parcial).',
      '',
      'Endpoint: PUT /pers/v1/personal/{idReg}.',
      'La tool primero recupera la persona actual, aplica encima los campos',
      'informados y envía el objeto completo.',
    ].join('\n'),
    UpdatePersonaShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...rest }): Promise<CallToolResult> => {
      try {
        const current = await client.getPersonaForUpdate(idReg);
        const changes = buildPersonaBody(rest as PersonaFields);
        const merged = { ...current, ...changes };
        const result = await client.updatePersona(idReg, merged);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_personal_identificacion
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_personal_identificacion',
    [
      'Da de alta un documento de identificación para una persona.',
      '',
      'Endpoint: POST /pers/v1/personal-identificacion/{idreg}.',
      'El `idReg` es el identificador de la persona en freematica_list_personal.',
      '',
      'El body de este endpoint no tiene campos conocidos en la especificación;',
      'usa `camposAdicionales` para pasar los campos nativos del Vo.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('idReg opaco de la persona (campo "idReg" en freematica_list_personal).'),
      ...PassthroughBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPersonalIdentificacion(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_personal_nota
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_personal_nota',
    [
      'Da de alta una nota de personal.',
      '',
      'Endpoint: POST /pers/v2/personal-notas — body VoPersonalNotas (PERNOT_*).',
      '',
      'Las notas permiten registrar información libre (habilidades, comentarios,',
      'incidencias informales) asociada a una persona.',
    ].join('\n'),
    CreatePersonaNotaShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildPersonaNotaBody(args as PersonaNotaFields);
        const result = await client.createPersonalNota(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_personal_nota
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_personal_nota',
    [
      'Actualiza una nota de personal existente.',
      '',
      'Endpoint: PUT /pers/v2/personal-notas/{idReg}.',
      'Actualización parcial: solo se envían los campos informados.',
    ].join('\n'),
    UpdatePersonaNotaShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...rest }): Promise<CallToolResult> => {
      try {
        const current = await client.getPersonalNota(idReg);
        const changes = buildPersonaNotaBody(rest as PersonaNotaFields);
        const merged = { ...current, ...changes };
        const result = await client.updatePersonalNota(idReg, merged);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_personal_experiencia
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_personal_experiencia',
    [
      'Da de alta una experiencia profesional previa de una persona.',
      '',
      'Endpoint: POST /pers/v2/personal-experiencia — body VoPersonalExperiencias (PEREX_*).',
      '',
      'Registra empleos anteriores, puestos previos y trayectoria profesional.',
    ].join('\n'),
    CreatePersonaExperienciaShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildPersonaExperienciaBody(args as PersonaExperienciaFields);
        const result = await client.createPersonalExperiencia(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_personal_formacion
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_personal_formacion',
    [
      'Da de alta una formación académica o profesional de una persona.',
      '',
      'Endpoint: POST /pers/v2/personal-formaciones — body VoPersonalFormaciones.',
      '',
      'El body de este endpoint no tiene campos conocidos en la especificación;',
      'usa `camposAdicionales` para pasar los campos nativos del Vo.',
    ].join('\n'),
    PassthroughBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPersonalFormacion(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_personal_formacion
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_personal_formacion',
    [
      'Actualiza una formación de personal existente.',
      '',
      'Endpoint: PUT /pers/v2/personal-formaciones/{idReg}.',
      '',
      'El body de este endpoint no tiene campos conocidos en la especificación;',
      'usa `camposAdicionales` para pasar los campos nativos del Vo.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('idReg opaco de la formación (campo "idReg" en freematica_list_personal_formaciones).'),
      ...PassthroughBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const current = await client.getPersonalFormacion(idReg);
        const merged = { ...current, ...(camposAdicionales ?? {}) };
        const result = await client.updatePersonalFormacion(idReg, merged);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_incidencia_base
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_incidencia_base',
    [
      'Da de alta una incidencia base de personal.',
      '',
      'Endpoint: POST /pers/v2/incidencias-base — body vacío o con campos nativos.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo de incidencia.',
    ].join('\n'),
    PassthroughBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createIncidenciaBase(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_incidencia_base_fecha_fin
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_incidencia_base_fecha_fin',
    [
      'Actualiza la fecha de fin de una incidencia base (cierre de incidencia).',
      '',
      'Endpoint: PUT /pers/v2/incidencias-base/{idReg}.',
      '',
      'Usa `camposAdicionales` para pasar fechaFin u otros campos nativos del Vo.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('idReg opaco de la incidencia base.'),
      ...PassthroughBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updateIncidenciaBase(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_personal_pago
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_personal_pago',
    [
      'Da de alta datos bancarios/de pago de una persona.',
      '',
      'Endpoint: POST /pers/v1/personal_pago.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo (IBAN, entidad, etc.).',
    ].join('\n'),
    PassthroughBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPersonalPago(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_personal_pago
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_personal_pago',
    [
      'Actualiza datos bancarios/de pago de una persona.',
      '',
      'Endpoint: PUT /pers/v1/personal_pago/{idreg}.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('idReg opaco del registro de pago (campo "idReg" en freematica_list_personal_pago).'),
      ...PassthroughBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const current = await client.getPersonalPago(idReg);
        const merged = { ...current, ...(camposAdicionales ?? {}) };
        const result = await client.updatePersonalPago(idReg, merged);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_personal_tramo
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_personal_tramo',
    [
      'Da de alta un tramo horario laboral para una persona.',
      '',
      'Endpoint: POST /pers/v1/personal_tramos — body VoPersonalTramos (PERHH_*).',
      '',
      'Los tramos definen los horarios de trabajo vigentes en un período.',
    ].join('\n'),
    CreatePersonaTramoShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildPersonaTramoBody(args as PersonaTramoFields);
        const result = await client.createPersonalTramo(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_personal_tramo
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_personal_tramo',
    [
      'Actualiza un tramo horario laboral (v1).',
      '',
      'Endpoint: PUT /pers/v1/personal_tramos/{idreg}.',
      'Actualización parcial: recupera el estado actual y aplica los cambios.',
    ].join('\n'),
    UpdatePersonaTramoShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...rest }): Promise<CallToolResult> => {
      try {
        const current = await client.getPersonalTramo(idReg);
        const changes = buildPersonaTramoBody(rest as PersonaTramoFields);
        const merged = { ...current, ...changes };
        const result = await client.updatePersonalTramo(idReg, merged);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_personal_contrato
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_personal_contrato',
    [
      'Da de alta un contrato laboral para una persona.',
      '',
      'Endpoint: POST /pers/v1/personal_contratos — body VoPersonalContratos (PERCTRAB_*).',
      '',
      'Registra el contrato laboral con tipo, fechas, categoría y salario.',
    ].join('\n'),
    CreatePersonaContratoShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildPersonaContratoBody(args as PersonaContratoFields);
        const result = await client.createPersonalContrato(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_personal_contrato
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_personal_contrato',
    [
      'Actualiza un contrato laboral existente.',
      '',
      'Endpoint: PUT /pers/v1/personal_contratos/{idreg}.',
      'Actualización parcial: recupera el estado actual y aplica los cambios.',
    ].join('\n'),
    UpdatePersonaContratoShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...rest }): Promise<CallToolResult> => {
      try {
        const current = await client.getPersonalContrato(idReg);
        const changes = buildPersonaContratoBody(rest as PersonaContratoFields);
        const merged = { ...current, ...changes };
        const result = await client.updatePersonalContrato(idReg, merged);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_personal_adicional
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_personal_adicional',
    [
      'Da de alta un dato adicional de personal.',
      '',
      'Endpoint: POST /pers/v2/personal-adicionales — body VoPersonalAdicionales (VSSPERA_*).',
      '',
      'Los datos adicionales son campos configurables por empresa para extender',
      'la ficha de personal más allá de los campos estándar.',
    ].join('\n'),
    CreatePersonaAdicionalShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args): Promise<CallToolResult> => {
      try {
        const body = buildPersonaAdicionalBody(args as PersonaAdicionalFields);
        const result = await client.createPersonalAdicional(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_personal_adicional
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_personal_adicional',
    [
      'Actualiza un dato adicional de personal.',
      '',
      'Endpoint: PUT /pers/v2/personal-adicionales/{idReg}.',
      'Actualización parcial: recupera el estado actual y aplica los cambios.',
    ].join('\n'),
    UpdatePersonaAdicionalShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, ...rest }): Promise<CallToolResult> => {
      try {
        // No tiene GET singular expuesto — enviar solo los cambios
        const body = buildPersonaAdicionalBody(rest as PersonaAdicionalFields);
        const result = await client.updatePersonalAdicional(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_anticipo_personal
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_anticipo_personal',
    [
      'Da de alta un anticipo de nómina para una persona.',
      '',
      'Endpoint: POST /pers/v2/personal/anticipos.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo de anticipo.',
    ].join('\n'),
    PassthroughBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createAnticipoPersonal(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_calendario_personal
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_calendario_personal',
    [
      'Da de alta una entrada en el calendario personal de un empleado.',
      '',
      'Endpoint: POST /pers/v2/personal-cal.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo (vacaciones,',
      'permisos, ausencias, días especiales).',
    ].join('\n'),
    PassthroughBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createCalendarioPersonal(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_calendario_personal
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_calendario_personal',
    [
      'Actualiza una entrada del calendario personal.',
      '',
      'Endpoint: PUT /pers/v2/personal-cal/{idReg}.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('idReg opaco de la entrada de calendario (campo "idReg" en freematica_list_calendario_personal).'),
      ...PassthroughBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const current = await client.getCalendarioPersonal(idReg);
        const merged = { ...current, ...(camposAdicionales ?? {}) };
        const result = await client.updateCalendarioPersonal(idReg, merged);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_cpd_bulk
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_cpd_bulk',
    [
      'Actualización masiva del CPD (Cuadro Personal de Documentos).',
      '',
      'Endpoint: POST /pers/v1/cpd/actualizar.',
      '',
      'El body de este endpoint está vacío en la especificación; usa',
      '`camposAdicionales` para pasar los campos nativos que sean necesarios.',
    ].join('\n'),
    PassthroughBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updateCpdBulk(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_cpd_gestion
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_cpd_gestion',
    [
      'Gestiona (aprueba, rechaza, firma) un documento CPD.',
      '',
      'Endpoint: PUT /pers/v1/cpd/{idreg}/gestion.',
      '',
      'Campos principales:',
      '- accionCpd: acción a realizar (aprobar, rechazar, firmar, etc.)',
      '- fechaGestion: fecha de gestión (YYYY-MM-DD)',
      '- noComunicar: si no se notifica al empleado',
      '- documentoCPD: referencia al documento',
      '- usuarioGestion: usuario que realiza la gestión',
    ].join('\n'),
    UpdateCpdGestionShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ idReg, ...rest }): Promise<CallToolResult> => {
      try {
        const body = buildCpdGestionBody(rest as CpdGestionFields);
        const result = await client.updateCpdGestion(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_personal_irpf
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_personal_irpf',
    [
      'Da de alta los datos de IRPF de una persona.',
      '',
      'Endpoint: POST /pers/v2/personal_irpf.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo de IRPF.',
    ].join('\n'),
    PassthroughBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPersonalIrpf(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_personal_irpf
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_personal_irpf',
    [
      'Actualiza los datos de IRPF de una persona.',
      '',
      'Endpoint: PUT /pers/v2/personal_irpf/{idreg}.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('idReg opaco de los datos IRPF (campo "idReg" en freematica_list_personal_irpf).'),
      ...PassthroughBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const current = await client.getPersonalIrpf(idReg);
        const merged = { ...current, ...(camposAdicionales ?? {}) };
        const result = await client.updatePersonalIrpf(idReg, merged);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_create_personal_irpf_ad
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_create_personal_irpf_ad',
    [
      'Da de alta datos adicionales de IRPF de una persona.',
      '',
      'Endpoint: POST /pers/v2/personal_irpf_ad/{idreg}.',
      'El `idReg` es el identificador del registro IRPF principal.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('idReg opaco del registro IRPF principal (campo "idReg" en freematica_list_personal_irpf).'),
      ...PassthroughBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.createPersonalIrpfAd(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_personal_irpf_ad
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_personal_irpf_ad',
    [
      'Actualiza datos adicionales de IRPF de una persona.',
      '',
      'Endpoint: PUT /pers/v2/personal_irpf_ad/{idreg}.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo.',
    ].join('\n'),
    {
      idReg: z.string().min(1).describe('idReg opaco de los datos adicionales IRPF.'),
      ...PassthroughBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ idReg, camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePersonalIrpfAd(idReg, body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_preventor
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_preventor',
    [
      'Actualiza datos del preventor laboral.',
      '',
      'Endpoint: PUT /pers/v1/control/preventor.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo.',
    ].join('\n'),
    PassthroughBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePreventor(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // freematica_update_preventor_estado
  // -------------------------------------------------------------------------
  server.tool(
    'freematica_update_preventor_estado',
    [
      'Actualiza el estado del preventor laboral.',
      '',
      'Endpoint: POST /pers/v2/preventor/actualizar-estado.',
      '',
      'Usa `camposAdicionales` para pasar los campos nativos del Vo.',
    ].join('\n'),
    PassthroughBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ camposAdicionales }): Promise<CallToolResult> => {
      try {
        const body: Record<string, unknown> = { ...(camposAdicionales ?? {}) };
        const result = await client.updatePreventorEstado(body);
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}
