import { z } from 'zod';

/**
 * Zod schemas (raw shapes) y builders de body para las tools de escritura del
 * módulo de Personal/RRHH (pers).
 *
 * Convención: nombres amigables en castellano traducidos a los campos nativos
 * del API (VSSPER_*, PERNOT_*, PEREX_*, PERHH_*, PERCTRAB_*, VSSPERA_*).
 * Solo se incluyen en el body los campos definidos. Los campos menos comunes
 * se pasan en `camposAdicionales` con su nombre nativo.
 */

/** Añade `target[key] = value` solo si value !== undefined. */
function setIf(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) target[key] = value;
}

/**
 * Passthrough de campos nativos no expuestos con nombre amigable.
 * Se validan las claves con estilo de columna Freemática (mayúsculas + '_').
 */
const camposAdicionales = (ejemplo: string) =>
  z
    .record(
      z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Las claves deben ser columnas Freemática (MAYUSCULAS_CON_GUION_BAJO)'),
      z.union([z.string(), z.number()]),
    )
    .optional()
    .describe(
      `Campos nativos adicionales del Vo correspondiente (ej: ${ejemplo}). Ver spec OpenAPI para la lista completa.`,
    );

// ---------------------------------------------------------------------------
// Passthrough body (para endpoints con body vacío o desconocido en Postman)
// ---------------------------------------------------------------------------

export const PassthroughBodyShape = {
  camposAdicionales: camposAdicionales('CAMPO_NATIVO_1, CAMPO_NATIVO_2'),
};

// ---------------------------------------------------------------------------
// Personal maestro — VoPersonal (VSSPER_*)
// ---------------------------------------------------------------------------

const personaOptionalFieldsShape = {
  apellido2: z.string().max(50).optional().describe('Segundo apellido (VSSPER_APELL2, 50c).'),
  email: z.string().max(100).optional().describe('Correo electrónico (VSSPER_EMAIL, 100c).'),
  camposAdicionales: camposAdicionales('VSSPER_SIT, VSSPER_DPTO, VSSPER_SECCION, VSSPER_CATEG'),
};

export const CreatePersonaShape = {
  empresa: z.string().min(1).describe('Código de empresa (VSSPER_EMP). Requerido.'),
  delegacion: z.string().min(1).describe('Código de delegación (VSSPER_DELEG). Requerido.'),
  codPersona: z.string().min(1).max(10).describe('Código natural de la persona (VSSPER_COD, 10c). Requerido.'),
  apellido1: z.string().min(1).max(50).describe('Primer apellido (VSSPER_APELL1, 50c). Requerido.'),
  nombre: z.string().min(1).max(50).describe('Nombre de la persona (VSSPER_NOM, 50c). Requerido.'),
  nif: z.string().max(15).optional().describe('NIF/DNI de la persona (VSSPER_NIF, 15c).'),
  ...personaOptionalFieldsShape,
};

export const UpdatePersonaShape = {
  idReg: z.string().min(1).describe('idReg opaco de la persona (campo "idReg" en freematica_list_personal).'),
  empresa: z.string().min(1).optional().describe('Código de empresa (VSSPER_EMP).'),
  delegacion: z.string().min(1).optional().describe('Código de delegación (VSSPER_DELEG).'),
  codPersona: z.string().min(1).max(10).optional().describe('Código natural de la persona (VSSPER_COD, 10c).'),
  apellido1: z.string().max(50).optional().describe('Primer apellido (VSSPER_APELL1, 50c).'),
  nombre: z.string().max(50).optional().describe('Nombre de la persona (VSSPER_NOM, 50c).'),
  nif: z.string().max(15).optional().describe('NIF/DNI de la persona (VSSPER_NIF, 15c).'),
  ...personaOptionalFieldsShape,
};

export type PersonaFields = {
  empresa?: string;
  delegacion?: string;
  codPersona?: string;
  apellido1?: string;
  apellido2?: string;
  nombre?: string;
  nif?: string;
  email?: string;
  camposAdicionales?: Record<string, string | number>;
};

/** Construye el body VoPersonal con los campos definidos. */
export function buildPersonaBody(args: PersonaFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'VSSPER_EMP', args.empresa);
  setIf(body, 'VSSPER_DELEG', args.delegacion);
  setIf(body, 'VSSPER_COD', args.codPersona);
  setIf(body, 'VSSPER_APELL1', args.apellido1);
  setIf(body, 'VSSPER_APELL2', args.apellido2);
  setIf(body, 'VSSPER_NOM', args.nombre);
  setIf(body, 'VSSPER_NIF', args.nif);
  setIf(body, 'VSSPER_EMAIL', args.email);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Notas de personal — VoPersonalNotas (PERNOT_*)
// ---------------------------------------------------------------------------

const personaNotaFieldsShape = {
  empresa: z.string().optional().describe('Código de empresa (PERNOT_EMP).'),
  delegacion: z.string().optional().describe('Código de delegación (PERNOT_DELEG).'),
  idPersona: z.string().optional().describe('idReg de la persona a la que pertenece la nota (PERNOT_PERSO).'),
  tipo: z.string().optional().describe('Tipo de nota (PERNOT_TIPO).'),
  linea: z.number().int().optional().describe('Número de línea (PERNOT_LIN).'),
  descripcion: z.string().optional().describe('Descripción de la nota (PERNOT_DES).'),
  valor: z.string().optional().describe('Valor de la nota (PERNOT_VALOR).'),
  fecha: z.string().optional().describe('Fecha de la nota formato YYYY-MM-DD (PERNOT_FECHA).'),
  observaciones: z.string().optional().describe('Observaciones (PERNOT_OBS).'),
  camposAdicionales: camposAdicionales('PERNOT_TEXTO, PERNOT_COD'),
};

export const CreatePersonaNotaShape = { ...personaNotaFieldsShape };
export const UpdatePersonaNotaShape = {
  idReg: z.string().min(1).describe('idReg opaco de la nota (campo "idReg" en freematica_list_personal_notas).'),
  ...personaNotaFieldsShape,
};

export type PersonaNotaFields = {
  empresa?: string;
  delegacion?: string;
  idPersona?: string;
  tipo?: string;
  linea?: number;
  descripcion?: string;
  valor?: string;
  fecha?: string;
  observaciones?: string;
  camposAdicionales?: Record<string, string | number>;
};

/** Construye el body VoPersonalNotas con los campos definidos. */
export function buildPersonaNotaBody(args: PersonaNotaFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'PERNOT_EMP', args.empresa);
  setIf(body, 'PERNOT_DELEG', args.delegacion);
  setIf(body, 'PERNOT_PERSO', args.idPersona);
  setIf(body, 'PERNOT_TIPO', args.tipo);
  setIf(body, 'PERNOT_LIN', args.linea);
  setIf(body, 'PERNOT_DES', args.descripcion);
  setIf(body, 'PERNOT_VALOR', args.valor);
  setIf(body, 'PERNOT_FECHA', args.fecha);
  setIf(body, 'PERNOT_OBS', args.observaciones);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Experiencia profesional — VoPersonalExperiencias (PEREX_*)
// ---------------------------------------------------------------------------

export const CreatePersonaExperienciaShape = {
  empresa: z.string().optional().describe('Código de empresa (PEREX_EMP).'),
  delegacion: z.string().optional().describe('Código de delegación (PEREX_DELEG).'),
  idPersona: z.string().optional().describe('idReg de la persona (PEREX_PERSONA).'),
  fecha: z.string().optional().describe('Fecha de inicio formato YYYY-MM-DD (PEREX_FECHA).'),
  descripcion: z.string().optional().describe('Descripción del puesto/experiencia (PEREX_DES).'),
  puesto: z.string().optional().describe('Código de puesto (PEREX_PUESTO).'),
  fechaFin: z.string().optional().describe('Fecha de fin formato YYYY-MM-DD (PEREX_FECHA_FIN).'),
  motivoCese: z.string().optional().describe('Motivo de cese (PEREX_MOT_CESE).'),
  observaciones: z.string().optional().describe('Observaciones (PEREX_OBS).'),
  ocupacion: z.string().optional().describe('Ocupación (PEREX_OCUP).'),
  empresaExterna: z.string().optional().describe('Nombre de empresa externa (PEREX_EMPRESA).'),
  camposAdicionales: camposAdicionales('PEREX_ORDEN, PEREX_CATEG'),
};

export type PersonaExperienciaFields = {
  empresa?: string;
  delegacion?: string;
  idPersona?: string;
  fecha?: string;
  descripcion?: string;
  puesto?: string;
  fechaFin?: string;
  motivoCese?: string;
  observaciones?: string;
  ocupacion?: string;
  empresaExterna?: string;
  camposAdicionales?: Record<string, string | number>;
};

/** Construye el body VoPersonalExperiencias con los campos definidos. */
export function buildPersonaExperienciaBody(args: PersonaExperienciaFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'PEREX_EMP', args.empresa);
  setIf(body, 'PEREX_DELEG', args.delegacion);
  setIf(body, 'PEREX_PERSONA', args.idPersona);
  setIf(body, 'PEREX_FECHA', args.fecha);
  setIf(body, 'PEREX_DES', args.descripcion);
  setIf(body, 'PEREX_PUESTO', args.puesto);
  setIf(body, 'PEREX_FECHA_FIN', args.fechaFin);
  setIf(body, 'PEREX_MOT_CESE', args.motivoCese);
  setIf(body, 'PEREX_OBS', args.observaciones);
  setIf(body, 'PEREX_OCUP', args.ocupacion);
  setIf(body, 'PEREX_EMPRESA', args.empresaExterna);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Tramos horarios — VoPersonalTramos (PERHH_*)
// ---------------------------------------------------------------------------

const personaTramoFieldsShape = {
  empresa: z.string().optional().describe('Código de empresa (PERHH_EMP).'),
  delegacion: z.string().optional().describe('Código de delegación (PERHH_DELEG).'),
  idPersona: z.string().optional().describe('idReg de la persona (PERHH_PERSO).'),
  fechaInicio: z.string().optional().describe('Fecha de inicio del tramo YYYY-MM-DD (PERHH_FEC_INI).'),
  fechaFin: z.string().optional().describe('Fecha de fin del tramo YYYY-MM-DD (PERHH_FEC_FIN).'),
  codHorario: z.string().optional().describe('Código de horario (PERHH_COD_HH).'),
  tipoContrato: z.string().optional().describe('Tipo de contrato (PERHH_TIPO_CTR).'),
  jornada: z.number().optional().describe('Porcentaje de jornada (PERHH_JORNADA).'),
  horasMes: z.number().optional().describe('Horas al mes (PERHH_HORAS_MES).'),
  observaciones: z.string().optional().describe('Observaciones (PERHH_OBS).'),
  camposAdicionales: camposAdicionales('PERHH_TURNO, PERHH_CATEG, PERHH_CTRAB'),
};

export const CreatePersonaTramoShape = { ...personaTramoFieldsShape };
export const UpdatePersonaTramoShape = {
  idReg: z.string().min(1).describe('idReg opaco del tramo (campo "idReg" en freematica_list_personal_tramos).'),
  ...personaTramoFieldsShape,
};

export type PersonaTramoFields = {
  empresa?: string;
  delegacion?: string;
  idPersona?: string;
  fechaInicio?: string;
  fechaFin?: string;
  codHorario?: string;
  tipoContrato?: string;
  jornada?: number;
  horasMes?: number;
  observaciones?: string;
  camposAdicionales?: Record<string, string | number>;
};

/** Construye el body VoPersonalTramos con los campos definidos. */
export function buildPersonaTramoBody(args: PersonaTramoFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'PERHH_EMP', args.empresa);
  setIf(body, 'PERHH_DELEG', args.delegacion);
  setIf(body, 'PERHH_PERSO', args.idPersona);
  setIf(body, 'PERHH_FEC_INI', args.fechaInicio);
  setIf(body, 'PERHH_FEC_FIN', args.fechaFin);
  setIf(body, 'PERHH_COD_HH', args.codHorario);
  setIf(body, 'PERHH_TIPO_CTR', args.tipoContrato);
  setIf(body, 'PERHH_JORNADA', args.jornada);
  setIf(body, 'PERHH_HORAS_MES', args.horasMes);
  setIf(body, 'PERHH_OBS', args.observaciones);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Contratos laborales — VoPersonalContratos (PERCTRAB_*)
// ---------------------------------------------------------------------------

const personaContratoFieldsShape = {
  empresa: z.string().optional().describe('Código de empresa (PERCTRAB_EMP).'),
  delegacion: z.string().optional().describe('Código de delegación (PERCTRAB_DELEG).'),
  idPersona: z.string().optional().describe('idReg de la persona (PERCTRAB_PERSO).'),
  fechaInicio: z.string().optional().describe('Fecha de inicio del contrato YYYY-MM-DD (PERCTRAB_FEC_INI).'),
  fechaFin: z.string().optional().describe('Fecha de fin del contrato YYYY-MM-DD (PERCTRAB_FEC_FIN).'),
  tipoContrato: z.string().optional().describe('Tipo de contrato (PERCTRAB_TIPO).'),
  categoria: z.string().optional().describe('Categoría del empleado (PERCTRAB_CATEG).'),
  salarioBruto: z.number().optional().describe('Salario bruto anual (PERCTRAB_SAL_BRUTO).'),
  observaciones: z.string().optional().describe('Observaciones (PERCTRAB_OBS).'),
  camposAdicionales: camposAdicionales('PERCTRAB_COD_CC, PERCTRAB_GRUPO_COT, PERCTRAB_EPIG_IAE'),
};

export const CreatePersonaContratoShape = { ...personaContratoFieldsShape };
export const UpdatePersonaContratoShape = {
  idReg: z.string().min(1).describe('idReg opaco del contrato (campo "idReg" en freematica_list_personal_contratos).'),
  ...personaContratoFieldsShape,
};

export type PersonaContratoFields = {
  empresa?: string;
  delegacion?: string;
  idPersona?: string;
  fechaInicio?: string;
  fechaFin?: string;
  tipoContrato?: string;
  categoria?: string;
  salarioBruto?: number;
  observaciones?: string;
  camposAdicionales?: Record<string, string | number>;
};

/** Construye el body VoPersonalContratos con los campos definidos. */
export function buildPersonaContratoBody(args: PersonaContratoFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'PERCTRAB_EMP', args.empresa);
  setIf(body, 'PERCTRAB_DELEG', args.delegacion);
  setIf(body, 'PERCTRAB_PERSO', args.idPersona);
  setIf(body, 'PERCTRAB_FEC_INI', args.fechaInicio);
  setIf(body, 'PERCTRAB_FEC_FIN', args.fechaFin);
  setIf(body, 'PERCTRAB_TIPO', args.tipoContrato);
  setIf(body, 'PERCTRAB_CATEG', args.categoria);
  setIf(body, 'PERCTRAB_SAL_BRUTO', args.salarioBruto);
  setIf(body, 'PERCTRAB_OBS', args.observaciones);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Datos adicionales de personal — VoPersonalAdicionales (VSSPERA_*)
// ---------------------------------------------------------------------------

const personaAdicionalFieldsShape = {
  empresa: z.string().optional().describe('Código de empresa (VSSPERA_EMP).'),
  delegacion: z.string().optional().describe('Código de delegación (VSSPERA_DELEG).'),
  idPersona: z.string().optional().describe('idReg de la persona (VSSPERA_PERSO).'),
  codCampo: z.string().optional().describe('Código del campo adicional (VSSPERA_COD).'),
  contador: z.number().int().optional().describe('Número de instancia del campo (VSSPERA_CNT).'),
  texto: z.string().optional().describe('Valor textual del campo (VSSPERA_TEXTO).'),
  numero: z.number().optional().describe('Valor numérico del campo (VSSPERA_NUM).'),
  fecha: z.string().optional().describe('Valor fecha del campo YYYY-MM-DD (VSSPERA_FCH).'),
  valorTabla: z.string().optional().describe('Valor de tabla/catalogo (VSSPERA_VAL_TAB).'),
  descripcionTabla: z.string().optional().describe('Descripción del valor de tabla (VSSPERA_DESCR_TAB).'),
  observaciones: z.string().optional().describe('Observaciones (VSSPERA_OBS).'),
  camposAdicionales: camposAdicionales('VSSPERA_ORDEN, VSSPERA_TIPO'),
};

export const CreatePersonaAdicionalShape = { ...personaAdicionalFieldsShape };
export const UpdatePersonaAdicionalShape = {
  idReg: z.string().min(1).describe('idReg opaco del dato adicional (campo "idReg" en freematica_list_personal_adicionales).'),
  ...personaAdicionalFieldsShape,
};

export type PersonaAdicionalFields = {
  empresa?: string;
  delegacion?: string;
  idPersona?: string;
  codCampo?: string;
  contador?: number;
  texto?: string;
  numero?: number;
  fecha?: string;
  valorTabla?: string;
  descripcionTabla?: string;
  observaciones?: string;
  camposAdicionales?: Record<string, string | number>;
};

/** Construye el body VoPersonalAdicionales con los campos definidos. */
export function buildPersonaAdicionalBody(args: PersonaAdicionalFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'VSSPERA_EMP', args.empresa);
  setIf(body, 'VSSPERA_DELEG', args.delegacion);
  setIf(body, 'VSSPERA_PERSO', args.idPersona);
  setIf(body, 'VSSPERA_COD', args.codCampo);
  setIf(body, 'VSSPERA_CNT', args.contador);
  setIf(body, 'VSSPERA_TEXTO', args.texto);
  setIf(body, 'VSSPERA_NUM', args.numero);
  setIf(body, 'VSSPERA_FCH', args.fecha);
  setIf(body, 'VSSPERA_VAL_TAB', args.valorTabla);
  setIf(body, 'VSSPERA_DESCR_TAB', args.descripcionTabla);
  setIf(body, 'VSSPERA_OBS', args.observaciones);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// CPD gestion — body de PUT /pers/v1/cpd/{idreg}/gestion
// ---------------------------------------------------------------------------

export const UpdateCpdGestionShape = {
  idReg: z.string().min(1).describe('idReg opaco del CPD (campo "idReg" en freematica_list_cpd).'),
  accionCpd: z.string().optional().describe('Acción a realizar sobre el CPD (accionCpd).'),
  fechaGestion: z.string().optional().describe('Fecha de gestión YYYY-MM-DD (fechaGestion).'),
  noComunicar: z.boolean().optional().describe('No comunicar el resultado al empleado (noComunicar).'),
  documentoCPD: z.string().optional().describe('Referencia al documento CPD (documentoCPD).'),
  usuarioGestion: z.string().optional().describe('Usuario que gestiona (usuarioGestion).'),
  obsError: z.string().optional().describe('Observaciones de error (obsError).'),
  obsRechazado: z.string().optional().describe('Observaciones de rechazo (obsRechazado).'),
  noVerifEstado: z.boolean().optional().describe('No verificar estado previo (noVerifEstado).'),
};

export type CpdGestionFields = {
  accionCpd?: string;
  fechaGestion?: string;
  noComunicar?: boolean;
  documentoCPD?: string;
  usuarioGestion?: string;
  obsError?: string;
  obsRechazado?: string;
  noVerifEstado?: boolean;
};

/** Construye el body para PUT /pers/v1/cpd/{idreg}/gestion. */
export function buildCpdGestionBody(args: CpdGestionFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'accionCpd', args.accionCpd);
  setIf(body, 'fechaGestion', args.fechaGestion);
  setIf(body, 'noComunicar', args.noComunicar);
  setIf(body, 'documentoCPD', args.documentoCPD);
  setIf(body, 'usuarioGestion', args.usuarioGestion);
  setIf(body, 'obsError', args.obsError);
  setIf(body, 'obsRechazado', args.obsRechazado);
  setIf(body, 'noVerifEstado', args.noVerifEstado);
  return body;
}
