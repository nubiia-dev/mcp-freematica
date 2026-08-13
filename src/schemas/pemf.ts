import { z } from 'zod';

/** Añade `target[key] = value` solo si value !== undefined. */
function setIf(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) target[key] = value;
}

const camposAdicionales = z
  .record(
    z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Las claves deben ser columnas Freemática (MAYUSCULAS_CON_GUION_BAJO)'),
    z.union([z.string(), z.number()]),
  )
  .optional()
  .describe('Campos nativos adicionales del Vo (ej: MOV_CAMPO1). Ver spec OpenAPI para la lista completa.');

// ---------------------------------------------------------------------------
// Marcaje pemf — POST /pemf/v1/servicio/:idservicio/crear-marcaje
// ---------------------------------------------------------------------------

export const CreatePemfMarcajeShape = {
  idReg: z.string().optional().describe('idReg del marcaje (idReg).'),
  date: z.string().optional().describe('Fecha y hora ISO del marcaje (date).'),
  trackType: z.enum(['ENT', 'NOV', 'SAL', 'I', 'A', 'POS']).optional().describe('Tipo de marcaje: ENT=Entrada, NOV=Novedad, SAL=Salida, I=Incidencia, A=Alarma, POS=Posición (trackType).'),
  serviceTag: z.string().optional().describe('Tag del servicio (serviceTag).'),
  device: z.string().optional().describe('Identificador del dispositivo (device).'),
  latitude: z.number().optional().describe('Latitud GPS (latitude).'),
  longitude: z.number().optional().describe('Longitud GPS (longitude).'),
  incidenceDescription: z.string().optional().describe('Descripción de incidencia (incidenceDescription).'),
  incidence: z.string().optional().describe('Código de incidencia (incidence).'),
  personTag: z.string().optional().describe('Tag de la persona/operario (personTag).'),
  positionOrigin: z.enum(['network', 'gps', 'fixed']).optional().describe('Origen de la posición: network, gps o fixed (positionOrigin).'),
  positionPrecision: z.number().optional().describe('Precisión de la posición en metros (positionPrecision).'),
  photo: z.string().optional().describe('Foto en base64 (photo).'),
  appVersion: z.string().optional().describe('Versión de la app (appVersion).'),
  deviceVersion: z.string().optional().describe('Versión del dispositivo (deviceVersion).'),
  deviceLang: z.string().optional().describe('Idioma del dispositivo (deviceLang).'),
  noRestriction: z.boolean().optional().describe('Sin restricción de horario (noRestriction).'),
  camposAdicionales,
};

export const CreatePemfMarcajeFechaPersonaShape = {
  date: z.string().optional().describe('Fecha del marcaje ISO (date).'),
  personTag: z.string().optional().describe('Tag de la persona (personTag).'),
  serviceTag: z.string().optional().describe('Tag del servicio (serviceTag).'),
  trackType: z.enum(['ENT', 'NOV', 'SAL', 'I', 'A', 'POS']).optional().describe('Tipo de marcaje: ENT, NOV, SAL, I, A, POS (trackType).'),
  camposAdicionales,
};

export type PemfMarcajeFields = {
  idReg?: string;
  date?: string;
  trackType?: 'ENT' | 'NOV' | 'SAL' | 'I' | 'A' | 'POS';
  serviceTag?: string;
  device?: string;
  latitude?: number;
  longitude?: number;
  incidenceDescription?: string;
  incidence?: string;
  personTag?: string;
  positionOrigin?: 'network' | 'gps' | 'fixed';
  positionPrecision?: number;
  photo?: string;
  appVersion?: string;
  deviceVersion?: string;
  deviceLang?: string;
  noRestriction?: boolean;
  camposAdicionales?: Record<string, string | number>;
};

export type PemfMarcajeFechaPersonaFields = {
  date?: string;
  personTag?: string;
  serviceTag?: string;
  trackType?: 'ENT' | 'NOV' | 'SAL' | 'I' | 'A' | 'POS';
  camposAdicionales?: Record<string, string | number>;
};

export function buildPemfMarcajeBody(args: PemfMarcajeFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'idReg', args.idReg);
  setIf(body, 'date', args.date);
  setIf(body, 'trackType', args.trackType);
  setIf(body, 'serviceTag', args.serviceTag);
  setIf(body, 'device', args.device);
  setIf(body, 'latitude', args.latitude);
  setIf(body, 'longitude', args.longitude);
  setIf(body, 'incidenceDescription', args.incidenceDescription);
  setIf(body, 'incidence', args.incidence);
  setIf(body, 'personTag', args.personTag);
  setIf(body, 'positionOrigin', args.positionOrigin);
  setIf(body, 'positionPrecision', args.positionPrecision);
  setIf(body, 'photo', args.photo);
  setIf(body, 'appVersion', args.appVersion);
  setIf(body, 'deviceVersion', args.deviceVersion);
  setIf(body, 'deviceLang', args.deviceLang);
  setIf(body, 'noRestriction', args.noRestriction);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

export function buildPemfMarcajeFechaPersonaBody(args: PemfMarcajeFechaPersonaFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'date', args.date);
  setIf(body, 'personTag', args.personTag);
  setIf(body, 'serviceTag', args.serviceTag);
  setIf(body, 'trackType', args.trackType);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Dispositivo pemf — POST /pemf/v1/devices + PUT /pemf/v1/devices/:idDevice
// ---------------------------------------------------------------------------

const deviceFieldsShape = {
  name: z.string().optional().describe('Nombre del dispositivo (name).'),
  description: z.string().optional().describe('Descripción del dispositivo (description).'),
  type: z.string().optional().describe('Tipo de dispositivo (type).'),
  status: z.string().optional().describe('Estado del dispositivo (status).'),
  serialNumber: z.string().optional().describe('Número de serie (serialNumber).'),
  serviceTag: z.string().optional().describe('Tag del servicio asociado (serviceTag).'),
  camposAdicionales,
};

export const CreatePemfDeviceShape = {
  ...deviceFieldsShape,
};

export const UpdatePemfDeviceShape = {
  idDevice: z.string().min(1).describe('Identificador del dispositivo (campo idReg o idDevice de freematica_list_pemf_devices).'),
  ...deviceFieldsShape,
};

export type PemfDeviceFields = {
  name?: string;
  description?: string;
  type?: string;
  status?: string;
  serialNumber?: string;
  serviceTag?: string;
  camposAdicionales?: Record<string, string | number>;
};

export function buildPemfDeviceBody(args: PemfDeviceFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'name', args.name);
  setIf(body, 'description', args.description);
  setIf(body, 'type', args.type);
  setIf(body, 'status', args.status);
  setIf(body, 'serialNumber', args.serialNumber);
  setIf(body, 'serviceTag', args.serviceTag);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Ronda pemf — POST /pemf/v1/rounds
// ---------------------------------------------------------------------------

export const CreatePemfRondaShape = {
  name: z.string().optional().describe('Nombre de la ronda (name).'),
  description: z.string().optional().describe('Descripción de la ronda (description).'),
  serviceTag: z.string().optional().describe('Tag del servicio (serviceTag).'),
  startDate: z.string().optional().describe('Fecha de inicio ISO (startDate).'),
  endDate: z.string().optional().describe('Fecha de fin ISO (endDate).'),
  camposAdicionales,
};

export type PemfRondaFields = {
  name?: string;
  description?: string;
  serviceTag?: string;
  startDate?: string;
  endDate?: string;
  camposAdicionales?: Record<string, string | number>;
};

export function buildPemfRondaBody(args: PemfRondaFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'name', args.name);
  setIf(body, 'description', args.description);
  setIf(body, 'serviceTag', args.serviceTag);
  setIf(body, 'startDate', args.startDate);
  setIf(body, 'endDate', args.endDate);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Ruta pemf — PUT /pemf/v2/routes/:idReg (body completo del Postman)
// ---------------------------------------------------------------------------

export const UpdatePemfRutaShape = {
  idReg: z.string().min(1).describe('idReg opaco de la ruta (campo idReg de freematica_list_pemf_rutas).'),
  empresa: z.string().optional().describe('Código de empresa (empresa).'),
  delegacion: z.string().optional().describe('Código de delegación (delegacion).'),
  claseServicio: z.string().optional().describe('Clase de servicio (claseServicio).'),
  contrato: z.string().optional().describe('Número de contrato (contrato).'),
  servicio: z.string().optional().describe('Código de servicio (servicio).'),
  turno: z.union([z.string(), z.number()]).optional().describe('Turno (turno). Numérico en la API (ej. 0).'),
  frecuencia: z.string().optional().describe('Frecuencia de la ruta (frecuencia).'),
  diaDef: z.string().optional().describe('Día definición (diaDef).'),
  hhPpto: z.number().optional().describe('Horas presupuestadas (hhPpto).'),
  hhRealizar: z.number().optional().describe('Horas a realizar (hhRealizar).'),
  persona: z.string().optional().describe('Código de persona asignada (persona).'),
  empPerso: z.string().optional().describe('Empresa de la persona (empPerso).'),
  delegPerso: z.string().optional().describe('Delegación de la persona (delegPerso).'),
  tarea: z.string().optional().describe('Código de tarea (tarea).'),
  hhIni: z.string().optional().describe('Hora de inicio HH:MM (hhIni).'),
  hhFin: z.string().optional().describe('Hora de fin HH:MM (hhFin).'),
  tipoAsign: z.string().optional().describe('Tipo de asignación (tipoAsign).'),
  generarTurnosSQ: z.boolean().optional().describe('Generar turnos SQ (generarTurnosSQ).'),
  detFrec: z.string().optional().describe('Detalle de frecuencia (detFrec).'),
  diasNoServ: z.string().optional().describe('Días sin servicio (diasNoServ).'),
  hhRealizarDesp: z.number().optional().describe('Horas a realizar desplazamiento (hhRealizarDesp).'),
  hhIniDesp: z.string().optional().describe('Hora inicio desplazamiento HH:MM (hhIniDesp).'),
  hhFinDesp: z.string().optional().describe('Hora fin desplazamiento HH:MM (hhFinDesp).'),
  codTarea: z.string().optional().describe('Código de tarea alternativo (codTarea).'),
  fchIni: z.string().optional().describe('Fecha de inicio ISO (fchIni).'),
  tipoAsignDesp: z.string().optional().describe('Tipo asignación desplazamiento (tipoAsignDesp).'),
  usuarioUpdate: z.string().optional().describe('Usuario que actualiza (usuarioUpdate).'),
  fechaUpdate: z.string().optional().describe('Fecha de actualización ISO (fechaUpdate).'),
  diasDecalaje: z.number().optional().describe('Días de decalaje (diasDecalaje).'),
  camposAdicionales,
};

export type PemfRutaFields = {
  empresa?: string;
  delegacion?: string;
  claseServicio?: string;
  contrato?: string;
  servicio?: string;
  turno?: string | number;
  frecuencia?: string;
  diaDef?: string;
  hhPpto?: number;
  hhRealizar?: number;
  persona?: string;
  empPerso?: string;
  delegPerso?: string;
  tarea?: string;
  hhIni?: string;
  hhFin?: string;
  tipoAsign?: string;
  generarTurnosSQ?: boolean;
  detFrec?: string;
  diasNoServ?: string;
  hhRealizarDesp?: number;
  hhIniDesp?: string;
  hhFinDesp?: string;
  codTarea?: string;
  fchIni?: string;
  tipoAsignDesp?: string;
  usuarioUpdate?: string;
  fechaUpdate?: string;
  diasDecalaje?: number;
  camposAdicionales?: Record<string, string | number>;
};

export function buildPemfRutaBody(args: PemfRutaFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'empresa', args.empresa);
  setIf(body, 'delegacion', args.delegacion);
  setIf(body, 'claseServicio', args.claseServicio);
  setIf(body, 'contrato', args.contrato);
  setIf(body, 'servicio', args.servicio);
  setIf(body, 'turno', args.turno);
  setIf(body, 'frecuencia', args.frecuencia);
  setIf(body, 'diaDef', args.diaDef);
  setIf(body, 'hhPpto', args.hhPpto);
  setIf(body, 'hhRealizar', args.hhRealizar);
  setIf(body, 'persona', args.persona);
  setIf(body, 'empPerso', args.empPerso);
  setIf(body, 'delegPerso', args.delegPerso);
  setIf(body, 'tarea', args.tarea);
  setIf(body, 'hhIni', args.hhIni);
  setIf(body, 'hhFin', args.hhFin);
  setIf(body, 'tipoAsign', args.tipoAsign);
  setIf(body, 'generarTurnosSQ', args.generarTurnosSQ);
  setIf(body, 'detFrec', args.detFrec);
  setIf(body, 'diasNoServ', args.diasNoServ);
  setIf(body, 'hhRealizarDesp', args.hhRealizarDesp);
  setIf(body, 'hhIniDesp', args.hhIniDesp);
  setIf(body, 'hhFinDesp', args.hhFinDesp);
  setIf(body, 'codTarea', args.codTarea);
  setIf(body, 'fchIni', args.fchIni);
  setIf(body, 'tipoAsignDesp', args.tipoAsignDesp);
  setIf(body, 'usuarioUpdate', args.usuarioUpdate);
  setIf(body, 'fechaUpdate', args.fechaUpdate);
  setIf(body, 'diasDecalaje', args.diasDecalaje);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Config pemf — POST/PUT /pemf/v1/config/:idConfig y v2
// ---------------------------------------------------------------------------

export const SavePemfConfigShape = {
  idConfig: z.string().min(1).describe('Identificador del módulo de configuración (idConfig).'),
  version: z.union([z.literal('v1'), z.literal('v2')]).default('v1').describe('Versión del endpoint: v1 (default) o v2.'),
  camposAdicionales,
};

export const UpdatePemfConfigShape = {
  idConfig: z.string().min(1).describe('Identificador del módulo de configuración (idConfig).'),
  version: z.union([z.literal('v1'), z.literal('v2')]).default('v1').describe('Versión del endpoint: v1 (default) o v2.'),
  camposAdicionales,
};
