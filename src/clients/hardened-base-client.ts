import { v4 as uuidv4 } from 'uuid';
import { BaseClient, FreematicaError, type BaseClientConfig } from './base-client.js';
import type { FreematicaEnvelope } from '../types/api-envelope.js';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

/**
 * Estados posibles del circuit breaker.
 *
 * - `closed`   → funcionamiento normal, las peticiones pasan.
 * - `open`     → cortocircuito activo, las peticiones fallan rápido sin tocar la red.
 * - `half-open`→ período de prueba tras expirar el timeout; se deja pasar 1 petición.
 */
type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Configuración extendida del cliente con hardening.
 *
 * Todos los campos son opcionales: se toman de variables de entorno si no se
 * especifican, o de los valores por defecto documentados.
 */
export interface HardenedClientConfig extends BaseClientConfig {
  /** Timeout por petición en ms. Default: `FREEMATICA_TIMEOUT_MS` || 30000. */
  timeoutMs?: number;
  /** Número máximo de reintentos para errores 5xx. Default: `FREEMATICA_MAX_RETRIES` || 3. */
  maxRetries?: number;
  /** Umbral de fallos consecutivos para abrir el circuit breaker. Default: `FREEMATICA_CIRCUIT_BREAKER_THRESHOLD` || 5. */
  circuitBreakerThreshold?: number;
  /** Tiempo en ms que el circuit breaker permanece abierto. Default: `FREEMATICA_CIRCUIT_BREAKER_TIMEOUT_MS` || 30000. */
  circuitBreakerTimeoutMs?: number;
}

/** Delays base del backoff exponencial (en ms). */
const BACKOFF_DELAYS_MS = [500, 1000, 2000] as const;

/** Jitter máximo añadido a cada delay (ms). */
const MAX_JITTER_MS = 200;

// ---------------------------------------------------------------------------
// Circuit breaker (in-memory, per client instance)
// ---------------------------------------------------------------------------

/**
 * Circuit Breaker in-memory para proteger contra cascadas de fallos.
 *
 * ### Implementación
 * Patrón clásico de 3 estados:
 * - **closed** → peticiones normales. Contador de fallos consecutivos.
 * - **open**   → tras `threshold` fallos, bloquea durante `timeoutMs`.
 * - **half-open** → permite 1 petición de prueba. Si tiene éxito → closed.
 *                   Si falla → vuelve a open.
 *
 * Esta implementación es ligera y sin dependencias externas. No usa timers
 * activos (lazy evaluation): el estado se recalcula en cada llamada.
 */
class CircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private readonly threshold: number;
  private readonly timeoutMs: number;

  constructor(threshold: number, timeoutMs: number) {
    this.threshold = threshold;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Retorna el estado actual del circuit breaker, teniendo en cuenta si el
   * timeout de apertura ya expiró (transición open → half-open).
   */
  getState(): CircuitState {
    if (this.state === 'open' && this.openedAt !== null) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.timeoutMs) {
        this.state = 'half-open';
        logger.info({ circuitBreaker: 'half-open' }, 'Circuit breaker transitioning to half-open');
      }
    }
    return this.state;
  }

  /**
   * Registra un éxito: resetea el contador de fallos y cierra el circuito.
   */
  recordSuccess(): void {
    if (this.state !== 'closed') {
      logger.info({ circuitBreaker: 'closed' }, 'Circuit breaker closed after successful request');
    }
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }

  /**
   * Registra un fallo lógico (operación post-retry-exhaustion) e incrementa
   * el contador de fallos consecutivos. Abre el circuito si se supera el umbral.
   *
   * ### Semántica de "fallo lógico"
   *
   * El circuit breaker cuenta **operaciones fallidas después de agotar todos
   * los reintentos**, NO intentos HTTP individuales. Con los valores por defecto
   * (threshold=5, maxRetries=3), se pueden producir hasta 5 × (3 + 1) = **20
   * peticiones HTTP upstream** antes de que el breaker se abra. Esto es
   * intencionado: los blips transitorios (errores 5xx esporádicos que se
   * resuelven en el segundo intento) NO deben abrir el circuito.
   *
   * Ajusta via:
   * - `FREEMATICA_CIRCUIT_BREAKER_THRESHOLD` (default 5)
   * - `FREEMATICA_MAX_RETRIES` (default 3)
   */
  recordFailure(): void {
    this.consecutiveFailures++;
    if (this.state === 'half-open' || this.consecutiveFailures >= this.threshold) {
      this.state = 'open';
      this.openedAt = Date.now();
      logger.warn(
        {
          circuitBreaker: 'open',
          consecutiveFailures: this.consecutiveFailures,
          threshold: this.threshold,
        },
        'Circuit breaker opened',
      );
    }
  }

  /**
   * Verifica si una petición puede pasar según el estado actual.
   *
   * @throws {FreematicaError} Si el circuito está abierto.
   */
  allowRequest(): void {
    const state = this.getState();
    if (state === 'open') {
      throw new FreematicaError(
        'server_error',
        'Circuit breaker is open: too many consecutive failures. Retry later.',
      );
    }
    // half-open: permite pasar pero no cambia el estado hasta ver el resultado
  }
}

// ---------------------------------------------------------------------------
// HardenedBaseClient
// ---------------------------------------------------------------------------

/**
 * Cliente base con hardening de producción.
 *
 * Extiende `BaseClient` añadiendo:
 *
 * - **Timeout configurable** vía `FREEMATICA_TIMEOUT_MS` (default 30s).
 *   Implementado con `AbortController` para poder cancelar peticiones que ya
 *   han comenzado.
 *
 * - **Retry con backoff exponencial** para errores 5xx y errores de red.
 *   Delays: 500ms, 1000ms, 2000ms + jitter aleatorio 0..200ms.
 *   Los errores 4xx nunca se reintentan.
 *   Configurable vía `FREEMATICA_MAX_RETRIES` (default 3).
 *
 * - **Circuit breaker** in-memory: tras `threshold` fallos consecutivos abre
 *   el circuito durante `timeoutMs` ms. Luego pasa a half-open.
 *   Configurable vía `FREEMATICA_CIRCUIT_BREAKER_THRESHOLD` (default 5) y
 *   `FREEMATICA_CIRCUIT_BREAKER_TIMEOUT_MS` (default 30000).
 *
 *   **IMPORTANTE — Semántica de conteo del circuit breaker**: el breaker cuenta
 *   operaciones lógicas fallidas (post-retry-exhaustion), NO intentos HTTP
 *   individuales. Con threshold=5 y maxRetries=3, hacen falta hasta
 *   5 × (3 + 1) = 20 fallos HTTP upstream para abrir el circuito.
 *   Los blips transitorios que se resuelven en el primer reintento NO cuentan.
 *   Ajusta `FREEMATICA_CIRCUIT_BREAKER_THRESHOLD` y `FREEMATICA_MAX_RETRIES`
 *   según la tolerancia a fallos de tu sistema.
 *
 * - **Logging estructurado con pino**: cada petición se loguea con
 *   `requestId`, `method`, `path`, `duration_ms`, `status`. Los headers
 *   x-auth-* NUNCA se loguean.
 *
 * ### Compatibilidad
 *
 * `HardenedBaseClient` es una extensión directa de `BaseClient`. `FreematicaClient`
 * puede extenderlo en lugar de `BaseClient` sin cambios en su API pública.
 *
 * @example
 * class FreematicaClient extends HardenedBaseClient {
 *   async listClientes() { return this.get('/clientes'); }
 * }
 */
export class HardenedBaseClient extends BaseClient {
  private readonly maxRetries: number;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly requestTimeoutMs: number;

  constructor(config: HardenedClientConfig) {
    // Resolver valores desde config o variables de entorno
    const timeoutMs =
      config.timeoutMs ??
      (process.env['FREEMATICA_TIMEOUT_MS']
        ? Number(process.env['FREEMATICA_TIMEOUT_MS'])
        : 30_000);

    super({ ...config, timeoutMs });

    this.requestTimeoutMs = timeoutMs;

    this.maxRetries =
      config.maxRetries ??
      (process.env['FREEMATICA_MAX_RETRIES']
        ? Number(process.env['FREEMATICA_MAX_RETRIES'])
        : 3);

    const cbThreshold =
      config.circuitBreakerThreshold ??
      (process.env['FREEMATICA_CIRCUIT_BREAKER_THRESHOLD']
        ? Number(process.env['FREEMATICA_CIRCUIT_BREAKER_THRESHOLD'])
        : 5);

    const cbTimeoutMs =
      config.circuitBreakerTimeoutMs ??
      (process.env['FREEMATICA_CIRCUIT_BREAKER_TIMEOUT_MS']
        ? Number(process.env['FREEMATICA_CIRCUIT_BREAKER_TIMEOUT_MS'])
        : 30_000);

    this.circuitBreaker = new CircuitBreaker(cbThreshold, cbTimeoutMs);
  }

  /**
   * Calcula el delay de backoff para un intento dado.
   *
   * @param attempt - Número de intento (0-based).
   * @returns Delay en ms con jitter aleatorio.
   */
  private backoffDelay(attempt: number): number {
    const base = BACKOFF_DELAYS_MS[Math.min(attempt, BACKOFF_DELAYS_MS.length - 1)] ?? 2000;
    const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
    return base + jitter;
  }

  /**
   * Determina si un error de Freemática debe reintentarse.
   *
   * Se reintentan:
   * - `server_error` (5xx)
   * - `network_error` (ECONNREFUSED, ETIMEDOUT, etc.)
   * - `rate_limit_exceeded` (429): se reintenta honrando el header `Retry-After`
   *   cuando está disponible en `FreematicaError.retryAfter`. Si no hay valor,
   *   se usa el backoff exponencial estándar.
   *
   * Los errores 4xx restantes (`invalid_token`, `forbidden`, `not_found`)
   * NO se reintentan ya que no son transitorios.
   *
   * @param err - Error a evaluar.
   * @returns `true` si debe reintentarse.
   */
  private isRetryable(err: FreematicaError): boolean {
    return err.code === 'server_error' || err.code === 'network_error' || err.code === 'rate_limit_exceeded';
  }

  /**
   * Calcula el delay de reintento para un error dado.
   *
   * Si el error es `rate_limit_exceeded` y tiene `retryAfter` definido y > 0,
   * usa `retryAfter * 1000` ms en lugar del backoff exponencial. Esto honra
   * el header `Retry-After` del servidor y evita martillear la API con
   * backoffs arbitrarios.
   *
   * @param err - Error que causó el reintento.
   * @param attempt - Número de intento (0-based, se pasa attempt-1 al llamador).
   * @returns Delay en ms.
   */
  private retryDelay(err: FreematicaError, attempt: number): number {
    if (err.code === 'rate_limit_exceeded' && err.retryAfter !== undefined && err.retryAfter > 0) {
      return err.retryAfter * 1000;
    }
    return this.backoffDelay(attempt);
  }

  /**
   * Sobreescribe el método `request` de `BaseClient` para añadir:
   * - Circuit breaker check antes de cada petición
   * - Timeout con AbortController
   * - Retry con backoff exponencial para errores reintentables
   * - Logging estructurado de cada intento
   *
   * @param method - Método HTTP.
   * @param path - Path del endpoint (sin query con credenciales).
   * @param body - Body opcional.
   * @returns Resultado desempaquetado del envelope Freemática.
   */
  protected override async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    // Circuit breaker check
    this.circuitBreaker.allowRequest();

    const requestId = uuidv4();
    // Extraer sólo el path (sin query con credenciales) para el log
    const logPath = path.split('?')[0] ?? path;

    let lastError: FreematicaError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const start = Date.now();

      if (attempt > 0 && lastError !== undefined) {
        const delay = this.retryDelay(lastError, attempt - 1);
        logger.debug(
          { requestId, attempt, delay_ms: delay, reason: lastError.code },
          'Retrying request after backoff delay',
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        // Timeout con AbortController
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        let result: T;
        try {
          result = await this.requestWithSignal<T>(method, path, body, controller.signal);
        } finally {
          clearTimeout(timeoutHandle);
        }

        const duration = Date.now() - start;
        logger.info(
          {
            requestId,
            method,
            path: logPath,
            duration_ms: duration,
            status: 'ok',
            attempt,
          },
          'HTTP request completed',
        );

        this.circuitBreaker.recordSuccess();
        return result;
      } catch (err) {
        const duration = Date.now() - start;

        // Mapear AbortError/ERR_CANCELED (timeout via AbortController) a network_error.
        // Axios transforma el AbortSignal abort en un AxiosError con code='ERR_CANCELED'
        // (o en algunos entornos un Error con name='AbortError'). Ambos indican timeout.
        let freematicaErr: FreematicaError;
        const isAbort =
          (err instanceof Error && err.name === 'AbortError') ||
          (err instanceof Error && (err as { code?: string }).code === 'ERR_CANCELED') ||
          (err instanceof Error && err.message.toLowerCase().includes('cancel'));
        if (isAbort) {
          freematicaErr = new FreematicaError(
            'network_error',
            `Request timed out after ${this.requestTimeoutMs}ms`,
          );
        } else if (err instanceof FreematicaError) {
          freematicaErr = err;
        } else {
          freematicaErr = new FreematicaError(
            'unexpected_error',
            err instanceof Error ? err.message : String(err),
          );
        }

        logger.warn(
          {
            requestId,
            method,
            path: logPath,
            duration_ms: duration,
            status: 'error',
            errorCode: freematicaErr.code,
            attempt,
            maxRetries: this.maxRetries,
          },
          'HTTP request failed',
        );

        lastError = freematicaErr;

        // No reintentar 4xx ni unexpected_error
        if (!this.isRetryable(freematicaErr)) {
          this.circuitBreaker.recordFailure();
          throw freematicaErr;
        }

        // Si quedan intentos, registrar fallo y continuar
        if (attempt < this.maxRetries) {
          // Registramos fallo temporal en CB pero no lo abrimos prematuramente
          // sólo si ya hemos agotado todos los retries:
          continue;
        }

        // Agotados todos los reintentos
        this.circuitBreaker.recordFailure();
        throw freematicaErr;
      }
    }

    // Este punto es inalcanzable pero TypeScript lo requiere
    this.circuitBreaker.recordFailure();
    throw lastError ?? new FreematicaError('unexpected_error', 'Unknown error in retry loop');
  }

  /**
   * Ejecuta la petición HTTP usando el AxiosInstance del padre con soporte
   * para AbortSignal.
   *
   * Usa los métodos `mapEnvelopeError` y `mapAxiosError` heredados de
   * `BaseClient` (ahora `protected`) para evitar duplicación de lógica.
   *
   * @param method - Método HTTP.
   * @param path - Ruta del endpoint.
   * @param body - Body opcional.
   * @param signal - AbortSignal para timeout.
   * @returns Resultado desempaquetado.
   */
  private async requestWithSignal<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body: unknown,
    signal: AbortSignal,
  ): Promise<T> {
    try {
      const res = await this.http.request<FreematicaEnvelope<T>>({
        method,
        url: path,
        data: body,
        signal,
      });
      const envelope = res.data;
      if (envelope?.errorCode !== '200') {
        throw this.mapEnvelopeError(envelope);
      }
      return envelope.data;
    } catch (err) {
      if (err instanceof FreematicaError) throw err;
      // AbortError y ERR_CANCELED (Axios) propagados directamente para que el
      // catch del retry loop los mapee a network_error con mensaje "timed out"
      if (err instanceof Error && err.name === 'AbortError') throw err;
      if (err instanceof Error && (err as { code?: string }).code === 'ERR_CANCELED') throw err;
      throw this.mapAxiosError(err);
    }
  }

  /**
   * Expone las métricas del circuit breaker para observabilidad.
   *
   * @returns Estado actual del circuit breaker.
   */
  getCircuitBreakerState(): CircuitState {
    return this.circuitBreaker.getState();
  }
}
