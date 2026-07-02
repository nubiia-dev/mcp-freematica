import { z } from 'zod';

/**
 * Zod schemas (raw shapes) e builders de body para las tools del grupo
 * "Contratos y Servicios" (módulos pvss y ppre).
 *
 * Convención: las tools exponen nombres amigables en castellano
 * (descripcion, codCliente, fechaAlta…) y los builders los traducen a los
 * campos nativos del API (CTRT_*, CTRTS_*, SERVHPR_*, CTRTFL_*, CON2_*).
 * Solo se incluyen en el body los campos definidos por el caller.
 *
 * Los límites de longitud provienen del spec OpenAPI
 * (https://api-config.freefy.cloud/openapi.json).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fecha en formato ISO YYYY-MM-DD (Freemática también acepta datetime). */
const isoDate = () =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/, 'Formato esperado: YYYY-MM-DD')
    .describe('Fecha en formato YYYY-MM-DD.');

/** Añade `target[key] = value` solo si value !== undefined. */
function setIf(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) target[key] = value;
}

// ---------------------------------------------------------------------------
// Cabecera de contrato (VoContratos, campos CTRT_*)
// ---------------------------------------------------------------------------

const contratoOptionalFieldsShape = {
  empresa: z.string().max(4).optional().describe('Código de empresa (CTRT_EMP, 4c).'),
  codContrato: z
    .string()
    .max(10)
    .optional()
    .describe('Código del contrato (CTRT_COD, 10c). Si se omite en el alta, lo asigna Freemática.'),
  pais: z.number().int().optional().describe('Código de país (CTRT_PAIS).'),
  provincia: z.string().max(5).optional().describe('Provincia (CTRT_PROV, 5c).'),
  codPostal: z.string().max(10).optional().describe('Código postal (CTRT_CPOSTAL, 10c).'),
  poblacion: z.string().max(40).optional().describe('Población (CTRT_POB, 40c).'),
  tipoVia: z.string().max(10).optional().describe('Tipo de vía (CTRT_TVIA, 10c). Ej: CL, AV, PZ.'),
  nombreVia: z.string().max(80).optional().describe('Nombre de vía (CTRT_NOMVIA, 80c).'),
  ubicacionVia: z.string().max(40).optional().describe('Ubicación vía (CTRT_UBIVIA, 40c).'),
  abierto: z
    .boolean()
    .optional()
    .describe('Contrato abierto (CTRT_ABIERTO): true → "1", false → "0".'),
  localizacionServicio: z
    .number()
    .int()
    .optional()
    .describe('Localización de servicio (CTRT_LOC_SERV).'),
  estadistico: z.string().max(20).optional().describe('Estadístico (CTRT_ESTADISTICO, 20c).'),
};

export const CreateContratoShape = {
  delegacion: z.string().max(4).describe('Código de delegación (CTRT_DELEG, 4c). Requerido.'),
  descripcion: z.string().max(40).describe('Descripción del contrato (CTRT_DES, 40c). Requerido.'),
  fecha: isoDate().describe('Fecha del contrato (CTRT_FECHA, YYYY-MM-DD). Requerido.'),
  codCliente: z.string().max(10).describe('Código de cliente (CTRT_COD_CLI, 10c). Requerido.'),
  ...contratoOptionalFieldsShape,
};

export const UpdateContratoShape = {
  idReg: z
    .string()
    .min(1)
    .describe('idReg opaco del contrato (campo "idReg" en freematica_list_contratos).'),
  delegacion: z.string().max(4).optional().describe('Código de delegación (CTRT_DELEG, 4c).'),
  descripcion: z.string().max(40).optional().describe('Descripción del contrato (CTRT_DES, 40c).'),
  fecha: isoDate().optional().describe('Fecha del contrato (CTRT_FECHA).'),
  codCliente: z.string().max(10).optional().describe('Código de cliente (CTRT_COD_CLI, 10c).'),
  ...contratoOptionalFieldsShape,
};

export type ContratoFields = {
  empresa?: string;
  delegacion?: string;
  codContrato?: string;
  descripcion?: string;
  fecha?: string;
  codCliente?: string;
  pais?: number;
  provincia?: string;
  codPostal?: string;
  poblacion?: string;
  tipoVia?: string;
  nombreVia?: string;
  ubicacionVia?: string;
  abierto?: boolean;
  localizacionServicio?: number;
  estadistico?: string;
};

/** Construye el body VoContratos a partir de los campos amigables definidos. */
export function buildContratoBody(args: ContratoFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'CTRT_EMP', args.empresa);
  setIf(body, 'CTRT_DELEG', args.delegacion);
  setIf(body, 'CTRT_COD', args.codContrato);
  setIf(body, 'CTRT_DES', args.descripcion);
  setIf(body, 'CTRT_FECHA', args.fecha);
  setIf(body, 'CTRT_COD_CLI', args.codCliente);
  setIf(body, 'CTRT_PAIS', args.pais);
  setIf(body, 'CTRT_PROV', args.provincia);
  setIf(body, 'CTRT_CPOSTAL', args.codPostal);
  setIf(body, 'CTRT_POB', args.poblacion);
  setIf(body, 'CTRT_TVIA', args.tipoVia);
  setIf(body, 'CTRT_NOMVIA', args.nombreVia);
  setIf(body, 'CTRT_UBIVIA', args.ubicacionVia);
  if (args.abierto !== undefined) body['CTRT_ABIERTO'] = args.abierto ? '1' : '0';
  setIf(body, 'CTRT_LOC_SERV', args.localizacionServicio);
  setIf(body, 'CTRT_ESTADISTICO', args.estadistico);
  return body;
}

// ---------------------------------------------------------------------------
// Servicios de contrato (VoServicios, campos CTRTS_*)
// ---------------------------------------------------------------------------

const servicioFieldsShape = {
  codServicio: z
    .string()
    .max(10)
    .optional()
    .describe('Código del servicio (CTRTS_COD, 10c). Si se omite, lo asigna Freemática.'),
  descripcion: z.string().max(40).optional().describe('Descripción del servicio (CTRTS_DES, 40c).'),
  inspector: z.string().max(10).optional().describe('Código de inspector (CTRTS_INSP).'),
  tipo: z.string().max(1).optional().describe('Tipo de servicio (CTRTS_TIPO, 1c).'),
  fechaAlta: isoDate().optional().describe('Fecha de alta del servicio (CTRTS_FECALTA).'),
  fechaFin: isoDate().optional().describe('Fecha fin del servicio (CTRTS_FECFIN).'),
  precioEspecial: z
    .enum(['0', '1', '2'])
    .optional()
    .describe(
      'Tipo de cálculo en precio especial (CTRTS_PRECIO_ESP): 0=Nada, 1=Siempre, 2=Solo si hay precio especial.',
    ),
  nombreResponsable: z
    .string()
    .max(40)
    .optional()
    .describe('Descripción responsable cliente (CTRTS_NOMPROD, 40c).'),
  situacion: z.string().max(100).optional().describe('Situación del servicio (CTRTS_SITUACION, 100c).'),
  calendarioFestivo: z
    .string()
    .max(6)
    .optional()
    .describe('Calendario festivo (CTRTS_CALFEST, 6c). Ej: código postal.'),
  secuencial: z.string().max(1).optional().describe('Tipo base operativa (CTRTS_SECUENCIAL, 1c).'),
  clase: z.string().max(4).optional().describe('Código de la clase de servicio (CTRTS_CLASE, 4c).'),
  mesIncremento: z.number().int().min(1).max(12).optional().describe('Mes incremento (CTRTS_MES_INCRE).'),
  observacionesPuesto: z
    .string()
    .max(255)
    .optional()
    .describe('Observaciones puesto (CTRTS_OBS_PUESTO, 255c).'),
};

export const CreateServicioShape = {
  idContrato: z
    .string()
    .min(1)
    .describe(
      'idReg opaco del contrato (Base64 "EMP__DELEG__COD"). Los campos requeridos CTRTS_EMP/CTRTS_DELEG/CTRTS_CTRT se derivan de él automáticamente.',
    ),
  ...servicioFieldsShape,
};

export const UpdateServicioFechasShape = {
  idContrato: z.string().min(1).describe('idReg opaco del contrato.'),
  idServicio: z
    .string()
    .min(1)
    .describe('idReg opaco del servicio (campo "idReg" en freematica_list_servicios_contrato).'),
  fechaAlta: isoDate().optional().describe('Nueva fecha de inicio (CTRTS_FECALTA).'),
  fechaFin: isoDate().optional().describe('Nueva fecha fin (CTRTS_FECFIN).'),
};

export type ServicioFields = {
  codServicio?: string;
  descripcion?: string;
  inspector?: string;
  tipo?: string;
  fechaAlta?: string;
  fechaFin?: string;
  precioEspecial?: '0' | '1' | '2';
  nombreResponsable?: string;
  situacion?: string;
  calendarioFestivo?: string;
  secuencial?: string;
  clase?: string;
  mesIncremento?: number;
  observacionesPuesto?: string;
};

/**
 * Construye el body VoServicios. Los tres campos requeridos por el API
 * (CTRTS_EMP, CTRTS_DELEG, CTRTS_CTRT) se pasan como `parts` (decodificados
 * del idReg del contrato).
 */
export function buildServicioBody(
  parts: { empresa: string; delegacion: string; codContrato: string },
  args: ServicioFields,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    CTRTS_EMP: parts.empresa,
    CTRTS_DELEG: parts.delegacion,
    CTRTS_CTRT: parts.codContrato,
  };
  setIf(body, 'CTRTS_COD', args.codServicio);
  setIf(body, 'CTRTS_DES', args.descripcion);
  setIf(body, 'CTRTS_INSP', args.inspector);
  setIf(body, 'CTRTS_TIPO', args.tipo);
  setIf(body, 'CTRTS_FECALTA', args.fechaAlta);
  setIf(body, 'CTRTS_FECFIN', args.fechaFin);
  setIf(body, 'CTRTS_PRECIO_ESP', args.precioEspecial);
  setIf(body, 'CTRTS_NOMPROD', args.nombreResponsable);
  setIf(body, 'CTRTS_SITUACION', args.situacion);
  setIf(body, 'CTRTS_CALFEST', args.calendarioFestivo);
  setIf(body, 'CTRTS_SECUENCIAL', args.secuencial);
  setIf(body, 'CTRTS_CLASE', args.clase);
  setIf(body, 'CTRTS_MES_INCRE', args.mesIncremento);
  setIf(body, 'CTRTS_OBS_PUESTO', args.observacionesPuesto);
  return body;
}

// ---------------------------------------------------------------------------
// Histórico de precios de servicio (VoServiciosHistPr, campos SERVHPR_*)
// ---------------------------------------------------------------------------

const historicoPreciosFieldsShape = {
  fecha: isoDate().optional().describe('Fecha del registro (SERVHPR_FCH).'),
  porcentajeIncremento: z.number().optional().describe('Porcentaje incremento (SERVHPR_PORC_INCR).'),
  precioHoraGlobal: z.number().optional().describe('Precio hora global (SERVHPR_PR_H_GLOBAL).'),
  precioHoraGlobalAnterior: z
    .number()
    .optional()
    .describe('Precio hora global anterior (SERVHPR_PR_H_GLOBAL_ANT).'),
  precioHoraDiurna: z.number().optional().describe('Precio hora diurna (SERVHPR_PR_H_DIUR).'),
  precioHoraDiurnaAnterior: z
    .number()
    .optional()
    .describe('Precio hora diurna anterior (SERVHPR_PR_H_DIUR_ANT).'),
  precioHoraNocturna: z.number().optional().describe('Precio hora nocturna (SERVHPR_PR_H_NOCT).'),
  precioHoraNocturnaAnterior: z
    .number()
    .optional()
    .describe('Precio hora nocturna anterior (SERVHPR_PR_H_NOCT_ANT).'),
  precioHoraFestiva: z.number().optional().describe('Precio hora festiva (SERVHPR_PR_H_FEST).'),
  precioHoraFestivaAnterior: z
    .number()
    .optional()
    .describe('Precio hora festiva anterior (SERVHPR_PR_H_FEST_ANT).'),
  precioHoraNocturnaFestiva: z
    .number()
    .optional()
    .describe('Precio hora nocturna festiva (SERVHPR_PR_H_NOCFEST).'),
  precioHoraNocturnaFestivaAnterior: z
    .number()
    .optional()
    .describe('Precio hora nocturna festiva anterior (SERVHPR_PR_H_NOCFEST_ANT).'),
  importeFijo: z.number().optional().describe('Importe fijo (SERVHPR_IMP_FIJO).'),
  importeFijoAnterior: z.number().optional().describe('Importe fijo anterior (SERVHPR_IMP_FIJO_ANT).'),
  fechaIncremento: isoDate().optional().describe('Fecha incremento (SERVHPR_FCH_INCR).'),
  tipoRevision: z.number().optional().describe('Tipo revisión (SERVHPR_TIPO_REV).'),
  noAplicado: z
    .boolean()
    .optional()
    .describe('No aplicado (SERVHPR_NO_APLICADO): true → "1", false → "0".'),
  origen: z.string().max(1).optional().describe('Origen (SERVHPR_ORIGEN, 1c).'),
};

export const ServicioHistoricoPreciosShape = {
  idContrato: z.string().min(1).describe('idReg opaco del contrato.'),
  idServicio: z.string().min(1).describe('idReg opaco del servicio.'),
  ...historicoPreciosFieldsShape,
};

export type HistoricoPreciosFields = {
  fecha?: string;
  porcentajeIncremento?: number;
  precioHoraGlobal?: number;
  precioHoraGlobalAnterior?: number;
  precioHoraDiurna?: number;
  precioHoraDiurnaAnterior?: number;
  precioHoraNocturna?: number;
  precioHoraNocturnaAnterior?: number;
  precioHoraFestiva?: number;
  precioHoraFestivaAnterior?: number;
  precioHoraNocturnaFestiva?: number;
  precioHoraNocturnaFestivaAnterior?: number;
  importeFijo?: number;
  importeFijoAnterior?: number;
  fechaIncremento?: string;
  tipoRevision?: number;
  noAplicado?: boolean;
  origen?: string;
};

/**
 * Construye el body VoServiciosHistPr. Los campos requeridos SERVHPR_EMP /
 * SERVHPR_DELEG / SERVHPR_CTRT se derivan del idReg del contrato; SERVHPR_SERV
 * del idReg del servicio.
 */
export function buildHistoricoPreciosBody(
  parts: { empresa: string; delegacion: string; codContrato: string; codServicio: string },
  args: HistoricoPreciosFields,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    SERVHPR_EMP: parts.empresa,
    SERVHPR_DELEG: parts.delegacion,
    SERVHPR_CTRT: parts.codContrato,
    SERVHPR_SERV: parts.codServicio,
  };
  setIf(body, 'SERVHPR_FCH', args.fecha);
  setIf(body, 'SERVHPR_PORC_INCR', args.porcentajeIncremento);
  setIf(body, 'SERVHPR_PR_H_GLOBAL', args.precioHoraGlobal);
  setIf(body, 'SERVHPR_PR_H_GLOBAL_ANT', args.precioHoraGlobalAnterior);
  setIf(body, 'SERVHPR_PR_H_DIUR', args.precioHoraDiurna);
  setIf(body, 'SERVHPR_PR_H_DIUR_ANT', args.precioHoraDiurnaAnterior);
  setIf(body, 'SERVHPR_PR_H_NOCT', args.precioHoraNocturna);
  setIf(body, 'SERVHPR_PR_H_NOCT_ANT', args.precioHoraNocturnaAnterior);
  setIf(body, 'SERVHPR_PR_H_FEST', args.precioHoraFestiva);
  setIf(body, 'SERVHPR_PR_H_FEST_ANT', args.precioHoraFestivaAnterior);
  setIf(body, 'SERVHPR_PR_H_NOCFEST', args.precioHoraNocturnaFestiva);
  setIf(body, 'SERVHPR_PR_H_NOCFEST_ANT', args.precioHoraNocturnaFestivaAnterior);
  setIf(body, 'SERVHPR_IMP_FIJO', args.importeFijo);
  setIf(body, 'SERVHPR_IMP_FIJO_ANT', args.importeFijoAnterior);
  setIf(body, 'SERVHPR_FCH_INCR', args.fechaIncremento);
  setIf(body, 'SERVHPR_TIPO_REV', args.tipoRevision);
  if (args.noAplicado !== undefined) body['SERVHPR_NO_APLICADO'] = args.noAplicado ? '1' : '0';
  setIf(body, 'SERVHPR_ORIGEN', args.origen);
  return body;
}

// ---------------------------------------------------------------------------
// Textos de facturación de servicio (VoServiciosFacTxt, campos CTRTFL_*)
// ---------------------------------------------------------------------------

export const CreateServicioFacturacionTxtShape = {
  idContrato: z.string().min(1).describe('idReg opaco del contrato.'),
  idServicio: z.string().min(1).describe('idReg opaco del servicio.'),
  linea: z.string().max(4).describe('Código de línea (CTRTFL_LIN, 4c). Requerido.'),
  texto: z.string().max(40).optional().describe('Descripción (CTRTFL_TXT, 40c).'),
  textoAmpliado: z
    .string()
    .max(255)
    .optional()
    .describe('Descripción ampliada (CTRTFL_TXT_AMPLIADO, 255c).'),
};

/** Construye el body VoServiciosFacTxt (5 campos requeridos derivados + textos). */
export function buildFacturacionTxtBody(
  parts: { empresa: string; delegacion: string; codContrato: string; codServicio: string },
  args: { linea: string; texto?: string; textoAmpliado?: string },
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    CTRTFL_EMP: parts.empresa,
    CTRTFL_DELEG: parts.delegacion,
    CTRTFL_CTRT: parts.codContrato,
    CTRTFL_SERV: parts.codServicio,
    CTRTFL_LIN: args.linea,
  };
  setIf(body, 'CTRTFL_TXT', args.texto);
  setIf(body, 'CTRTFL_TXT_AMPLIADO', args.textoAmpliado);
  return body;
}

// ---------------------------------------------------------------------------
// Datos de facturación de servicio (VoServiciosFac, campos CTRTF_*)
// ---------------------------------------------------------------------------

/**
 * VoServiciosFac tiene 42 campos; se exponen con nombre amigable los de uso
 * común y el resto puede pasarse en `camposAdicionales` con su nombre nativo
 * CTRTF_* (passthrough validado por prefijo).
 */
export const UpdateServicioFacturacionShape = {
  idContrato: z.string().min(1).describe('idReg opaco del contrato.'),
  idServicio: z.string().min(1).describe('idReg opaco del servicio.'),
  tipoCobro: z.string().max(1).optional().describe('Tipo de cobro (CTRTF_TIPCOB, 1c).'),
  horasContrato: z.number().optional().describe('Horas contrato (CTRTF_HHCTRT).'),
  precioHora: z.number().optional().describe('Precio hora (CTRTF_PRECIOH).'),
  importeFacturacion: z.number().optional().describe('Importe facturación (CTRTF_IMPFACF).'),
  claveFacturacion: z.string().max(4).optional().describe('Clave facturación (CTRTF_CLAVEF, 4c).'),
  referencia: z.string().max(40).optional().describe('Referencia (CTRTF_REF, 40c).'),
  formaPago: z.string().max(3).optional().describe('Forma de pago (CTRTF_FPAGO, 3c).'),
  descuentoEspecial: z
    .number()
    .optional()
    .describe('Porcentaje descuento especial (CTRTF_DTO_ESP).'),
  precioHoraDiurna: z.number().optional().describe('Precio hora diurna (CTRTF_PRECIOH_D).'),
  precioHoraNocturna: z.number().optional().describe('Precio hora nocturna (CTRTF_PRECIOH_N).'),
  precioHoraFestiva: z.number().optional().describe('Precio hora festiva (CTRTF_PRECIOH_F).'),
  precioHoraNocturnaFestiva: z
    .number()
    .optional()
    .describe('Precio hora nocturno festivo (CTRTF_PRECIOH_NF).'),
  ivaIncluido: z
    .boolean()
    .optional()
    .describe('IVA incluido (CTRTF_IVA_INC): true → "1", false → "0".'),
  camposAdicionales: z
    .record(z.string().regex(/^CTRTF_/, 'Las claves deben empezar por CTRTF_'), z.union([z.string(), z.number()]))
    .optional()
    .describe(
      'Campos VoServiciosFac adicionales con su nombre nativo CTRTF_* (ej: CTRTF_PORCFAC, CTRTF_SERVFAC). Ver spec OpenAPI.',
    ),
};

export type ServicioFacturacionFields = {
  tipoCobro?: string;
  horasContrato?: number;
  precioHora?: number;
  importeFacturacion?: number;
  claveFacturacion?: string;
  referencia?: string;
  formaPago?: string;
  descuentoEspecial?: number;
  precioHoraDiurna?: number;
  precioHoraNocturna?: number;
  precioHoraFestiva?: number;
  precioHoraNocturnaFestiva?: number;
  ivaIncluido?: boolean;
  camposAdicionales?: Record<string, string | number>;
};

/** Construye el body VoServiciosFac (requeridos derivados + campos amigables + passthrough). */
export function buildServicioFacturacionBody(
  parts: { empresa: string; delegacion: string; codContrato: string; codServicio: string },
  args: ServicioFacturacionFields,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    CTRTF_EMP: parts.empresa,
    CTRTF_DELEG: parts.delegacion,
    CTRTF_CTRT: parts.codContrato,
    CTRTF_SERV: parts.codServicio,
  };
  setIf(body, 'CTRTF_TIPCOB', args.tipoCobro);
  setIf(body, 'CTRTF_HHCTRT', args.horasContrato);
  setIf(body, 'CTRTF_PRECIOH', args.precioHora);
  setIf(body, 'CTRTF_IMPFACF', args.importeFacturacion);
  setIf(body, 'CTRTF_CLAVEF', args.claveFacturacion);
  setIf(body, 'CTRTF_REF', args.referencia);
  setIf(body, 'CTRTF_FPAGO', args.formaPago);
  setIf(body, 'CTRTF_DTO_ESP', args.descuentoEspecial);
  setIf(body, 'CTRTF_PRECIOH_D', args.precioHoraDiurna);
  setIf(body, 'CTRTF_PRECIOH_N', args.precioHoraNocturna);
  setIf(body, 'CTRTF_PRECIOH_F', args.precioHoraFestiva);
  setIf(body, 'CTRTF_PRECIOH_NF', args.precioHoraNocturnaFestiva);
  if (args.ivaIncluido !== undefined) body['CTRTF_IVA_INC'] = args.ivaIncluido ? '1' : '0';
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Opcionales de contrato (VoContratosOpcionales, campos CON2_*, módulo ppre)
// ---------------------------------------------------------------------------

const opcionalesCamposAdicionales = z
  .record(z.string().regex(/^CON2_/, 'Las claves deben empezar por CON2_'), z.union([z.string(), z.number()]))
  .optional()
  .describe(
    'Campos VoContratosOpcionales adicionales con su nombre nativo CON2_* (ej: CON2_OPC_NUM1..10, CON2_OPC_ALFA1..10, CON2_DTO_CUOTA). Ver spec OpenAPI.',
  );

export const CreateContratoOpcionalesShape = {
  empresa: z.string().max(4).describe('Empresa (CON2_CODEMP, 4c). Requerido.'),
  delegacion: z.string().max(4).describe('Delegación (CON2_DELEG, 4c). Requerido.'),
  tipoContrato: z.string().max(4).describe('Tipo de contrato (CON2_TIPOCONT, 4c). Requerido.'),
  numContrato: z.number().describe('Número de contrato (CON2_NUMCONT). Requerido.'),
  fechaContrato: isoDate().describe('Fecha del contrato (CON2_FCHCONT). Requerido.'),
  observaciones1: z.string().max(255).optional().describe('Observaciones 1 (CON2_OBSERV1, 255c).'),
  observaciones2: z.string().max(255).optional().describe('Observaciones 2 (CON2_OBSERV2, 255c).'),
  servicio: z.string().max(4).optional().describe('Servicio (CON2_SERVICIO, 4c).'),
  categoria: z.string().max(4).optional().describe('Categoría (CON2_CATEGORIA, 4c).'),
  importeFijo: z.number().optional().describe('Importe fijo (CON2_IMPORTE_FIJO).'),
  camposAdicionales: opcionalesCamposAdicionales,
};

export const UpdateContratoOpcionalesShape = {
  idReg: z
    .string()
    .min(1)
    .describe('idReg opaco del registro de opcionales (campo "idReg" en freematica_list_contratos_opcionales).'),
  empresa: z.string().max(4).optional().describe('Empresa (CON2_CODEMP, 4c).'),
  delegacion: z.string().max(4).optional().describe('Delegación (CON2_DELEG, 4c).'),
  tipoContrato: z.string().max(4).optional().describe('Tipo de contrato (CON2_TIPOCONT, 4c).'),
  numContrato: z.number().optional().describe('Número de contrato (CON2_NUMCONT).'),
  fechaContrato: isoDate().optional().describe('Fecha del contrato (CON2_FCHCONT).'),
  observaciones1: z.string().max(255).optional().describe('Observaciones 1 (CON2_OBSERV1, 255c).'),
  observaciones2: z.string().max(255).optional().describe('Observaciones 2 (CON2_OBSERV2, 255c).'),
  servicio: z.string().max(4).optional().describe('Servicio (CON2_SERVICIO, 4c).'),
  categoria: z.string().max(4).optional().describe('Categoría (CON2_CATEGORIA, 4c).'),
  importeFijo: z.number().optional().describe('Importe fijo (CON2_IMPORTE_FIJO).'),
  camposAdicionales: opcionalesCamposAdicionales,
};

export type ContratoOpcionalesFields = {
  empresa?: string;
  delegacion?: string;
  tipoContrato?: string;
  numContrato?: number;
  fechaContrato?: string;
  observaciones1?: string;
  observaciones2?: string;
  servicio?: string;
  categoria?: string;
  importeFijo?: number;
  camposAdicionales?: Record<string, string | number>;
};

/** Construye el body VoContratosOpcionales a partir de los campos definidos. */
export function buildContratoOpcionalesBody(
  args: ContratoOpcionalesFields,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'CON2_CODEMP', args.empresa);
  setIf(body, 'CON2_DELEG', args.delegacion);
  setIf(body, 'CON2_TIPOCONT', args.tipoContrato);
  setIf(body, 'CON2_NUMCONT', args.numContrato);
  setIf(body, 'CON2_FCHCONT', args.fechaContrato);
  setIf(body, 'CON2_OBSERV1', args.observaciones1);
  setIf(body, 'CON2_OBSERV2', args.observaciones2);
  setIf(body, 'CON2_SERVICIO', args.servicio);
  setIf(body, 'CON2_CATEGORIA', args.categoria);
  setIf(body, 'CON2_IMPORTE_FIJO', args.importeFijo);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}
