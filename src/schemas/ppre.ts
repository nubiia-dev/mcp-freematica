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
  .describe('Campos nativos adicionales del Vo (ej: CON_CAMPO1, AVI_CAMPO2). Ver spec OpenAPI para la lista completa.');

// ---------------------------------------------------------------------------
// Contratos ppre — POST /ppre/v2/contratos
// ---------------------------------------------------------------------------

export const CreatePpreContratoShape = {
  CON_CODEMP: z.string().optional().describe('Código Empresa (CON_CODEMP).'),
  CON_DELEG: z.string().optional().describe('Código Delegación (CON_DELEG).'),
  CON_TIPOCONT: z.string().optional().describe('Tipo de contrato (CON_TIPOCONT).'),
  CON_NUMCONT: z.number().nullable().optional().describe('Número de contrato (CON_NUMCONT).'),
  CON_CODCLI: z.string().optional().describe('Código de cliente (CON_CODCLI).'),
  CON_INSTALACION: z.number().nullable().optional().describe('Código de instalación (CON_INSTALACION).'),
  CON_NOM_INSTALACION: z.string().optional().describe('Nombre de instalación (CON_NOM_INSTALACION).'),
  CON_ABONADO: z.string().optional().describe('Número de abonado (CON_ABONADO).'),
  CON_CLAVEFAC: z.string().optional().describe('Clave de facturación (CON_CLAVEFAC).'),
  CON_CONTACTO: z.string().optional().describe('Persona de contacto (CON_CONTACTO).'),
  CON_TELEFONO: z.string().optional().describe('Teléfono principal (CON_TELEFONO).'),
  CON_TELEFONO2: z.string().optional().describe('Teléfono 2 (CON_TELEFONO2).'),
  CON_TELEFONO3: z.string().optional().describe('Teléfono 3 (CON_TELEFONO3).'),
  CON_IMP_CUOTA_ANY: z.number().nullable().optional().describe('Importe cuota anual (CON_IMP_CUOTA_ANY).'),
  CON_FCHCONT: z.string().optional().describe('Fecha contrato ISO (CON_FCHCONT).'),
  CON_ULTFCH_INTERV: z.string().optional().describe('Última fecha intervención (CON_ULTFCH_INTERV).'),
  CON_PROXFCH_INTERV: z.string().optional().describe('Próxima fecha intervención (CON_PROXFCH_INTERV).'),
  CON_ULTFCH_FAC: z.string().optional().describe('Última fecha facturación (CON_ULTFCH_FAC).'),
  CON_PROXFCH_FAC: z.string().optional().describe('Próxima fecha facturación (CON_PROXFCH_FAC).'),
  CON_OBSERVACIONES: z.string().optional().describe('Observaciones (CON_OBSERVACIONES).'),
  CON_TIPO_MANT: z.string().optional().describe('Tipo de mantenimiento (CON_TIPO_MANT).'),
  CON_TIPO_MANT_DESC: z.string().optional().describe('Descripción tipo mantenimiento (CON_TIPO_MANT_DESC).'),
  DESC_MANT: z.string().optional().describe('Descripción mantenimiento (DESC_MANT).'),
  CON_MANTENEDOR: z.string().optional().describe('Código mantenedor (CON_MANTENEDOR).'),
  NOM_MANTENEDOR: z.string().optional().describe('Nombre mantenedor (NOM_MANTENEDOR).'),
  CON_TIPOCONT_DESC: z.string().optional().describe('Descripción tipo contrato (CON_TIPOCONT_DESC).'),
  NOMBRE_CLI: z.string().optional().describe('Nombre cliente (NOMBRE_CLI).'),
  CON_PERIOD_INTERV: z.number().nullable().optional().describe('Periodo de intervención en meses (CON_PERIOD_INTERV).'),
  CON_FCH_INI_SERVICIO: z.string().optional().describe('Fecha inicio servicio (CON_FCH_INI_SERVICIO).'),
  CON_TIPO_NEGOCIO: z.string().optional().describe('Tipo negocio (CON_TIPO_NEGOCIO).'),
  CON_TIPO_NEGOCIO_DESC: z.string().optional().describe('Descripción tipo negocio (CON_TIPO_NEGOCIO_DESC).'),
  CON_LOC_COBRO: z.number().nullable().optional().describe('Localización de cobro (CON_LOC_COBRO).'),
  camposAdicionales,
};

export type CreatePpreContratoFields = {
  CON_CODEMP?: string;
  CON_DELEG?: string;
  CON_TIPOCONT?: string;
  CON_NUMCONT?: number | null;
  CON_CODCLI?: string;
  CON_INSTALACION?: number | null;
  CON_NOM_INSTALACION?: string;
  CON_ABONADO?: string;
  CON_CLAVEFAC?: string;
  CON_CONTACTO?: string;
  CON_TELEFONO?: string;
  CON_TELEFONO2?: string;
  CON_TELEFONO3?: string;
  CON_IMP_CUOTA_ANY?: number | null;
  CON_FCHCONT?: string;
  CON_ULTFCH_INTERV?: string;
  CON_PROXFCH_INTERV?: string;
  CON_ULTFCH_FAC?: string;
  CON_PROXFCH_FAC?: string;
  CON_OBSERVACIONES?: string;
  CON_TIPO_MANT?: string;
  CON_TIPO_MANT_DESC?: string;
  DESC_MANT?: string;
  CON_MANTENEDOR?: string;
  NOM_MANTENEDOR?: string;
  CON_TIPOCONT_DESC?: string;
  NOMBRE_CLI?: string;
  CON_PERIOD_INTERV?: number | null;
  CON_FCH_INI_SERVICIO?: string;
  CON_TIPO_NEGOCIO?: string;
  CON_TIPO_NEGOCIO_DESC?: string;
  CON_LOC_COBRO?: number | null;
  camposAdicionales?: Record<string, string | number>;
};

export function buildPpreContratoBody(args: CreatePpreContratoFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'CON_CODEMP', args.CON_CODEMP);
  setIf(body, 'CON_DELEG', args.CON_DELEG);
  setIf(body, 'CON_TIPOCONT', args.CON_TIPOCONT);
  if (args.CON_NUMCONT !== undefined) body['CON_NUMCONT'] = args.CON_NUMCONT;
  setIf(body, 'CON_CODCLI', args.CON_CODCLI);
  if (args.CON_INSTALACION !== undefined) body['CON_INSTALACION'] = args.CON_INSTALACION;
  setIf(body, 'CON_NOM_INSTALACION', args.CON_NOM_INSTALACION);
  setIf(body, 'CON_ABONADO', args.CON_ABONADO);
  setIf(body, 'CON_CLAVEFAC', args.CON_CLAVEFAC);
  setIf(body, 'CON_CONTACTO', args.CON_CONTACTO);
  setIf(body, 'CON_TELEFONO', args.CON_TELEFONO);
  setIf(body, 'CON_TELEFONO2', args.CON_TELEFONO2);
  setIf(body, 'CON_TELEFONO3', args.CON_TELEFONO3);
  if (args.CON_IMP_CUOTA_ANY !== undefined) body['CON_IMP_CUOTA_ANY'] = args.CON_IMP_CUOTA_ANY;
  setIf(body, 'CON_FCHCONT', args.CON_FCHCONT);
  setIf(body, 'CON_ULTFCH_INTERV', args.CON_ULTFCH_INTERV);
  setIf(body, 'CON_PROXFCH_INTERV', args.CON_PROXFCH_INTERV);
  setIf(body, 'CON_ULTFCH_FAC', args.CON_ULTFCH_FAC);
  setIf(body, 'CON_PROXFCH_FAC', args.CON_PROXFCH_FAC);
  setIf(body, 'CON_OBSERVACIONES', args.CON_OBSERVACIONES);
  setIf(body, 'CON_TIPO_MANT', args.CON_TIPO_MANT);
  setIf(body, 'CON_TIPO_MANT_DESC', args.CON_TIPO_MANT_DESC);
  setIf(body, 'DESC_MANT', args.DESC_MANT);
  setIf(body, 'CON_MANTENEDOR', args.CON_MANTENEDOR);
  setIf(body, 'NOM_MANTENEDOR', args.NOM_MANTENEDOR);
  setIf(body, 'CON_TIPOCONT_DESC', args.CON_TIPOCONT_DESC);
  setIf(body, 'NOMBRE_CLI', args.NOMBRE_CLI);
  if (args.CON_PERIOD_INTERV !== undefined) body['CON_PERIOD_INTERV'] = args.CON_PERIOD_INTERV;
  setIf(body, 'CON_FCH_INI_SERVICIO', args.CON_FCH_INI_SERVICIO);
  setIf(body, 'CON_TIPO_NEGOCIO', args.CON_TIPO_NEGOCIO);
  setIf(body, 'CON_TIPO_NEGOCIO_DESC', args.CON_TIPO_NEGOCIO_DESC);
  if (args.CON_LOC_COBRO !== undefined) body['CON_LOC_COBRO'] = args.CON_LOC_COBRO;
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Órdenes de trabajo — POST+PUT /ppre/v1/ordenes-trabajo
// ---------------------------------------------------------------------------

const ordenTrabajoFieldsShape = {
  AVI_CODEMP: z.string().optional().describe('Código empresa (AVI_CODEMP).'),
  AVI_DELEG: z.string().optional().describe('Código delegación (AVI_DELEG).'),
  AVI_FECHA: z.string().optional().describe('Fecha ISO de la orden (AVI_FECHA).'),
  AVI_GRUPO_CLI: z.number().optional().describe('Grupo de cliente (AVI_GRUPO_CLI).'),
  AVI_COD_CLIENTE: z.string().optional().describe('Código de cliente (AVI_COD_CLIENTE).'),
  AVI_NOM_CLIENTE: z.string().optional().describe('Nombre de cliente (AVI_NOM_CLIENTE).'),
  AVI_NOM_COMERCIAL: z.string().optional().describe('Nombre comercial (AVI_NOM_COMERCIAL).'),
  AVI_TIPO_CONTRATO: z.string().optional().describe('Tipo de contrato (AVI_TIPO_CONTRATO).'),
  AVI_NUM_CONTRATO: z.number().optional().describe('Número de contrato (AVI_NUM_CONTRATO).'),
  AVI_FCH_CONTRATO: z.string().optional().describe('Fecha contrato ISO (AVI_FCH_CONTRATO).'),
  AVI_ABONADO: z.string().optional().describe('Número abonado (AVI_ABONADO).'),
  AVI_INSTALACION: z.number().optional().describe('Código instalación (AVI_INSTALACION).'),
  AVI_NOMBRE_INS: z.string().optional().describe('Nombre instalación (AVI_NOMBRE_INS).'),
  AVI_PAIS_INSTAL: z.number().optional().describe('Código país instalación (AVI_PAIS_INSTAL).'),
  AVI_PROVINCIA_INSTAL: z.string().optional().describe('Provincia instalación (AVI_PROVINCIA_INSTAL).'),
  AVI_CPOSTAL_INSTAL: z.string().optional().describe('Código postal instalación (AVI_CPOSTAL_INSTAL).'),
  AVI_POBLACION_INSTAL: z.string().optional().describe('Población instalación (AVI_POBLACION_INSTAL).'),
  AVI_DIRECCION_INSTAL: z.string().optional().describe('Dirección instalación (AVI_DIRECCION_INSTAL).'),
  AVI_ZONA_INSTAL: z.string().optional().describe('Zona instalación (AVI_ZONA_INSTAL).'),
  AVI_TELEFONO: z.string().optional().describe('Teléfono principal (AVI_TELEFONO).'),
  AVI_TELEFONO2_INS: z.string().optional().describe('Teléfono 2 instalación (AVI_TELEFONO2_INS).'),
  AVI_TELEFONO3_INS: z.string().optional().describe('Teléfono 3 instalación (AVI_TELEFONO3_INS).'),
  AVI_CONTACTO: z.string().optional().describe('Contacto (AVI_CONTACTO).'),
  AVI_MANTENEDOR: z.string().optional().describe('Código mantenedor (AVI_MANTENEDOR).'),
  AVI_TIPO_INCIDENCIA: z.string().optional().describe('Tipo incidencia (AVI_TIPO_INCIDENCIA).'),
  AVI_TEXTO_TRAB_SOLICITADO: z.string().optional().describe('Texto trabajo solicitado (AVI_TEXTO_TRAB_SOLICITADO).'),
  AVI_ORIGEN_ORD_TRABAJO: z.string().optional().describe('Origen orden de trabajo (AVI_ORIGEN_ORD_TRABAJO).'),
  AVI_TIPO_MANT: z.string().optional().describe('Tipo de mantenimiento (AVI_TIPO_MANT).'),
  AVI_TEXTO_TRAB_REALIZADO: z.string().optional().describe('Texto trabajo realizado (AVI_TEXTO_TRAB_REALIZADO).'),
  PPC_GENERAR_PARTES: z.number().optional().describe('Generar partes (0/1) (PPC_GENERAR_PARTES).'),
  PPL_IMP_LIN_OPC1_CTTO: z.number().optional().describe('Importe línea opcional 1 contrato (PPL_IMP_LIN_OPC1_CTTO).'),
  PPL_CANT_LIN_IMPUT: z.number().optional().describe('Cantidad línea imputada (PPL_CANT_LIN_IMPUT).'),
  PPC_HORA_AVISO_ACU: z.string().optional().describe('Hora aviso acordado HH:MM (PPC_HORA_AVISO_ACU).'),
  PPC_HORA_RECOGIDA_ACU: z.string().optional().describe('Hora recogida acordada HH:MM (PPC_HORA_RECOGIDA_ACU).'),
  PPC_HORA_LLEGADA_ACU: z.string().optional().describe('Hora llegada acordada HH:MM (PPC_HORA_LLEGADA_ACU).'),
  PPC_HORA_SALIDA_ACU: z.string().optional().describe('Hora salida acordada HH:MM (PPC_HORA_SALIDA_ACU).'),
  AVI_PARTE_OPERARIO: z.string().optional().describe('Parte operario (AVI_PARTE_OPERARIO).'),
  camposAdicionales,
};

export const CreateOrdenTrabajoShape = {
  ...ordenTrabajoFieldsShape,
  PPC_STATUS_COMENTARIOS: z.string().optional().describe('Comentarios de estado (PPC_STATUS_COMENTARIOS, solo POST).'),
  AVI_TIPO_INSTALACION: z.string().optional().describe('Tipo instalación (AVI_TIPO_INSTALACION, solo POST).'),
  AVI_TIPO_PROCESO: z.string().optional().describe('Tipo proceso (AVI_TIPO_PROCESO, solo POST).'),
};

export const UpdateOrdenTrabajoShape = {
  idReg: z.string().min(1).describe('idReg opaco de la orden de trabajo (campo "idReg" en freematica_list_ppre_ordenes_trabajo).'),
  ...ordenTrabajoFieldsShape,
};

export type OrdenTrabajoFields = {
  AVI_CODEMP?: string;
  AVI_DELEG?: string;
  AVI_FECHA?: string;
  AVI_GRUPO_CLI?: number;
  AVI_COD_CLIENTE?: string;
  AVI_NOM_CLIENTE?: string;
  AVI_NOM_COMERCIAL?: string;
  AVI_TIPO_CONTRATO?: string;
  AVI_NUM_CONTRATO?: number;
  AVI_FCH_CONTRATO?: string;
  AVI_ABONADO?: string;
  AVI_INSTALACION?: number;
  AVI_NOMBRE_INS?: string;
  AVI_PAIS_INSTAL?: number;
  AVI_PROVINCIA_INSTAL?: string;
  AVI_CPOSTAL_INSTAL?: string;
  AVI_POBLACION_INSTAL?: string;
  AVI_DIRECCION_INSTAL?: string;
  AVI_ZONA_INSTAL?: string;
  AVI_TELEFONO?: string;
  AVI_TELEFONO2_INS?: string;
  AVI_TELEFONO3_INS?: string;
  AVI_CONTACTO?: string;
  AVI_MANTENEDOR?: string;
  AVI_TIPO_INCIDENCIA?: string;
  AVI_TEXTO_TRAB_SOLICITADO?: string;
  AVI_ORIGEN_ORD_TRABAJO?: string;
  AVI_TIPO_MANT?: string;
  AVI_TEXTO_TRAB_REALIZADO?: string;
  PPC_GENERAR_PARTES?: number;
  PPC_STATUS_COMENTARIOS?: string;
  PPL_IMP_LIN_OPC1_CTTO?: number;
  PPL_CANT_LIN_IMPUT?: number;
  PPC_HORA_AVISO_ACU?: string;
  PPC_HORA_RECOGIDA_ACU?: string;
  PPC_HORA_LLEGADA_ACU?: string;
  PPC_HORA_SALIDA_ACU?: string;
  AVI_TIPO_INSTALACION?: string;
  AVI_TIPO_PROCESO?: string;
  AVI_PARTE_OPERARIO?: string;
  camposAdicionales?: Record<string, string | number>;
};

export function buildOrdenTrabajoBody(args: OrdenTrabajoFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'AVI_CODEMP', args.AVI_CODEMP);
  setIf(body, 'AVI_DELEG', args.AVI_DELEG);
  setIf(body, 'AVI_FECHA', args.AVI_FECHA);
  setIf(body, 'AVI_GRUPO_CLI', args.AVI_GRUPO_CLI);
  setIf(body, 'AVI_COD_CLIENTE', args.AVI_COD_CLIENTE);
  setIf(body, 'AVI_NOM_CLIENTE', args.AVI_NOM_CLIENTE);
  setIf(body, 'AVI_NOM_COMERCIAL', args.AVI_NOM_COMERCIAL);
  setIf(body, 'AVI_TIPO_CONTRATO', args.AVI_TIPO_CONTRATO);
  setIf(body, 'AVI_NUM_CONTRATO', args.AVI_NUM_CONTRATO);
  setIf(body, 'AVI_FCH_CONTRATO', args.AVI_FCH_CONTRATO);
  setIf(body, 'AVI_ABONADO', args.AVI_ABONADO);
  setIf(body, 'AVI_INSTALACION', args.AVI_INSTALACION);
  setIf(body, 'AVI_NOMBRE_INS', args.AVI_NOMBRE_INS);
  setIf(body, 'AVI_PAIS_INSTAL', args.AVI_PAIS_INSTAL);
  setIf(body, 'AVI_PROVINCIA_INSTAL', args.AVI_PROVINCIA_INSTAL);
  setIf(body, 'AVI_CPOSTAL_INSTAL', args.AVI_CPOSTAL_INSTAL);
  setIf(body, 'AVI_POBLACION_INSTAL', args.AVI_POBLACION_INSTAL);
  setIf(body, 'AVI_DIRECCION_INSTAL', args.AVI_DIRECCION_INSTAL);
  setIf(body, 'AVI_ZONA_INSTAL', args.AVI_ZONA_INSTAL);
  setIf(body, 'AVI_TELEFONO', args.AVI_TELEFONO);
  setIf(body, 'AVI_TELEFONO2_INS', args.AVI_TELEFONO2_INS);
  setIf(body, 'AVI_TELEFONO3_INS', args.AVI_TELEFONO3_INS);
  setIf(body, 'AVI_CONTACTO', args.AVI_CONTACTO);
  setIf(body, 'AVI_MANTENEDOR', args.AVI_MANTENEDOR);
  setIf(body, 'AVI_TIPO_INCIDENCIA', args.AVI_TIPO_INCIDENCIA);
  setIf(body, 'AVI_TEXTO_TRAB_SOLICITADO', args.AVI_TEXTO_TRAB_SOLICITADO);
  setIf(body, 'AVI_ORIGEN_ORD_TRABAJO', args.AVI_ORIGEN_ORD_TRABAJO);
  setIf(body, 'AVI_TIPO_MANT', args.AVI_TIPO_MANT);
  setIf(body, 'AVI_TEXTO_TRAB_REALIZADO', args.AVI_TEXTO_TRAB_REALIZADO);
  setIf(body, 'PPC_GENERAR_PARTES', args.PPC_GENERAR_PARTES);
  setIf(body, 'PPC_STATUS_COMENTARIOS', args.PPC_STATUS_COMENTARIOS);
  setIf(body, 'PPL_IMP_LIN_OPC1_CTTO', args.PPL_IMP_LIN_OPC1_CTTO);
  setIf(body, 'PPL_CANT_LIN_IMPUT', args.PPL_CANT_LIN_IMPUT);
  setIf(body, 'PPC_HORA_AVISO_ACU', args.PPC_HORA_AVISO_ACU);
  setIf(body, 'PPC_HORA_RECOGIDA_ACU', args.PPC_HORA_RECOGIDA_ACU);
  setIf(body, 'PPC_HORA_LLEGADA_ACU', args.PPC_HORA_LLEGADA_ACU);
  setIf(body, 'PPC_HORA_SALIDA_ACU', args.PPC_HORA_SALIDA_ACU);
  setIf(body, 'AVI_TIPO_INSTALACION', args.AVI_TIPO_INSTALACION);
  setIf(body, 'AVI_TIPO_PROCESO', args.AVI_TIPO_PROCESO);
  setIf(body, 'AVI_PARTE_OPERARIO', args.AVI_PARTE_OPERARIO);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Marcajes — POST /ppre/v1/guardar + PUT /ppre/v1/actualizar/:idReg + PUT /ppre/v2/actualizar/:idReg
// ---------------------------------------------------------------------------

export const CreateMarcajeShape = {
  idReg: z.string().optional().describe('idReg del marcaje (idReg).'),
  date: z.string().optional().describe('Fecha y hora ISO del marcaje (date).'),
  trackType: z.enum(['ENT', 'NOV', 'SAL', 'I', 'A', 'POS']).optional().describe('Tipo de marcaje: ENT=Entrada, NOV=Novedad, SAL=Salida, I=Incidencia, A=Ausencia, POS=Posición (trackType).'),
  serviceTag: z.string().optional().describe('Tag del servicio (serviceTag).'),
  device: z.string().optional().describe('Identificador del dispositivo (device).'),
  latitude: z.number().optional().describe('Latitud GPS (latitude).'),
  longitude: z.number().optional().describe('Longitud GPS (longitude).'),
  incidenceDescription: z.string().optional().describe('Descripción de incidencia (incidenceDescription).'),
  incidence: z.string().optional().describe('Código de incidencia (incidence).'),
  personTag: z.string().optional().describe('Tag de la persona (personTag).'),
  positionOrigin: z.enum(['network', 'gps', 'fixed']).optional().describe('Origen de la posición: network, gps o fixed (positionOrigin).'),
  positionPrecision: z.number().optional().describe('Precisión de la posición en metros (positionPrecision).'),
  photo: z.string().optional().describe('Foto en base64 (photo).'),
  appVersion: z.string().optional().describe('Versión de la app (appVersion).'),
  deviceVersion: z.string().optional().describe('Versión del dispositivo (deviceVersion).'),
  deviceLang: z.string().optional().describe('Idioma del dispositivo (deviceLang).'),
  noRestriction: z.boolean().optional().describe('Sin restricción (noRestriction).'),
  camposAdicionales,
};

export const UpdateMarcajeShape = {
  idReg: z.string().min(1).describe('idReg opaco del marcaje a actualizar (campo "idReg" en freematica_list_ppre_marcajes).'),
  date: z.string().optional().describe('Fecha y hora ISO del marcaje (date).'),
  trackType: z.enum(['ENT', 'NOV', 'SAL', 'I', 'A', 'POS']).optional().describe('Tipo de marcaje (trackType).'),
  serviceTag: z.string().optional().describe('Tag del servicio (serviceTag).'),
  device: z.string().optional().describe('Identificador del dispositivo (device).'),
  latitude: z.number().optional().describe('Latitud GPS (latitude).'),
  longitude: z.number().optional().describe('Longitud GPS (longitude).'),
  incidenceDescription: z.string().optional().describe('Descripción de incidencia (incidenceDescription).'),
  incidence: z.string().optional().describe('Código de incidencia (incidence).'),
  personTag: z.string().optional().describe('Tag de la persona (personTag).'),
  positionOrigin: z.enum(['network', 'gps', 'fixed']).optional().describe('Origen de la posición (positionOrigin).'),
  positionPrecision: z.number().optional().describe('Precisión de la posición en metros (positionPrecision).'),
  photo: z.string().optional().describe('Foto en base64 (photo).'),
  appVersion: z.string().optional().describe('Versión de la app (appVersion).'),
  deviceVersion: z.string().optional().describe('Versión del dispositivo (deviceVersion).'),
  deviceLang: z.string().optional().describe('Idioma del dispositivo (deviceLang).'),
  noRestriction: z.boolean().optional().describe('Sin restricción (noRestriction).'),
  camposAdicionales,
};

export type MarcajeFields = {
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

export function buildMarcajeBody(args: MarcajeFields): Record<string, unknown> {
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
