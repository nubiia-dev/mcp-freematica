/**
 * Utilidades para decodificar los identificadores opacos `idReg` de Freemática.
 *
 * Convención verificada contra el API real (módulo pvss, Contratos):
 *   - Contrato:  idReg = Base64("{EMP}__{DELEG}__{COD}")
 *                Ejemplo: "MDJfXzA4X18yMzA0" → "02__08__2304"
 *   - Servicio:  idReg = Base64("{EMP}__{DELEG}__{CTRT}__{COD}")
 *                Ejemplo: "MDJfXzA4X18yMzA0X18x" → "02__08__2304__1"
 *
 * Los endpoints de escritura de pvss exigen los códigos naturales (empresa,
 * delegación, contrato, servicio) dentro del body además del idReg en el
 * path; estos helpers evitan que el caller tenga que duplicarlos.
 */

export interface ContratoIdRegParts {
  empresa: string;
  delegacion: string;
  codContrato: string;
}

export interface ServicioIdRegParts extends ContratoIdRegParts {
  codServicio: string;
}

function decodeBase64(idReg: string): string {
  return Buffer.from(idReg, 'base64').toString('utf8');
}

/**
 * Decodifica el idReg de una cabecera de contrato.
 *
 * @param idReg - Identificador opaco (Base64 de "EMP__DELEG__COD").
 * @returns Partes del identificador.
 * @throws Error si el idReg no tiene el formato esperado de 3 partes.
 */
export function decodeContratoIdReg(idReg: string): ContratoIdRegParts {
  const decoded = decodeBase64(idReg);
  const parts = decoded.split('__');
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
    throw new Error(
      `idReg de contrato inválido: se esperaba Base64("EMP__DELEG__COD"), se obtuvo "${decoded}"`,
    );
  }
  return { empresa: parts[0], delegacion: parts[1], codContrato: parts[2] };
}

/**
 * Decodifica el idReg de un servicio de contrato.
 *
 * @param idReg - Identificador opaco (Base64 de "EMP__DELEG__CTRT__COD").
 * @returns Partes del identificador.
 * @throws Error si el idReg no tiene el formato esperado de 4 partes.
 */
export function decodeServicioIdReg(idReg: string): ServicioIdRegParts {
  const decoded = decodeBase64(idReg);
  const parts = decoded.split('__');
  if (parts.length !== 4 || parts.some((p) => p.length === 0)) {
    throw new Error(
      `idReg de servicio inválido: se esperaba Base64("EMP__DELEG__CTRT__COD"), se obtuvo "${decoded}"`,
    );
  }
  return {
    empresa: parts[0],
    delegacion: parts[1],
    codContrato: parts[2],
    codServicio: parts[3],
  };
}
