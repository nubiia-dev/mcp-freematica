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
  .describe('Campos nativos adicionales del Vo (ej: CRMA_OPCIONAL_T1, CRMC_CTO_MOD). Ver spec OpenAPI para la lista completa.');

// ---------------------------------------------------------------------------
// Actividades — POST/PUT /pcrm/v2/actividades
// ---------------------------------------------------------------------------

const actividadFieldsShape = {
  ID_ACTIVIDAD: z.number().optional().describe('ID de la actividad (ID_ACTIVIDAD).'),
  TIPO_ID: z.enum(['C', 'T']).optional().describe('Tipo: C = Cita, T = Tarea (TIPO_ID).'),
  ID_CASO: z.number().nullable().optional().describe('ID del caso asociado (ID_CASO). Null si no aplica.'),
  ID_OPORTUNIDAD: z.number().nullable().optional().describe('ID de la oportunidad asociada (ID_OPORTUNIDAD). Null si no aplica.'),
  ID_CAMPANYA: z.string().optional().describe('Código de Campaña CRM (ID_CAMPANYA).'),
  TIPO_ASIGNACION: z.enum(['U', 'C']).optional().describe('Tipo asignación: U = Usuario, C = Cola (TIPO_ASIGNACION).'),
  USU_ASIGNADO: z.string().optional().describe('Usuario asignado (USU_ASIGNADO).'),
  COLA_ASIGNADA: z.string().optional().describe('Cola asignada (COLA_ASIGNADA).'),
  GRUPO_CLI: z.number().optional().describe('Grupo de cliente (GRUPO_CLI).'),
  COD_CLIENTE: z.string().optional().describe('Código de cliente (COD_CLIENTE).'),
  LOC_CLIENTE: z.number().optional().describe('Localización del cliente (LOC_CLIENTE).'),
  FCH_CREACION: z.string().optional().describe('Fecha de creación ISO (FCH_CREACION).'),
  USUARIO_CREACION: z.string().optional().describe('Usuario de creación (USUARIO_CREACION).'),
  COD_TIPO: z.string().optional().describe('Código de tipo actividad (COD_TIPO).'),
  COD_SUBTIPO: z.string().optional().describe('Código de subtipo de actividad (COD_SUBTIPO).'),
  MEDIO_CONTACTO: z.string().optional().describe('Medio de contacto (MEDIO_CONTACTO).'),
  SENTIDO_CONTACTO: z.string().optional().describe('Sentido de contacto (SENTIDO_CONTACTO).'),
  COD_ESTADO: z.enum(['A', 'P', 'F', 'c']).optional().describe('Estado: A = Abierta, P = Pendiente, F = Finalizada, c = Cancelada (COD_ESTADO).'),
  RESULTADO_CONTACTO: z.string().optional().describe('Resultado de contacto (RESULTADO_CONTACTO).'),
  OBSERVACIONES: z.string().optional().describe('Observaciones (OBSERVACIONES).'),
  NUM_ABONADO: z.string().optional().describe('Número de abonado Contrato Instalaciones (NUM_ABONADO).'),
  ASUNTO: z.string().optional().describe('Asunto (ASUNTO).'),
  FCH_INICIO: z.string().optional().describe('Fecha de inicio ISO (FCH_INICIO).'),
  FCH_FIN: z.string().optional().describe('Fecha de fin ISO (FCH_FIN).'),
  HINICIO: z.string().optional().describe('Hora de inicio (HINICIO).'),
  HFIN: z.string().optional().describe('Hora de fin (HFIN).'),
  SERVICIO: z.string().optional().describe('Servicio (SERVICIO).'),
  CONTACTO1: z.string().optional().describe('Contacto 1 (CONTACTO1).'),
  CONTACTO2: z.string().optional().describe('Contacto 2 (CONTACTO2).'),
  TEL_CONTACTO1: z.string().optional().describe('Teléfono de contacto 1 (TEL_CONTACTO1).'),
  TEL_CONTACTO2: z.string().optional().describe('Teléfono de contacto 2 (TEL_CONTACTO2).'),
  PRIORIDAD: z.number().optional().describe('Prioridad numérica (PRIORIDAD).'),
  FCH_CIERRE: z.string().optional().describe('Fecha de cierre ISO (FCH_CIERRE).'),
  COD_ETAPA: z.string().optional().describe('Código de etapa (COD_ETAPA).'),
  CIERRE_PRINCIPAL: z.string().optional().describe('Cierre principal (CIERRE_PRINCIPAL).'),
  ID_EMPRESA: z.string().optional().describe('Código de empresa (ID_EMPRESA).'),
  FUNCION_ASIGNADA: z.string().optional().describe('Función asignada (FUNCION_ASIGNADA).'),
  PROG_TODO_DIA: z.string().optional().describe('Programación todo el día (PROG_TODO_DIA).'),
  TEL_MOVIL_CONTACTO1: z.string().optional().describe('Teléfono móvil contacto 1 (TEL_MOVIL_CONTACTO1).'),
  TEL_MOVIL_CONTACTO2: z.string().optional().describe('Teléfono móvil contacto 2 (TEL_MOVIL_CONTACTO2).'),
  camposAdicionales,
};

export const CreateActividadShape = { ...actividadFieldsShape };

export const UpdateActividadShape = {
  idReg: z.string().min(1).describe('idReg opaco de la actividad (campo "idReg" en freematica_list_pcrm_actividades).'),
  ...actividadFieldsShape,
};

export type ActividadFields = {
  ID_ACTIVIDAD?: number;
  TIPO_ID?: 'C' | 'T';
  ID_CASO?: number | null;
  ID_OPORTUNIDAD?: number | null;
  ID_CAMPANYA?: string;
  TIPO_ASIGNACION?: 'U' | 'C';
  USU_ASIGNADO?: string;
  COLA_ASIGNADA?: string;
  GRUPO_CLI?: number;
  COD_CLIENTE?: string;
  LOC_CLIENTE?: number;
  FCH_CREACION?: string;
  USUARIO_CREACION?: string;
  COD_TIPO?: string;
  COD_SUBTIPO?: string;
  MEDIO_CONTACTO?: string;
  SENTIDO_CONTACTO?: string;
  COD_ESTADO?: 'A' | 'P' | 'F' | 'c';
  RESULTADO_CONTACTO?: string;
  OBSERVACIONES?: string;
  NUM_ABONADO?: string;
  ASUNTO?: string;
  FCH_INICIO?: string;
  FCH_FIN?: string;
  HINICIO?: string;
  HFIN?: string;
  SERVICIO?: string;
  CONTACTO1?: string;
  CONTACTO2?: string;
  TEL_CONTACTO1?: string;
  TEL_CONTACTO2?: string;
  PRIORIDAD?: number;
  FCH_CIERRE?: string;
  COD_ETAPA?: string;
  CIERRE_PRINCIPAL?: string;
  ID_EMPRESA?: string;
  FUNCION_ASIGNADA?: string;
  PROG_TODO_DIA?: string;
  TEL_MOVIL_CONTACTO1?: string;
  TEL_MOVIL_CONTACTO2?: string;
  camposAdicionales?: Record<string, string | number>;
};

export function buildActividadBody(args: ActividadFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'ID_ACTIVIDAD', args.ID_ACTIVIDAD);
  setIf(body, 'TIPO_ID', args.TIPO_ID);
  if (args.ID_CASO !== undefined) body['ID_CASO'] = args.ID_CASO;
  if (args.ID_OPORTUNIDAD !== undefined) body['ID_OPORTUNIDAD'] = args.ID_OPORTUNIDAD;
  setIf(body, 'ID_CAMPANYA', args.ID_CAMPANYA);
  setIf(body, 'TIPO_ASIGNACION', args.TIPO_ASIGNACION);
  setIf(body, 'USU_ASIGNADO', args.USU_ASIGNADO);
  setIf(body, 'COLA_ASIGNADA', args.COLA_ASIGNADA);
  setIf(body, 'GRUPO_CLI', args.GRUPO_CLI);
  setIf(body, 'COD_CLIENTE', args.COD_CLIENTE);
  setIf(body, 'LOC_CLIENTE', args.LOC_CLIENTE);
  setIf(body, 'FCH_CREACION', args.FCH_CREACION);
  setIf(body, 'USUARIO_CREACION', args.USUARIO_CREACION);
  setIf(body, 'COD_TIPO', args.COD_TIPO);
  setIf(body, 'COD_SUBTIPO', args.COD_SUBTIPO);
  setIf(body, 'MEDIO_CONTACTO', args.MEDIO_CONTACTO);
  setIf(body, 'SENTIDO_CONTACTO', args.SENTIDO_CONTACTO);
  setIf(body, 'COD_ESTADO', args.COD_ESTADO);
  setIf(body, 'RESULTADO_CONTACTO', args.RESULTADO_CONTACTO);
  setIf(body, 'OBSERVACIONES', args.OBSERVACIONES);
  setIf(body, 'NUM_ABONADO', args.NUM_ABONADO);
  setIf(body, 'ASUNTO', args.ASUNTO);
  setIf(body, 'FCH_INICIO', args.FCH_INICIO);
  setIf(body, 'FCH_FIN', args.FCH_FIN);
  setIf(body, 'HINICIO', args.HINICIO);
  setIf(body, 'HFIN', args.HFIN);
  setIf(body, 'SERVICIO', args.SERVICIO);
  setIf(body, 'CONTACTO1', args.CONTACTO1);
  setIf(body, 'CONTACTO2', args.CONTACTO2);
  setIf(body, 'TEL_CONTACTO1', args.TEL_CONTACTO1);
  setIf(body, 'TEL_CONTACTO2', args.TEL_CONTACTO2);
  setIf(body, 'PRIORIDAD', args.PRIORIDAD);
  setIf(body, 'FCH_CIERRE', args.FCH_CIERRE);
  setIf(body, 'COD_ETAPA', args.COD_ETAPA);
  setIf(body, 'CIERRE_PRINCIPAL', args.CIERRE_PRINCIPAL);
  setIf(body, 'ID_EMPRESA', args.ID_EMPRESA);
  setIf(body, 'FUNCION_ASIGNADA', args.FUNCION_ASIGNADA);
  setIf(body, 'PROG_TODO_DIA', args.PROG_TODO_DIA);
  setIf(body, 'TEL_MOVIL_CONTACTO1', args.TEL_MOVIL_CONTACTO1);
  setIf(body, 'TEL_MOVIL_CONTACTO2', args.TEL_MOVIL_CONTACTO2);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Casos — POST/PUT /pcrm/v2/casos
// ---------------------------------------------------------------------------

const casoFieldsShape = {
  NUM_CASO: z.number().optional().describe('Número de caso (NUM_CASO).'),
  FCH_CREACION: z.string().optional().describe('Fecha de creación ISO (FCH_CREACION).'),
  USUARIO_CREACION: z.string().optional().describe('Usuario de creación (USUARIO_CREACION).'),
  FCH_CIERRE: z.string().optional().describe('Fecha de cierre ISO (FCH_CIERRE).'),
  TIPO_ASIGNACION: z.enum(['U', 'C']).optional().describe('Tipo asignación: U = Usuario, C = Cola de Trabajo (TIPO_ASIGNACION).'),
  USU_ASIGNADO: z.string().optional().describe('Usuario asignado (USU_ASIGNADO).'),
  COLA_ASIGNADA: z.string().optional().describe('Cola de trabajo asignada (COLA_ASIGNADA).'),
  ASUNTO: z.string().optional().describe('Asunto del caso (ASUNTO).'),
  COD_TIPO_CASO: z.string().optional().describe('Código tipo de caso (COD_TIPO_CASO).'),
  COD_MOTIVO: z.string().optional().describe('Código motivo del caso (COD_MOTIVO).'),
  COD_MOTIVO2: z.string().optional().describe('Código submotivo del caso (COD_MOTIVO2).'),
  PRIORIDAD: z.number().optional().describe('Prioridad numérica (PRIORIDAD).'),
  COD_ESTADO: z.enum(['P', 'A', 'F', 'C']).optional().describe('Estado: P = Pendiente, A = Abierto, F = Finalizado, C = Cancelado (COD_ESTADO).'),
  COD_GRUPO_CLI: z.number().optional().describe('Grupo de cliente (COD_GRUPO_CLI).'),
  COD_CLIENTE: z.string().optional().describe('Código del cliente (COD_CLIENTE).'),
  CONTACTO: z.string().optional().describe('Contacto del cliente (CONTACTO).'),
  TELEFONO: z.string().optional().describe('Teléfono de contacto (TELEFONO).'),
  NUM_ABONADO: z.string().optional().describe('Número de abonado (NUM_ABONADO).'),
  DESCRIPCION: z.string().optional().describe('Descripción del caso (DESCRIPCION).'),
  RESOLUCION: z.string().optional().describe('Resolución del caso (RESOLUCION).'),
  COD_SUBTIPO_CASO: z.string().optional().describe('Código subtipo del caso (COD_SUBTIPO_CASO).'),
  FUNCION_ASIGNADA: z.string().optional().describe('Función asignada (FUNCION_ASIGNADA).'),
  camposAdicionales,
};

export const CreateCasoShape = { ...casoFieldsShape };

export const UpdateCasoShape = {
  idReg: z.string().min(1).describe('idReg opaco del caso (campo "idReg" en freematica_list_pcrm_casos).'),
  ...casoFieldsShape,
};

export type CasoFields = {
  NUM_CASO?: number;
  FCH_CREACION?: string;
  USUARIO_CREACION?: string;
  FCH_CIERRE?: string;
  TIPO_ASIGNACION?: 'U' | 'C';
  USU_ASIGNADO?: string;
  COLA_ASIGNADA?: string;
  ASUNTO?: string;
  COD_TIPO_CASO?: string;
  COD_MOTIVO?: string;
  COD_MOTIVO2?: string;
  PRIORIDAD?: number;
  COD_ESTADO?: 'P' | 'A' | 'F' | 'C';
  COD_GRUPO_CLI?: number;
  COD_CLIENTE?: string;
  CONTACTO?: string;
  TELEFONO?: string;
  NUM_ABONADO?: string;
  DESCRIPCION?: string;
  RESOLUCION?: string;
  COD_SUBTIPO_CASO?: string;
  FUNCION_ASIGNADA?: string;
  camposAdicionales?: Record<string, string | number>;
};

export function buildCasoBody(args: CasoFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'NUM_CASO', args.NUM_CASO);
  setIf(body, 'FCH_CREACION', args.FCH_CREACION);
  setIf(body, 'USUARIO_CREACION', args.USUARIO_CREACION);
  setIf(body, 'FCH_CIERRE', args.FCH_CIERRE);
  setIf(body, 'TIPO_ASIGNACION', args.TIPO_ASIGNACION);
  setIf(body, 'USU_ASIGNADO', args.USU_ASIGNADO);
  setIf(body, 'COLA_ASIGNADA', args.COLA_ASIGNADA);
  setIf(body, 'ASUNTO', args.ASUNTO);
  setIf(body, 'COD_TIPO_CASO', args.COD_TIPO_CASO);
  setIf(body, 'COD_MOTIVO', args.COD_MOTIVO);
  setIf(body, 'COD_MOTIVO2', args.COD_MOTIVO2);
  setIf(body, 'PRIORIDAD', args.PRIORIDAD);
  setIf(body, 'COD_ESTADO', args.COD_ESTADO);
  setIf(body, 'COD_GRUPO_CLI', args.COD_GRUPO_CLI);
  setIf(body, 'COD_CLIENTE', args.COD_CLIENTE);
  setIf(body, 'CONTACTO', args.CONTACTO);
  setIf(body, 'TELEFONO', args.TELEFONO);
  setIf(body, 'NUM_ABONADO', args.NUM_ABONADO);
  setIf(body, 'DESCRIPCION', args.DESCRIPCION);
  setIf(body, 'RESOLUCION', args.RESOLUCION);
  setIf(body, 'COD_SUBTIPO_CASO', args.COD_SUBTIPO_CASO);
  setIf(body, 'FUNCION_ASIGNADA', args.FUNCION_ASIGNADA);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Oportunidades de negocio — POST/PUT /pcrm/v1/{y v2}/oportunidades-negocio
// ---------------------------------------------------------------------------

const oportunidadFieldsShape = {
  COD_EMPRESA: z.string().optional().describe('Código empresa (COD_EMPRESA).'),
  NOMBRE: z.string().optional().describe('Nombre de la oportunidad (NOMBRE).'),
  FECHA: z.string().optional().describe('Fecha ISO de la oportunidad (FECHA).'),
  COD_GRUPO_CLI: z.number().optional().describe('Código grupo cliente (COD_GRUPO_CLI).'),
  COD_CLI: z.string().optional().describe('Código cliente (COD_CLI).'),
  COD_LOCAL_SERV: z.number().optional().describe('Código localización servicio (COD_LOCAL_SERV).'),
  COD_TIPO_OPOR: z.string().optional().describe('Tipo de oportunidad (COD_TIPO_OPOR).'),
  COD_ETAPA_OPOR: z.string().optional().describe('Etapa de la oportunidad (COD_ETAPA_OPOR).'),
  COD_ESTADO_OPOR: z.string().optional().describe('Estado de la oportunidad (COD_ESTADO_OPOR).'),
  PRIORIDAD: z.number().optional().describe('Prioridad numérica (PRIORIDAD).'),
  VALOR: z.number().optional().describe('Valor estimado de la oportunidad (VALOR).'),
  PROBABILIDAD: z.number().optional().describe('Probabilidad de cierre 0-100 (PROBABILIDAD).'),
  IMP_ADJUDICADO: z.number().optional().describe('Importe adjudicado (IMP_ADJUDICADO).'),
  CRMO_ACT_COMERCIAL_PREVIA: z.string().optional().describe('Actividad comercial propia previa (CRMO_ACT_COMERCIAL_PREVIA).'),
  OBSERVACIONES: z.string().optional().describe('Observaciones (OBSERVACIONES).'),
  FECHA_PREV_CIERRE: z.string().optional().describe('Fecha prevista de cierre ISO (FECHA_PREV_CIERRE).'),
  camposAdicionales,
};

export const CreateOportunidadShape = { ...oportunidadFieldsShape };

export const UpdateOportunidadShape = {
  idReg: z.string().min(1).describe('idReg opaco de la oportunidad (campo "idReg" en freematica_list_oportunidades_negocio).'),
  ...oportunidadFieldsShape,
};

export type OportunidadFields = {
  COD_EMPRESA?: string;
  NOMBRE?: string;
  FECHA?: string;
  COD_GRUPO_CLI?: number;
  COD_CLI?: string;
  COD_LOCAL_SERV?: number;
  COD_TIPO_OPOR?: string;
  COD_ETAPA_OPOR?: string;
  COD_ESTADO_OPOR?: string;
  PRIORIDAD?: number;
  VALOR?: number;
  PROBABILIDAD?: number;
  IMP_ADJUDICADO?: number;
  CRMO_ACT_COMERCIAL_PREVIA?: string;
  OBSERVACIONES?: string;
  FECHA_PREV_CIERRE?: string;
  camposAdicionales?: Record<string, string | number>;
};

export function buildOportunidadBody(args: OportunidadFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'COD_EMPRESA', args.COD_EMPRESA);
  setIf(body, 'NOMBRE', args.NOMBRE);
  setIf(body, 'FECHA', args.FECHA);
  setIf(body, 'COD_GRUPO_CLI', args.COD_GRUPO_CLI);
  setIf(body, 'COD_CLI', args.COD_CLI);
  setIf(body, 'COD_LOCAL_SERV', args.COD_LOCAL_SERV);
  setIf(body, 'COD_TIPO_OPOR', args.COD_TIPO_OPOR);
  setIf(body, 'COD_ETAPA_OPOR', args.COD_ETAPA_OPOR);
  setIf(body, 'COD_ESTADO_OPOR', args.COD_ESTADO_OPOR);
  setIf(body, 'PRIORIDAD', args.PRIORIDAD);
  setIf(body, 'VALOR', args.VALOR);
  setIf(body, 'PROBABILIDAD', args.PROBABILIDAD);
  setIf(body, 'IMP_ADJUDICADO', args.IMP_ADJUDICADO);
  setIf(body, 'CRMO_ACT_COMERCIAL_PREVIA', args.CRMO_ACT_COMERCIAL_PREVIA);
  setIf(body, 'OBSERVACIONES', args.OBSERVACIONES);
  setIf(body, 'FECHA_PREV_CIERRE', args.FECHA_PREV_CIERRE);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Datos ampliados oportunidad — PUT /pcrm/v2/oportunidades-negocio/:idReg/datos-ampliados
// ---------------------------------------------------------------------------

export const UpdateOportunidadDatosAmpladosShape = {
  idReg: z.string().min(1).describe('idReg opaco de la oportunidad (campo "idReg" en freematica_list_oportunidades_negocio).'),
  COVR_COD_EMPRESA: z.string().optional().describe('Código de empresa (COVR_COD_EMPRESA).'),
  COVR_ID_OPORTUNIDAD: z.number().optional().describe('ID de la oportunidad (COVR_ID_OPORTUNIDAD).'),
  COVR_AGRUP: z.string().optional().describe('Código de agrupación (COVR_AGRUP).'),
  COVR_ID_VAL: z.number().optional().describe('ID del valor (COVR_ID_VAL).'),
  COVR_TIPO_LOC: z.string().optional().describe('Tipo de localización de servicio (COVR_TIPO_LOC).'),
  COVR_TIPO_RESP: z.number().optional().describe('Tipo respuesta: 0=lista valores, 1=Sí/No, 2=Texto, 3=PDF Base64, 4=Numérico, 5=Fecha (COVR_TIPO_RESP).'),
  COVR_VALORES_RESPUESTA: z.string().optional().describe('Respuesta texto (si COVR_TIPO_RESP es 0, 1 ó 2) (COVR_VALORES_RESPUESTA).'),
  COVR_FICHERO_B64: z.string().optional().describe('Fichero PDF en formato Base64 (si COVR_TIPO_RESP es 3) (COVR_FICHERO_B64).'),
  COVR_VALOR_NUM: z.number().optional().describe('Valor numérico (si COVR_TIPO_RESP es 4) (COVR_VALOR_NUM).'),
  COVR_VALOR_FCH: z.string().optional().describe('Valor fecha ISO (si COVR_TIPO_RESP es 5) (COVR_VALOR_FCH).'),
};

export type UpdateOportunidadDatosAmpladosFields = {
  idReg: string;
  COVR_COD_EMPRESA?: string;
  COVR_ID_OPORTUNIDAD?: number;
  COVR_AGRUP?: string;
  COVR_ID_VAL?: number;
  COVR_TIPO_LOC?: string;
  COVR_TIPO_RESP?: number;
  COVR_VALORES_RESPUESTA?: string;
  COVR_FICHERO_B64?: string;
  COVR_VALOR_NUM?: number;
  COVR_VALOR_FCH?: string;
};

export function buildDatosAmpladosBody(args: UpdateOportunidadDatosAmpladosFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'COVR_COD_EMPRESA', args.COVR_COD_EMPRESA);
  setIf(body, 'COVR_ID_OPORTUNIDAD', args.COVR_ID_OPORTUNIDAD);
  setIf(body, 'COVR_AGRUP', args.COVR_AGRUP);
  setIf(body, 'COVR_ID_VAL', args.COVR_ID_VAL);
  setIf(body, 'COVR_TIPO_LOC', args.COVR_TIPO_LOC);
  setIf(body, 'COVR_TIPO_RESP', args.COVR_TIPO_RESP);
  setIf(body, 'COVR_VALORES_RESPUESTA', args.COVR_VALORES_RESPUESTA);
  setIf(body, 'COVR_FICHERO_B64', args.COVR_FICHERO_B64);
  setIf(body, 'COVR_VALOR_NUM', args.COVR_VALOR_NUM);
  setIf(body, 'COVR_VALOR_FCH', args.COVR_VALOR_FCH);
  return body;
}
