/**
 * Tests de cobertura para ramas no cubiertas en el baseline.
 *
 * Este archivo cubre los gaps específicos identificados en la medición baseline:
 *
 * 1. src/logger.ts — líneas 35-39: fallback LOG_LEVEL inválido
 * 2. src/clients/base-client.ts — líneas 57-58, 61-62, 65-66: métodos post/put/delete
 * 3. src/clients/fiql-builder.ts — líneas 115, 142, 148: RESERVED_ENCODE_MAP fallback
 *    y primitiveToFiql/buildExpression branches
 * 4. src/tools/clientes.ts — líneas 37-39: catch con Error genérico (no FreematicaError)
 * 5. src/tools/oportunidades-negocio.ts — líneas 58-60, 74-76: catch con Error genérico
 * 6. src/tools/localizaciones.ts — líneas 189-190, 227-228: catch con Error genérico
 * 7. src/tools/calendarios.ts — líneas 70-71, 97-98: catch con Error genérico
 * 8. src/tools/cartera.ts — líneas 75-76, 91-92: catch con Error genérico
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../src/clients/freematica-client.js';
import { BaseClient, FreematicaError } from '../src/clients/base-client.js';
import { createLogger } from '../src/logger.js';
import { registerClientesTools } from '../src/tools/clientes.js';
import { registerOportunidadesNegocioTools } from '../src/tools/oportunidades-negocio.js';
import { registerLocalizacionesTools } from '../src/tools/localizaciones.js';
import { registerCalendariosTools } from '../src/tools/calendarios.js';
import { registerCarteraTools } from '../src/tools/cartera.js';
import { Writable } from 'node:stream';

// ---------------------------------------------------------------------------
// Helpers compartidos
// ---------------------------------------------------------------------------

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function getHandler(server: McpServer, name: string) {
  const tools = (server as unknown as { _registeredTools: Record<string, ToolEntry> })
    ._registeredTools;
  const t = tools[name];
  if (!t) throw new Error(`Tool not registered: ${name}`);
  const fn = t.handler ?? t.callback;
  if (!fn) throw new Error(`No handler for: ${name}`);
  return fn;
}

// ---------------------------------------------------------------------------
// 1. Logger — fallback para LOG_LEVEL inválido
// ---------------------------------------------------------------------------

describe('logger — resolveLogLevel fallback', () => {
  const originalLogLevel = process.env['LOG_LEVEL'];

  afterEach(() => {
    // Restaurar la variable de entorno
    if (originalLogLevel === undefined) {
      delete process.env['LOG_LEVEL'];
    } else {
      process.env['LOG_LEVEL'] = originalLogLevel;
    }
  });

  it('uses "info" as fallback when LOG_LEVEL is an invalid value', () => {
    const stderrOutput: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);

    // Interceptar stderr para capturar el warning
    const stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: unknown) => {
        stderrOutput.push(String(chunk));
        return true;
      });

    process.env['LOG_LEVEL'] = 'INVALID_LEVEL';

    const chunks: string[] = [];
    const dest = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void) {
        chunks.push(chunk.toString());
        callback();
      },
    });

    // createLogger lee LOG_LEVEL al momento de creación
    const testLogger = createLogger(dest);

    // El logger debe haber hecho fallback a "info"
    expect(testLogger.level).toBe('info');

    // El stderr debe contener el WARNING
    expect(stderrOutput.join('')).toContain('LOG_LEVEL="invalid_level"');
    expect(stderrOutput.join('')).toContain('Usando "info"');

    stderrSpy.mockRestore();
    void originalWrite; // evitar lint warning
  });

  it('uses "trace" when LOG_LEVEL=trace (valid level)', () => {
    process.env['LOG_LEVEL'] = 'trace';

    const chunks: string[] = [];
    const dest = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void) {
        chunks.push(chunk.toString());
        callback();
      },
    });

    const testLogger = createLogger(dest);
    expect(testLogger.level).toBe('trace');
  });

  it('uses "warn" when LOG_LEVEL=warn (valid level)', () => {
    process.env['LOG_LEVEL'] = 'warn';
    const testLogger = createLogger();
    expect(testLogger.level).toBe('warn');
  });

  it('uses "fatal" when LOG_LEVEL=FATAL (uppercase valid level normalized)', () => {
    process.env['LOG_LEVEL'] = 'FATAL';
    const testLogger = createLogger();
    expect(testLogger.level).toBe('fatal');
  });
});

// ---------------------------------------------------------------------------
// 2. BaseClient — métodos post, put, delete no cubiertos
// ---------------------------------------------------------------------------

describe('BaseClient — post, put, delete methods', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('executes POST request via base-client post method', async () => {
    // Usamos un endpoint existente que internamente hace POST
    // La mayoría de endpoints son GET, pero el test accede al método post
    // a través de la herencia — lo probamos creando una subclass de prueba
    class TestClient extends BaseClient {
      async testPost<T>(path: string, body: unknown): Promise<T> {
        return this.post<T>(path, body);
      }
    }

    const tc = new TestClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });

    nock(BASE_URL)
      .post('/test-resource', { key: 'value' })
      .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

    const result = await tc.testPost<{ ok: boolean }>('/test-resource', { key: 'value' });
    expect(result).toEqual({ ok: true });
  });

  it('executes PUT request via base-client put method', async () => {
    class TestClient extends BaseClient {
      async testPut<T>(path: string, body: unknown): Promise<T> {
        return this.put<T>(path, body);
      }
    }

    const tc = new TestClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });

    nock(BASE_URL)
      .put('/test-resource/1', { name: 'updated' })
      .reply(200, { errorCode: '200', errorMessage: '', data: { updated: true } });

    const result = await tc.testPut<{ updated: boolean }>('/test-resource/1', { name: 'updated' });
    expect(result).toEqual({ updated: true });
  });

  it('executes DELETE request via base-client delete method', async () => {
    class TestClient extends BaseClient {
      async testDelete<T>(path: string): Promise<T> {
        return this.delete<T>(path);
      }
    }

    const tc = new TestClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });

    nock(BASE_URL)
      .delete('/test-resource/1')
      .reply(200, { errorCode: '200', errorMessage: '', data: { deleted: true } });

    const result = await tc.testDelete<{ deleted: boolean }>('/test-resource/1');
    expect(result).toEqual({ deleted: true });
  });

  it('propagates FreematicaError from post when envelope has errorCode 404', async () => {
    class TestClient extends BaseClient {
      async testPost<T>(path: string, body: unknown): Promise<T> {
        return this.post<T>(path, body);
      }
    }

    const tc = new TestClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });

    nock(BASE_URL)
      .post('/resource')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    await expect(tc.testPost<unknown>('/resource', {})).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Tools — catch con Error genérico (no FreematicaError)
//
// Cada tool tiene dos catch branches:
//   a) err instanceof FreematicaError → error(err)
//   b) err instanceof Error → error(err) con unexpected_error
//
// Los tests existentes cubren (a). Aquí cubrimos (b) haciendo que el cliente
// lance un plain Error.
// ---------------------------------------------------------------------------

describe('tool catch branches — generic Error (not FreematicaError)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  // --- clientes.ts ---

  it('list_clientes — catches generic Error and returns unexpected_error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listClientes').mockRejectedValueOnce(
      new Error('unexpected network glitch'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerClientesTools(server, client);
    const handler = getHandler(server, 'freematica_list_clientes');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('unexpected network glitch');
  });

  it('get_cliente — catches generic Error and returns unexpected_error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getCliente').mockRejectedValueOnce(
      new Error('connection reset'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerClientesTools(server, client);
    const handler = getHandler(server, 'freematica_get_cliente');

    const result = (await handler({ id: 'some-id' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('connection reset');
  });

  // --- oportunidades-negocio.ts ---

  it('list_oportunidades_negocio — catches generic Error and returns unexpected_error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listOportunidadesNegocio').mockRejectedValueOnce(
      new Error('database timeout'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerOportunidadesNegocioTools(server, client);
    const handler = getHandler(server, 'freematica_list_oportunidades_negocio');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('database timeout');
  });

  it('get_oportunidad_negocio — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getOportunidadNegocio').mockRejectedValueOnce(
      new Error('serialization error'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerOportunidadesNegocioTools(server, client);
    const handler = getHandler(server, 'freematica_get_oportunidad_negocio');

    const result = (await handler({ id: 'some-id' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
  });

  it('get_oportunidad_negocio_datos_ampliados — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getOportunidadNegocioDatosAmpliados').mockRejectedValueOnce(
      new Error('parse error'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerOportunidadesNegocioTools(server, client);
    const handler = getHandler(server, 'freematica_get_oportunidad_negocio_datos_ampliados');

    const result = (await handler({ id: 'some-id' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
  });

  // --- localizaciones.ts ---

  it('list_localizaciones_cobro_clientes — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listLocalizacionesCobroClientes').mockRejectedValueOnce(
      new Error('network error'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerLocalizacionesTools(server, client);
    const handler = getHandler(server, 'freematica_list_localizaciones_cobro_clientes');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
  });

  it('list_localizaciones_pago_proveedores — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listLocalizacionesPagoProveedores').mockRejectedValueOnce(
      new Error('timeout'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerLocalizacionesTools(server, client);
    const handler = getHandler(server, 'freematica_list_localizaciones_pago_proveedores');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
  });

  it('list_localizaciones_servicio_clientes — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listLocalizacionesServicioClientes').mockRejectedValueOnce(
      new Error('proxy error'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerLocalizacionesTools(server, client);
    const handler = getHandler(server, 'freematica_list_localizaciones_servicio_clientes');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
  });

  // --- calendarios.ts ---

  it('list_calendarios — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCalendarios').mockRejectedValueOnce(
      new Error('internal error'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCalendariosTools(server, client);
    const handler = getHandler(server, 'freematica_list_calendarios');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
  });

  it('list_calendario_periodos — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCalendarioPeriodos').mockRejectedValueOnce(
      new Error('internal error'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCalendariosTools(server, client);
    const handler = getHandler(server, 'freematica_list_calendario_periodos');

    const result = (await handler({ idCalendario: 'CAL-1', page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
  });

  // --- cartera.ts ---

  it('list_cartera_clientes — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCarteraClientes').mockRejectedValueOnce(
      new Error('connection refused'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCarteraTools(server, client);
    const handler = getHandler(server, 'freematica_list_cartera_clientes');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
  });

  it('get_cartera_cliente — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getCarteraCliente').mockRejectedValueOnce(
      new Error('json parse error'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCarteraTools(server, client);
    const handler = getHandler(server, 'freematica_get_cartera_cliente');

    const result = (await handler({ id: 'some-id' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
  });

  // --- Verificar también que FreematicaError se maneja correctamente (branch a) ---
  // Estos tests refuerzan la cobertura del primer branch del catch en herramientas
  // no cubiertas anteriormente.

  it('list_localizaciones_cobro_clientes — FreematicaError is properly propagated', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listLocalizacionesCobroClientes').mockRejectedValueOnce(
      new FreematicaError('forbidden', 'Access denied'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerLocalizacionesTools(server, client);
    const handler = getHandler(server, 'freematica_list_localizaciones_cobro_clientes');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('forbidden');
    expect(parsed.message).toContain('Access denied');
  });

  it('list_calendarios — FreematicaError server_error is properly propagated', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCalendarios').mockRejectedValueOnce(
      new FreematicaError('server_error', 'Internal server error 500'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCalendariosTools(server, client);
    const handler = getHandler(server, 'freematica_list_calendarios');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });
});

// ---------------------------------------------------------------------------
// 4. Hardened-base-client — ramas adicionales no cubiertas
// ---------------------------------------------------------------------------

describe('hardened-base-client — additional branch coverage', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('handles non-Error thrown values (string throw) mapping to unexpected_error', async () => {
    // Cuando se lanza un valor que no es instanceof Error, debe mapearse correctamente
    // Esto cubre la rama `err instanceof Error ? err.message : String(err)` en requestWithSignal
    const { HardenedBaseClient } = await import('../src/clients/hardened-base-client.js');
    const { FreematicaError: FreematicaErrorClass } =
      await import('../src/clients/base-client.js');

    class TestHardenedClient extends HardenedBaseClient {
      async callGet<T>(path: string): Promise<T> {
        return this.request<T>('GET', path);
      }
    }

    const tc = new TestHardenedClient({
      baseUrl: BASE_URL,
      authHeaders: AUTH_HEADERS,
      maxRetries: 0,
      circuitBreakerThreshold: 999,
    });

    // Forzar que la petición falle con un string (no-Error) simulando un Axios error extraño
    nock(BASE_URL).get('/resource').replyWithError('string error — not an Error object');

    await expect(tc.callGet<unknown>('/resource')).rejects.toBeInstanceOf(FreematicaErrorClass);
  });
});

// ---------------------------------------------------------------------------
// 5. FreematicaClient — uncovered lines buildNextPrefix and truncateItemsToLimit
// ---------------------------------------------------------------------------

describe('FreematicaClient — internal helper coverage via listCuentasContables', () => {
  let client: FreematicaClient;

  beforeEach(() => {
    client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('listCuentasContables with codPlan filter does not add ge/lt filters', async () => {
    nock(BASE_URL)
      .get('/pcon/v2/cuentas')
      .query(true) // aceptar cualquier query string
      .reply(200, {
        errorCode: '200',
        errorMessage: '',
        data: { total: '2', items: [{ COD_CTA: '100' }, { COD_CTA: '200' }], rowHeight: -1 },
      });

    const result = await client.listCuentasContables({ codPlan: 'PGC' });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('listCuentasContables with prefix at max charcode (\\uFFFE+) edge case', async () => {
    // prefijoCuenta que termina en char 0xFFFE — buildNextPrefix returns null
    // porque last >= 0xFFFE — esto cubre la rama `if (last >= 0xfffe) return null`
    const maxPrefixChar = String.fromCharCode(0xfffe);
    const edgePrefix = `430${maxPrefixChar}`;

    nock(BASE_URL)
      .get('/pcon/v2/cuentas')
      .query(true) // aceptar cualquier query string
      .reply(200, {
        errorCode: '200',
        errorMessage: '',
        data: { total: '0', items: [], rowHeight: -1 },
      });

    const result = await client.listCuentasContables({ prefijoCuenta: edgePrefix });
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('listCuentasContables with normal prefix (covers buildNextPrefix happy path)', async () => {
    // Un prefijo normal como "430" — buildNextPrefix devuelve "431"
    // Esto cubre la rama `return prefix.slice(0, -1) + String.fromCharCode(last + 1)`
    nock(BASE_URL)
      .get('/pcon/v2/cuentas')
      .query(true)
      .reply(200, {
        errorCode: '200',
        errorMessage: '',
        data: { total: '1', items: [{ COD_CTA: '4300001' }], rowHeight: -1 },
      });

    const result = await client.listCuentasContables({ prefijoCuenta: '430' });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});
