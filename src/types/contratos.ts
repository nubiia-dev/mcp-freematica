/**
 * Response object for GET /pvss/v2/contratos-servicios-material.
 *
 * The exact shape is not documented in the Postman collection. The type is
 * declared as a loose record until we have access to real API responses;
 * tighten it then.
 */
export type VoContratosServMatAsignado = Record<string, unknown>;

/**
 * Cabecera de contrato (tabla VSS_CONTRATOS, módulo pvss).
 *
 * Campos conocidos (verificados contra el API real): CTRT_EMP, CTRT_DELEG,
 * CTRT_COD, CTRT_DES, CTRT_FECHA, CTRT_COD_CLI, CTRT_PAIS, CTRT_PROV,
 * CTRT_CPOSTAL, CTRT_POB, CTRT_TVIA, CTRT_NOMVIA, CTRT_UBIVIA, CTRT_ABIERTO,
 * CTRT_LOC_SERV, CTRT_ESTADISTICO, idReg.
 *
 * El campo `idReg` es Base64("{EMP}__{DELEG}__{COD}").
 */
export type VoContrato = Record<string, unknown>;

/**
 * Servicio de un contrato (tabla VSS_CONTRATOS_SERV, módulo pvss).
 *
 * Campos conocidos: CTRTS_EMP, CTRTS_DELEG, CTRTS_CTRT, CTRTS_COD, CTRTS_DES,
 * CTRTS_INSP, CTRTS_TIPO, CTRTS_FECALTA, CTRTS_FECFIN, CTRTS_PRECIO_ESP,
 * CTRTS_CLASE, CTRTS_CALFEST, CTRTS_OBS_PUESTO, idReg.
 *
 * El campo `idReg` es Base64("{EMP}__{DELEG}__{CTRT}__{COD}").
 */
export type VoContratoServicio = Record<string, unknown>;

/** Datos de facturación de un servicio (VoServiciosFac, campos CTRTF_*). */
export type VoServiciosFac = Record<string, unknown>;

/** Histórico de precios de un servicio (VoServiciosHistPr, campos SERVHPR_*). */
export type VoServiciosHistPr = Record<string, unknown>;

/** Texto de facturación de un servicio (VoServiciosFacTxt, campos CTRTFL_*). */
export type VoServiciosFacTxt = Record<string, unknown>;

/** Opcionales de contrato (VoContratosOpcionales, campos CON2_*, módulo ppre). */
export type VoContratosOpcionales = Record<string, unknown>;
