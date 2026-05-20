/**
 * Oportunidad de negocio devuelta por Freemática (módulo pcrm).
 *
 * ~33 campos: `COD_CLI`, `COD_ESTADO_OPOR`, `COD_ETAPA_OPOR`, `NOMBRE`,
 * `VALOR`, `ID_OPORTUNIDAD`, etc. Más un `idReg` opaco para el endpoint
 * singular.
 */
export type OportunidadNegocio = Record<string, unknown>;
