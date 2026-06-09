import pino from 'pino';

/**
 * Nombres de los headers de autenticación de Freemática que NUNCA deben
 * aparecer en ningún log, en ningún nivel (incluido debug y trace).
 *
 * Se usa tanto para sanitizar headers antes de loguear como para verificar
 * que el logger no filtra datos sensibles.
 */
export const AUTH_HEADER_NAMES = [
  'x-auth-token',
  'x-auth-company',
  'x-auth-organization',
  'x-auth-app',
  'x-auth-session',
] as const;

export type AuthHeaderName = (typeof AUTH_HEADER_NAMES)[number];

/**
 * Niveles de log configurables vía la variable de entorno `LOG_LEVEL`.
 *
 * El nivel por defecto es `info`.
 *
 * @see https://getpino.io/#/docs/api?id=level-string
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const VALID_LEVELS: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

function resolveLogLevel(): LogLevel {
  const raw = (process.env['LOG_LEVEL'] ?? 'info').toLowerCase();
  if (VALID_LEVELS.includes(raw as LogLevel)) return raw as LogLevel;
  // Nivel inválido → fallback a info (no lanzar porque puede romper startup)
  process.stderr.write(
    `[freematica-mcp] WARNING: LOG_LEVEL="${raw}" no es válido. Usando "info".\n`,
  );
  return 'info';
}

/**
 * Sanitiza un objeto de headers eliminando todas las claves de autenticación.
 *
 * Retorna un nuevo objeto sin modificar el original. Las claves se comparan
 * en lowercase para cubrir variaciones de capitalización.
 *
 * @param headers - Headers HTTP a sanitizar.
 * @returns Copia de `headers` sin los headers x-auth-*.
 */
export function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!AUTH_HEADER_NAMES.includes(key.toLowerCase() as AuthHeaderName)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Serializer de pino para objetos `req` (peticiones HTTP salientes).
 *
 * Elimina headers de autenticación del objeto antes de serializar. Nunca
 * incluye el body de la petición para evitar filtrar credenciales o PII.
 *
 * @param req - Objeto de petición con headers y metadatos.
 * @returns Representación sanitizada para el log.
 */
function reqSerializer(
  req: { method?: string; path?: string; headers?: Record<string, unknown> } | unknown,
): unknown {
  if (typeof req !== 'object' || req === null) return req;
  const r = req as { method?: string; path?: string; headers?: Record<string, unknown> };
  return {
    method: r.method,
    path: r.path,
    // Sanitizar headers: nunca x-auth-*
    headers: r.headers ? sanitizeHeaders(r.headers) : undefined,
  };
}

/**
 * Logger singleton de la aplicación.
 *
 * Configurado con:
 * - Nivel configurable vía `LOG_LEVEL` (default: `info`)
 * - Serializer `req` que sanitiza headers x-auth-* automáticamente
 * - `pino-pretty` en desarrollo si está disponible
 *
 * Uso:
 * ```ts
 * import { logger } from './logger.js';
 * logger.info({ requestId: 'uuid', method: 'GET', path: '/clientes' }, 'HTTP request');
 * ```
 */
export const logger = pino({
  level: resolveLogLevel(),
  serializers: {
    req: reqSerializer,
    err: pino.stdSerializers.err,
  },
});
