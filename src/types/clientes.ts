/**
 * Cliente devuelto por Freemática.
 *
 * El shape exacto tiene ~87 campos en mayúsculas (`COD_CLI`, `NOMBRE_CLI`,
 * `NIF`, `FECHA_ALTA`, etc.) más un campo `idReg` opaco (base64) que es la
 * clave para los endpoints singulares. Se mantiene como `Record<string, unknown>`
 * hasta que tengamos un caso de uso que justifique tipar campos concretos.
 */
export type Cliente = Record<string, unknown>;
