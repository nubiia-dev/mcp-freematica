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
 * 9. src/tools/pedidos-compras.ts — líneas 112-113, 136-137: catch con Error genérico (TD-152)
 * 10. src/tools/part/*.ts — catch con Error genérico (no FreematicaError) — Fase 5
 * 11. src/tools/pgrl-correo.ts — catch con Error genérico (pgrl completar)
 * 12. src/tools/pgrl-catalogos.ts — catch con Error genérico (pgrl completar)
 * 13. src/tools/pgrl-instaladores.ts — catch con Error genérico (pgrl completar)
 * 14. src/tools/pgrl-calendarios-festivos.ts — catch con Error genérico (pgrl completar)
 * 15. src/tools/pgrl-cargos-clientes.ts — catch con Error genérico (pgrl completar)
 * 16. src/tools/proveedores.ts (v1) — catch con Error genérico (pgrl completar)
 * 17. src/tools/clientes.ts (v1) — catch con Error genérico (pgrl completar)
 * 18. src/tools/contactos-clientes.ts (v1) — catch con Error genérico (pgrl completar)
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../src/clients/freematica-client.js';
import { BaseClient, FreematicaError } from '../src/clients/base-client.js';
import { createLogger } from '../src/logger.js';
import { registerClientesTools } from '../src/tools/clientes.js';
import { registerContactosClientesTools } from '../src/tools/contactos-clientes.js';
import { registerOportunidadesNegocioTools } from '../src/tools/oportunidades-negocio.js';
import { registerLocalizacionesTools } from '../src/tools/localizaciones.js';
import { registerCalendariosTools } from '../src/tools/calendarios.js';
import { registerCarteraTools } from '../src/tools/cartera.js';
import { registerPedidosComprasTools } from '../src/tools/pedidos-compras.js';
import { registerExistenciasTools } from '../src/tools/part/existencias.js';
import { registerStocksTools } from '../src/tools/part/stocks.js';
import { registerTablasAuxiliaresTools } from '../src/tools/part/tablas-auxiliares.js';
import { registerPgrlCorreoTools } from '../src/tools/pgrl-correo.js';
import { registerPgrlCatalogosTools } from '../src/tools/pgrl-catalogos.js';
import { registerPgrlInstaladoresTools } from '../src/tools/pgrl-instaladores.js';
import { registerPgrlCalendariosFestivosTools } from '../src/tools/pgrl-calendarios-festivos.js';
import { registerPgrlCargosClientesTools } from '../src/tools/pgrl-cargos-clientes.js';
import { registerProveedoresTools } from '../src/tools/proveedores.js';
import { registerAlbaranesTools } from '../src/tools/albaranes.js';
import { registerHabilitacionesTools } from '../src/tools/habilitaciones.js';
import { registerCuadrantesTools } from '../src/tools/cuadrantes.js';
import { registerPettTools } from '../src/tools/pett.js';
import { registerPkaiTools } from '../src/tools/pkai.js';
import { registerPedvTools } from '../src/tools/pedv.js';
import { registerPfreeTools } from '../src/tools/pfree.js';
import { registerPdirTools } from '../src/tools/pdir.js';
import { registerPgdocTools } from '../src/tools/pgdoc.js';
import { registerPcuoTools } from '../src/tools/pcuo.js';
import { registerMcomTools } from '../src/tools/mcom.js';
import { registerPpdeTools } from '../src/tools/ppde.js';
import { registerCompTools } from '../src/tools/comp.js';
import { registerPselTools } from '../src/tools/psel.js';
import { registerPtesTools } from '../src/tools/ptes.js';
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

// ---------------------------------------------------------------------------
// 9. pedidos-compras.ts — catch con Error genérico (no FreematicaError) — TD-152
//
// Estas ramas (instanceof Error check en catch blocks) no se cubren en los
// tests principales que solo ejercen FreematicaError y errores 404/500 del API.
// ---------------------------------------------------------------------------

describe('tool catch branches — pedidos-compras.ts (TD-152)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_pedidos_compra — catches generic Error and returns unexpected_error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPedidosCompra').mockRejectedValueOnce(
      new Error('network timeout'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPedidosComprasTools(server, client);
    const handler = getHandler(server, 'freematica_list_pedidos_compra');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('network timeout');
  });

  it('get_pedido_compra — catches generic Error and returns unexpected_error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getPedidoCompra').mockRejectedValueOnce(
      new Error('json parse error'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPedidosComprasTools(server, client);
    const handler = getHandler(server, 'freematica_get_pedido_compra');

    const result = (await handler({ id: 'some-id' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('json parse error');
  });

  it('list_pedidos_compra — FreematicaError server_error is properly propagated', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPedidosCompra').mockRejectedValueOnce(
      new FreematicaError('server_error', 'Downstream API error'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPedidosComprasTools(server, client);
    const handler = getHandler(server, 'freematica_list_pedidos_compra');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('get_pedido_compra — FreematicaError not_found is properly propagated', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getPedidoCompra').mockRejectedValueOnce(
      new FreematicaError('not_found', 'Pedido no encontrado'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPedidosComprasTools(server, client);
    const handler = getHandler(server, 'freematica_get_pedido_compra');

    const result = (await handler({ id: 'MISSING_ID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});

// ---------------------------------------------------------------------------
// 10. part module — catch con Error genérico (no FreematicaError)
//
// Cubre las ramas `else` (non-FreematicaError) en los catch blocks de los
// sub-módulos del módulo part (Fase 5). Cada test usa vi.spyOn para lanzar
// un plain Error que no es FreematicaError, cubriendo:
//   - if (err instanceof FreematicaError) → FALSE branch
//   - err instanceof Error ? err : ... → TRUE branch (ternario)
// ---------------------------------------------------------------------------

describe('tool catch branches — part module (Fase 5)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_stocks_serie_lote — catches generic Error and returns unexpected_error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listStocksSerieLote').mockRejectedValueOnce(
      new Error('connection reset by peer'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerExistenciasTools(server, client);
    const handler = getHandler(server, 'freematica_list_stocks_serie_lote');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('connection reset by peer');
  });

  it('get_stock — catches generic Error and returns unexpected_error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getStock').mockRejectedValueOnce(
      new Error('socket hang up'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerStocksTools(server, client);
    const handler = getHandler(server, 'freematica_get_stock');

    const result = (await handler({ id: 'IDREG1' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('socket hang up');
  });

  it('list_familias — catches generic Error and returns unexpected_error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listFamilias').mockRejectedValueOnce(
      new Error('upstream timeout'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerTablasAuxiliaresTools(server, client);
    const handler = getHandler(server, 'freematica_list_familias');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('upstream timeout');
  });

  it('get_stock_serie_lote — catches generic Error and returns unexpected_error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getStockSerieLote').mockRejectedValueOnce(
      new Error('dns resolution failed'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerExistenciasTools(server, client);
    const handler = getHandler(server, 'freematica_get_stock_serie_lote');

    const result = (await handler({ id: 'IDREG1' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('dns resolution failed');
  });

  it('list_stocks — catches generic Error and returns unexpected_error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listStocks').mockRejectedValueOnce(
      new Error('network unavailable'),
    );

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerStocksTools(server, client);
    const handler = getHandler(server, 'freematica_list_stocks');

    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('network unavailable');
  });
});

// ---------------------------------------------------------------------------
// 11. pgrl-correo.ts — catch con Error genérico (pgrl completar)
// ---------------------------------------------------------------------------

describe('tool catch branches — pgrl-correo.ts (pgrl completar)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_correos — catches generic Error and returns unexpected_error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCorreosV2').mockRejectedValueOnce(new Error('network timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client);
    const result = (await getHandler(server, 'freematica_list_correos')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('get_correo — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getCorreoV2').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client);
    const result = (await getHandler(server, 'freematica_get_correo')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('list_correos_destinatarios — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCorreosDestinatarios').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client);
    const result = (await getHandler(server, 'freematica_list_correos_destinatarios')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('get_correos_totales — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getCorreosTotales').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client);
    const result = (await getHandler(server, 'freematica_get_correos_totales')({})) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('list_correo_v1 — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCorreoV1').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client);
    const result = (await getHandler(server, 'freematica_list_correo_v1')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('verificar_mail — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'verificarMail').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client);
    const result = (await getHandler(server, 'freematica_verificar_mail')({ email: 'x@x.com' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('mailing_unsubscribe — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'mailingUnsubscribe').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_mailing_unsubscribe')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('mailing_subscribe — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'mailingSubscribe').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_mailing_subscribe')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('create_correo_v1 — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createCorreoV1').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_correo_v1')({ camposAdicionales: {} })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('create_correo (v2) — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createCorreoV2').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_correo')({ camposAdicionales: {} })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('update_correo_estado_v1 — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'updateCorreoEstadoV1').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_update_correo_estado_v1')({ idReg: 'X', fields: {} })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('update_correo_estado (v2) — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'updateCorreoEstadoV2').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCorreoTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_update_correo_estado')({ idReg: 'X', fields: {} })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });
});

// ---------------------------------------------------------------------------
// 12. pgrl-catalogos.ts — catch con Error genérico (pgrl completar)
// ---------------------------------------------------------------------------

describe('tool catch branches — pgrl-catalogos.ts (pgrl completar)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_delegaciones_v1 — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listDelegacionesV1').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCatalogosTools(server, client);
    const result = (await getHandler(server, 'freematica_list_delegaciones_v1')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('get_delegacion_v1 — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getDelegacionV1').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCatalogosTools(server, client);
    const result = (await getHandler(server, 'freematica_get_delegacion_v1')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('get_configuracion_usuario — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getConfiguracionUsuario').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCatalogosTools(server, client);
    const result = (await getHandler(server, 'freematica_get_configuracion_usuario')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('list_auditoria_procesos — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listAuditoriaProcesos').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCatalogosTools(server, client);
    const result = (await getHandler(server, 'freematica_list_auditoria_procesos')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('get_tipo_impuesto — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getTipoImpuesto').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCatalogosTools(server, client);
    const result = (await getHandler(server, 'freematica_get_tipo_impuesto')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('list_usuarios_satelite — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listUsuariosSatelite').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCatalogosTools(server, client);
    const result = (await getHandler(server, 'freematica_list_usuarios_satelite')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });
});

// ---------------------------------------------------------------------------
// 13. pgrl-instaladores.ts — catch con Error genérico (pgrl completar)
// ---------------------------------------------------------------------------

describe('tool catch branches — pgrl-instaladores.ts (pgrl completar)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_instaladores — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listInstaladores').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlInstaladoresTools(server, client);
    const result = (await getHandler(server, 'freematica_list_instaladores')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('get_parte_instalacion — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getParteInstalacion').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlInstaladoresTools(server, client);
    const result = (await getHandler(server, 'freematica_get_parte_instalacion')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('create_instalador_propuesta_compra — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createInstaladorPropuestaCompra').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlInstaladoresTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_instalador_propuesta_compra')({ idInstalador: 'X', fields: {} })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });
});

// ---------------------------------------------------------------------------
// 14. pgrl-calendarios-festivos.ts — catch con Error genérico (pgrl completar)
// ---------------------------------------------------------------------------

describe('tool catch branches — pgrl-calendarios-festivos.ts (pgrl completar)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_calen_festivos — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCalenFestivos').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCalendariosFestivosTools(server, client);
    const result = (await getHandler(server, 'freematica_list_calen_festivos')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('update_calen_festivo — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getCalenFestivo').mockRejectedValueOnce(new Error('network error'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCalendariosFestivosTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_update_calen_festivo')({ idReg: 'X', fields: {} })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });
});

// ---------------------------------------------------------------------------
// 15. pgrl-cargos-clientes.ts — catch con Error genérico (pgrl completar)
// ---------------------------------------------------------------------------

describe('tool catch branches — pgrl-cargos-clientes.ts (pgrl completar)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_cargos_clientes — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCargosClientes').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCargosClientesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_cargos_clientes')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('get_cargo_cliente — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getCargoCliente').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgrlCargosClientesTools(server, client);
    const result = (await getHandler(server, 'freematica_get_cargo_cliente')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });
});

// ---------------------------------------------------------------------------
// 16. proveedores.ts (v1 + write) — catch con Error genérico (pgrl completar)
// ---------------------------------------------------------------------------

describe('tool catch branches — proveedores.ts (pgrl completar)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_proveedores_v1 — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listProveedoresV1').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerProveedoresTools(server, client);
    const result = (await getHandler(server, 'freematica_list_proveedores_v1')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('create_proveedor — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createProveedor').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerProveedoresTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_proveedor')({ fields: {} })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('update_proveedor — catches generic Error (thrown by getProveedor)', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getProveedor').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerProveedoresTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_update_proveedor')({ idReg: 'X', fields: {} })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });
});

// ---------------------------------------------------------------------------
// 17. clientes.ts (v1) — catch con Error genérico (pgrl completar)
// ---------------------------------------------------------------------------

describe('tool catch branches — clientes.ts v1 (pgrl completar)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_clientes_v1 — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listClientesV1').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerClientesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_clientes_v1')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('get_cliente_v1 — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getClienteV1').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerClientesTools(server, client);
    const result = (await getHandler(server, 'freematica_get_cliente_v1')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });
});

// ---------------------------------------------------------------------------
// 18. contactos-clientes.ts (v1) — catch con Error genérico (pgrl completar)
// ---------------------------------------------------------------------------

describe('tool catch branches — contactos-clientes.ts v1 (pgrl completar)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_contactos_clientes_v1 — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listContactosClientesV1').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerContactosClientesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_contactos_clientes_v1')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('get_contacto_cliente — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getContactoCliente').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerContactosClientesTools(server, client);
    const result = (await getHandler(server, 'freematica_get_contacto_cliente')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });
});

// ---------------------------------------------------------------------------
// 19. albaranes.ts — catch con Error genérico (Fase 7)
// ---------------------------------------------------------------------------

describe('tool catch branches — albaranes.ts Fase 7', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_albaranes_factura — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listAlbaranesFactura').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerAlbaranesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_albaranes_factura')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('list_resultados_facturacion — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listResultadosFacturacion').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerAlbaranesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_resultados_facturacion')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('list_naturalezas_abono — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listServiciosPvss').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerAlbaranesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_naturalezas_abono')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('get_albaran_factura — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getAlbaranFactura').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerAlbaranesTools(server, client);
    const result = (await getHandler(server, 'freematica_get_albaran_factura')({ id: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });
});

// ---------------------------------------------------------------------------
// 20. habilitaciones.ts — catch con Error genérico (Fase 7)
// ---------------------------------------------------------------------------

describe('tool catch branches — habilitaciones.ts Fase 7', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('get_solicitud_material — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getSolicitudMaterial').mockRejectedValueOnce(new Error('timeout'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerHabilitacionesTools(server, client);
    const result = (await getHandler(server, 'freematica_get_solicitud_material')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('actualizar_baja_habilitaciones_personal — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'actualizarBajaHabilitacionesPersonal').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerHabilitacionesTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_actualizar_baja_habilitaciones_personal')({ datos: [] })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('actualizar_alta_habilitaciones_servicios — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'actualizarAltaHabilitacionesServicios').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerHabilitacionesTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_actualizar_alta_habilitaciones_servicios')({ datos: [] })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('actualizar_baja_habilitaciones_servicios — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'actualizarBajaHabilitacionesServicios').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerHabilitacionesTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_actualizar_baja_habilitaciones_servicios')({ datos: [] })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });
});

// ---------------------------------------------------------------------------
// 21. cuadrantes.ts — catch con Error genérico (Fase 7 — nuevas tools de lectura)
// ---------------------------------------------------------------------------

describe('tool catch branches — cuadrantes.ts Fase 7 (nuevas tools de lectura)', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('list_inspecciones — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCuadrantes').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCuadrantesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_inspecciones')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('list_plantillas — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCuadrantes').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCuadrantesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_plantillas')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('list_normas — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCuadrantes').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCuadrantesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_normas')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('list_rutas_gestion — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCuadrantes').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCuadrantesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_rutas_gestion')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('list_rutas_planificacion — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCuadrantes').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCuadrantesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_rutas_planificacion')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('list_acompanante_ruta — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listCuadrantes').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCuadrantesTools(server, client);
    const result = (await getHandler(server, 'freematica_list_acompanante_ruta')({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('get_computos_pers_h — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getComputosPersonasH').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCuadrantesTools(server, client);
    const result = (await getHandler(server, 'freematica_get_computos_pers_h')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('create_computo_pers — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createComputoPers').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCuadrantesTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_computo_pers')({})) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('update_computo_pers — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'updateComputoPers').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCuadrantesTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_update_computo_pers')({ idReg: 'X' })) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });

  it('create_computo_pers_h — catches generic Error', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createComputoPersH').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCuadrantesTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_computo_pers_h')({})) as {
      content: { type: string; text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('unexpected_error');
  });
});

// ---------------------------------------------------------------------------
// Fase 8 — módulos pequeños
// ---------------------------------------------------------------------------

describe('coverage-gaps Fase 8 — non-FreematicaError catch branches', () => {
  afterEach(() => vi.restoreAllMocks());

  // pett reads
  it('non-FreematicaError en freematica_list_pett_peticiones_serv', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPettPeticionesServ').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPettTools(server, client);
    const result = (await getHandler(server, 'freematica_list_pett_peticiones_serv')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_list_pett_peticiones_serv_perso', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPettPeticionesServPerso').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPettTools(server, client);
    const result = (await getHandler(server, 'freematica_list_pett_peticiones_serv_perso')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_list_pett_ofertas', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPettOfertas').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPettTools(server, client);
    const result = (await getHandler(server, 'freematica_list_pett_ofertas')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_list_pett_partes_ett_c', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPettPartesEttC').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPettTools(server, client);
    const result = (await getHandler(server, 'freematica_list_pett_partes_ett_c')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // pett writes
  it('non-FreematicaError en freematica_create_pett_peticion_serv', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createPettPeticionServ').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPettTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_pett_peticion_serv')({})) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_update_pett_peticion_serv', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'updatePettPeticionServ').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPettTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_update_pett_peticion_serv')({ idReg: 'X' })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_update_pett_peticion_serv_duplicar', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'updatePettPeticionServDuplicar').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPettTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_update_pett_peticion_serv_duplicar')({ idReg: 'X' })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // pkai
  it('non-FreematicaError en freematica_list_pkai_historicos_v1', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPkaiHistoricosV1').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPkaiTools(server, client);
    const result = (await getHandler(server, 'freematica_list_pkai_historicos_v1')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_create_pkai_marcaje', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createPkaiMarcaje').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPkaiTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_pkai_marcaje')({})) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // pedv
  it('non-FreematicaError en freematica_list_pedv_pedidos', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPedvPedidos').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPedvTools(server, client);
    const result = (await getHandler(server, 'freematica_list_pedv_pedidos')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_create_pedv_pedido_servir', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createPedvPedidoServir').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPedvTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_pedv_pedido_servir')({ idReg: 'X' })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // pfree
  it('non-FreematicaError en freematica_list_pfree_ips', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPfreeIps').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPfreeTools(server, client);
    const result = (await getHandler(server, 'freematica_list_pfree_ips')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_get_pfree_ip', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getPfreeIp').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPfreeTools(server, client);
    const result = (await getHandler(server, 'freematica_get_pfree_ip')({ idReg: 'X' })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // pdir
  it('non-FreematicaError en freematica_list_pdir_csm_indicador', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPdirCsmIndicador').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPdirTools(server, client);
    const result = (await getHandler(server, 'freematica_list_pdir_csm_indicador')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_get_pdir_csm_indicador', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'getPdirCsmIndicador').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPdirTools(server, client);
    const result = (await getHandler(server, 'freematica_get_pdir_csm_indicador')({ idReg: 'X' })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // pgdoc
  it('non-FreematicaError en freematica_list_pgdoc_edocs', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPgdocEdocs').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPgdocTools(server, client);
    const result = (await getHandler(server, 'freematica_list_pgdoc_edocs')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // pcuo
  it('non-FreematicaError en freematica_list_pcuo_beneficiarios', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPcuoBeneficiarios').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPcuoTools(server, client);
    const result = (await getHandler(server, 'freematica_list_pcuo_beneficiarios')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_create_pcuo_beneficiario', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createPcuoBeneficiario').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPcuoTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_pcuo_beneficiario')({})) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // mcom
  it('non-FreematicaError en freematica_list_mcom_usuarios', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listMcomUsuarios').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerMcomTools(server, client);
    const result = (await getHandler(server, 'freematica_list_mcom_usuarios')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_create_mcom_usuario', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createMcomUsuario').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerMcomTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_mcom_usuario')({})) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // ppde
  it('non-FreematicaError en freematica_list_ppde_solicitud_vacaciones', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'listPpdeSolicitudVacaciones').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPpdeTools(server, client);
    const result = (await getHandler(server, 'freematica_list_ppde_solicitud_vacaciones')({ page: 1, items: 20 })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_update_ppde_solicitud_vacacion', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'updatePpdeSolicitudVacacion').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPpdeTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_update_ppde_solicitud_vacacion')({ idReg: 'X' })) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_create_ppde_recordatorio_firma', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createPpdeRecordatorioFirma').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPpdeTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_ppde_recordatorio_firma')({})) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // comp
  it('non-FreematicaError en freematica_create_comp_albaran_compra', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createCompAlbaranCompra').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCompTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_comp_albaran_compra')({})) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  it('non-FreematicaError en freematica_create_comp_registro_gastos_contrato', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createCompRegistroGastosContrato').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCompTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_comp_registro_gastos_contrato')({})) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // psel
  it('non-FreematicaError en freematica_create_psel_candidato', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createPselCandidato').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPselTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_psel_candidato')({})) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });

  // ptes
  it('non-FreematicaError en freematica_create_ptes_importar_fichero_n43', async () => {
    const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    vi.spyOn(client, 'createPtesImportarFicheroN43').mockRejectedValueOnce(new Error('network'));
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPtesTools(server, client, { enableWrites: true });
    const result = (await getHandler(server, 'freematica_create_ptes_importar_fichero_n43')({})) as { content: { type: string; text: string }[]; isError?: boolean; };
    expect(result.isError).toBe(true);
  });
});
