import { z } from 'zod';

const AuthConfigSchema = z.object({
  FREEMATICA_BASE_URL: z
    .string()
    .url()
    .default('https://api-p01.clientservicepanel.com/restsat/api'),
  FREEMATICA_AUTH_TOKEN: z.string().min(1),
  FREEMATICA_AUTH_COMPANY: z.string().min(1),
  FREEMATICA_AUTH_ORGANIZATION: z.string().min(1),
  FREEMATICA_AUTH_APP: z.string().min(1),
  FREEMATICA_AUTH_SESSION: z.string().min(1),
});

const HttpConfigSchema = z.object({
  MCP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MCP_ALLOWED_ORIGINS: z.string().default('*'),
});

/**
 * Configuración de hardening del cliente HTTP.
 *
 * Todas las variables tienen valores por defecto seguros que no requieren
 * configuración explícita en la mayoría de los entornos.
 */
const HardeningConfigSchema = z.object({
  /**
   * Timeout por petición HTTP en milisegundos.
   * Por defecto: 30000 (30 segundos).
   */
  FREEMATICA_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300_000).default(30_000),

  /**
   * Número máximo de reintentos para errores 5xx y errores de red.
   * Los errores 4xx nunca se reintentan.
   * Por defecto: 3.
   */
  FREEMATICA_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),

  /**
   * Nivel de logging de pino.
   * Valores válidos: trace | debug | info | warn | error | fatal.
   * Por defecto: info.
   */
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  /**
   * Número de fallos consecutivos antes de abrir el circuit breaker.
   * Por defecto: 5.
   */
  FREEMATICA_CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().int().min(1).max(100).default(5),

  /**
   * Tiempo en ms que el circuit breaker permanece abierto antes de pasar
   * a half-open para intentar recuperarse.
   * Por defecto: 30000 (30 segundos).
   */
  FREEMATICA_CIRCUIT_BREAKER_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(3_600_000)
    .default(30_000),

  /**
   * Tamaño máximo de respuesta aceptado por freematica_export_asientos en
   * megabytes. Si la respuesta del API supera este umbral, los datos se
   * truncan y se añade un campo `warning` a la respuesta de la tool.
   *
   * Se recomienda usar rangos de fecha cortos (max. 1 mes) para evitar
   * alcanzar este límite.
   *
   * Por defecto: 10 (10 MB).
   * Mínimo: 1 MB. Máximo: 500 MB.
   */
  FREEMATICA_MAX_RESPONSE_SIZE_MB: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .default(10),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type HttpConfig = z.infer<typeof HttpConfigSchema>;
export type HardeningConfig = z.infer<typeof HardeningConfigSchema>;
export type Config = AuthConfig & HttpConfig & HardeningConfig;

function formatZodError(err: z.ZodError): string {
  const issues = err.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  return (
    `[freematica-mcp] Invalid configuration:\n${issues}\n\n` +
    `Set the missing/invalid environment variables and restart.`
  );
}

export function loadAuthConfig(): AuthConfig {
  const result = AuthConfigSchema.safeParse(process.env);
  if (!result.success) throw new Error(formatZodError(result.error));
  return result.data;
}

export function loadHttpConfig(): HttpConfig {
  const result = HttpConfigSchema.safeParse(process.env);
  if (!result.success) throw new Error(formatZodError(result.error));
  return result.data;
}

export function loadHardeningConfig(): HardeningConfig {
  const result = HardeningConfigSchema.safeParse(process.env);
  if (!result.success) throw new Error(formatZodError(result.error));
  return result.data;
}

export function loadConfig(): Config {
  return { ...loadAuthConfig(), ...loadHttpConfig(), ...loadHardeningConfig() };
}
