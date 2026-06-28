/**
 * Tests del HardenedBaseClient: retry, no-retry 4xx, timeout y circuit breaker.
 *
 * Usa nock para interceptar las peticiones HTTP y simular distintos escenarios
 * sin conectarse a la red real.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { HardenedBaseClient } from '../src/clients/hardened-base-client.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

/** Helper: construye un envelope Freemática. */
function envelope<T>(
  data: T,
  errorCode = '200',
  errorMessage = '',
): { errorCode: string; errorMessage: string; data: T } {
  return { errorCode, errorMessage, data };
}

/** Subclase con acceso al método protegido para tests. */
class TestHardenedClient extends HardenedBaseClient {
  testGet<T>(path: string): Promise<T> {
    return this.get<T>(path);
  }
}

/**
 * Crea un cliente configurado con parámetros agresivos para tests:
 * - 3 reintentos máximo
 * - Timeout de 500ms
 * - Circuit breaker con umbral de 5, timeout de 500ms
 */
function makeClient(
  opts: {
    maxRetries?: number;
    timeoutMs?: number;
    cbThreshold?: number;
    cbTimeoutMs?: number;
  } = {},
): TestHardenedClient {
  return new TestHardenedClient({
    baseUrl: BASE_URL,
    authHeaders: AUTH_HEADERS,
    maxRetries: opts.maxRetries ?? 3,
    timeoutMs: opts.timeoutMs ?? 500,
    circuitBreakerThreshold: opts.cbThreshold ?? 5,
    circuitBreakerTimeoutMs: opts.cbTimeoutMs ?? 500,
  });
}

describe('HardenedBaseClient', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ---------------------------------------------------------------------------
  // Retry para 5xx
  // ---------------------------------------------------------------------------

  describe('retry on 5xx', () => {
    it('succeeds after 2 retries (fails twice, then 200)', async () => {
      const client = makeClient({ maxRetries: 3, timeoutMs: 5000 });

      // Dos fallos + un éxito
      nock(BASE_URL).get('/resource').reply(500, 'internal error');
      nock(BASE_URL).get('/resource').reply(503, 'service unavailable');
      nock(BASE_URL).get('/resource').reply(200, envelope({ id: 1 }));

      const result = await client.testGet<{ id: number }>('/resource');
      expect(result).toEqual({ id: 1 });
    }, 15000);

    it('retries on network error (ECONNREFUSED)', async () => {
      const client = makeClient({ maxRetries: 2, timeoutMs: 5000 });

      nock(BASE_URL)
        .get('/x')
        .replyWithError(Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }));
      nock(BASE_URL)
        .get('/x')
        .replyWithError(Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }));
      nock(BASE_URL).get('/x').reply(200, envelope({ ok: true }));

      const result = await client.testGet<{ ok: boolean }>('/x');
      expect(result).toEqual({ ok: true });
    }, 15000);

    it('throws server_error after exhausting all retries', async () => {
      const client = makeClient({ maxRetries: 2, timeoutMs: 5000 });

      // 3 fallos (1 inicial + 2 retries)
      nock(BASE_URL).get('/x').reply(500, 'error 1');
      nock(BASE_URL).get('/x').reply(500, 'error 2');
      nock(BASE_URL).get('/x').reply(500, 'error 3');

      await expect(client.testGet('/x')).rejects.toMatchObject({
        code: 'server_error',
      });
    }, 15000);

    it('retries on envelope errorCode 5xx', async () => {
      const client = makeClient({ maxRetries: 2, timeoutMs: 5000 });

      // Envelope con errorCode de 5xx (respuesta HTTP 200 pero error de negocio)
      nock(BASE_URL).get('/x').reply(200, envelope(null, '500', 'Backend down'));
      nock(BASE_URL).get('/x').reply(200, envelope({ ok: true }));

      const result = await client.testGet<{ ok: boolean }>('/x');
      expect(result).toEqual({ ok: true });
    }, 10000);
  });

  // ---------------------------------------------------------------------------
  // NO retry para 4xx
  // ---------------------------------------------------------------------------

  describe('no retry on 4xx', () => {
    it('does NOT retry on HTTP 404', async () => {
      const client = makeClient({ maxRetries: 3, timeoutMs: 5000 });

      // Solo un nock — si reintentara, el segundo faltaría y nock lanzaría
      const scope = nock(BASE_URL).get('/notfound').reply(404);

      await expect(client.testGet('/notfound')).rejects.toMatchObject({
        code: 'not_found',
      });
      expect(scope.isDone()).toBe(true);
    });

    it('does NOT retry on HTTP 401', async () => {
      const client = makeClient({ maxRetries: 3, timeoutMs: 5000 });
      const scope = nock(BASE_URL).get('/auth').reply(401);

      await expect(client.testGet('/auth')).rejects.toMatchObject({
        code: 'invalid_token',
      });
      expect(scope.isDone()).toBe(true);
    });

    it('does NOT retry on HTTP 403', async () => {
      const client = makeClient({ maxRetries: 3, timeoutMs: 5000 });
      const scope = nock(BASE_URL).get('/forbidden').reply(403);

      await expect(client.testGet('/forbidden')).rejects.toMatchObject({
        code: 'forbidden',
      });
      expect(scope.isDone()).toBe(true);
    });

    it('retries on HTTP 429 and succeeds on second attempt (honoring Retry-After)', async () => {
      // 429 es ahora reintentable (Opción A): se reintenta honrando Retry-After
      const client = makeClient({ maxRetries: 2, timeoutMs: 5000 });

      nock(BASE_URL).get('/rate').reply(429, '', { 'retry-after': '1' });
      nock(BASE_URL).get('/rate').reply(200, envelope({ ok: true }));

      const result = await client.testGet<{ ok: boolean }>('/rate');
      expect(result).toEqual({ ok: true });
    }, 10000);

    it('throws rate_limit_exceeded after exhausting all retries on 429', async () => {
      const client = makeClient({ maxRetries: 2, timeoutMs: 5000 });

      // 3 respuestas 429 (1 inicial + 2 retries)
      nock(BASE_URL).get('/rate').reply(429, '', { 'retry-after': '1' });
      nock(BASE_URL).get('/rate').reply(429, '', { 'retry-after': '1' });
      nock(BASE_URL).get('/rate').reply(429, '', { 'retry-after': '1' });

      await expect(client.testGet('/rate')).rejects.toMatchObject({
        code: 'rate_limit_exceeded',
      });
    }, 15000);

    it('does NOT retry on envelope errorCode 404', async () => {
      const client = makeClient({ maxRetries: 3, timeoutMs: 5000 });
      const scope = nock(BASE_URL).get('/x').reply(200, envelope(null, '404', 'Not found'));

      await expect(client.testGet('/x')).rejects.toMatchObject({
        code: 'not_found',
      });
      expect(scope.isDone()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Timeout
  // ---------------------------------------------------------------------------

  describe('timeout', () => {
    it('throws network_error with timed out message when request exceeds timeoutMs', async () => {
      // Cliente con timeout muy pequeño y sin retries para que falle rápido
      const client = makeClient({ timeoutMs: 100, maxRetries: 0 });

      // Nock con delay mayor que el timeout
      nock(BASE_URL)
        .get('/slow')
        .delay(2000)
        .reply(200, envelope({ ok: true }));

      // Un timeout es un error de red: debe mapearse a network_error con mensaje timed out
      await expect(client.testGet('/slow')).rejects.toMatchObject({
        code: 'network_error',
        message: expect.stringContaining('timed out'),
      });
    }, 10000);
  });

  // ---------------------------------------------------------------------------
  // Circuit Breaker
  // ---------------------------------------------------------------------------

  describe('circuit breaker', () => {
    it('opens after threshold consecutive failures', async () => {
      const THRESHOLD = 3;
      // Timeout corto para evitar backoffs largos en el test
      const client = makeClient({
        cbThreshold: THRESHOLD,
        cbTimeoutMs: 60_000, // Suficientemente largo para que no expire durante el test
        maxRetries: 0,       // Sin retries para contar fallos individuales
        timeoutMs: 5000,
      });

      // Configurar threshold fallos
      for (let i = 0; i < THRESHOLD; i++) {
        nock(BASE_URL).get('/x').reply(500, 'error');
      }

      // Consumir threshold fallos para abrir el circuito
      for (let i = 0; i < THRESHOLD; i++) {
        await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
      }

      // El circuit breaker debe estar abierto ahora
      expect(client.getCircuitBreakerState()).toBe('open');

      // La siguiente llamada debe fallar rápido sin hacer petición HTTP
      // (nock no debería ser necesario)
      await expect(client.testGet('/x')).rejects.toMatchObject({
        code: 'server_error',
        message: expect.stringContaining('Circuit breaker is open'),
      });
    });

    it('transitions to half-open after timeout and allows a probe request', async () => {
      const client = makeClient({
        cbThreshold: 3,
        cbTimeoutMs: 100, // Timeout cortísimo para el test
        maxRetries: 0,
        timeoutMs: 5000,
      });

      // Abrir el circuit breaker
      for (let i = 0; i < 3; i++) {
        nock(BASE_URL).get('/x').reply(500);
        await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
      }

      expect(client.getCircuitBreakerState()).toBe('open');

      // Esperar que expire el timeout del CB
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Ahora debería estar en half-open y permitir 1 petición de prueba
      expect(client.getCircuitBreakerState()).toBe('half-open');

      // La petición de prueba tiene éxito → CB se cierra
      nock(BASE_URL).get('/x').reply(200, envelope({ ok: true }));
      const result = await client.testGet<{ ok: boolean }>('/x');
      expect(result).toEqual({ ok: true });
      expect(client.getCircuitBreakerState()).toBe('closed');
    }, 10000);

    it('re-opens circuit after half-open probe failure', async () => {
      const client = makeClient({
        cbThreshold: 3,
        cbTimeoutMs: 100,
        maxRetries: 0,
        timeoutMs: 5000,
      });

      // Abrir el CB
      for (let i = 0; i < 3; i++) {
        nock(BASE_URL).get('/x').reply(500);
        await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
      }

      // Esperar timeout para llegar a half-open
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(client.getCircuitBreakerState()).toBe('half-open');

      // La petición de prueba falla → CB se reabre
      nock(BASE_URL).get('/x').reply(500);
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
      expect(client.getCircuitBreakerState()).toBe('open');
    }, 10000);

    it('resets circuit after successful request', async () => {
      const client = makeClient({
        cbThreshold: 5,
        cbTimeoutMs: 60_000,
        maxRetries: 0,
        timeoutMs: 5000,
      });

      // Inicialmente cerrado
      expect(client.getCircuitBreakerState()).toBe('closed');

      // Petición exitosa
      nock(BASE_URL).get('/x').reply(200, envelope({ ok: true }));
      await client.testGet('/x');

      expect(client.getCircuitBreakerState()).toBe('closed');
    });
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  describe('happy path', () => {
    it('returns data on successful request', async () => {
      const client = makeClient({ timeoutMs: 5000 });
      nock(BASE_URL).get('/clientes').reply(200, envelope({ id: 42, nombre: 'ACME' }));

      const result = await client.testGet<{ id: number; nombre: string }>('/clientes');
      expect(result).toEqual({ id: 42, nombre: 'ACME' });
    });
  });
});
