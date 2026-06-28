/**
 * Utilidades de guardrail de tamaño para respuestas del API de Freemática.
 *
 * Centraliza la lógica de lectura del límite de tamaño de respuesta para
 * evitar duplicación entre el cliente HTTP y las tools MCP.
 *
 * @module size-guardrail
 */

/**
 * Lee el límite de respuesta en MB desde la variable de entorno
 * `FREEMATICA_MAX_RESPONSE_SIZE_MB`. Si no está definida o es inválida,
 * devuelve el default de 10 MB.
 *
 * Reglas de validación:
 * - Debe ser un número.
 * - Debe ser un número entero.
 * - Debe estar en el rango [1, 500].
 * Si cualquiera de esas condiciones falla, se devuelve el default de 10 MB.
 *
 * @returns Límite en megabytes (entero en [1, 500]).
 */
export function loadMaxResponseSizeMb(): number {
  const raw = process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'];
  if (raw === undefined || raw === '') return 10;
  const parsed = Number(raw);
  if (isNaN(parsed) || !Number.isInteger(parsed) || parsed < 1 || parsed > 500) return 10;
  return parsed;
}
