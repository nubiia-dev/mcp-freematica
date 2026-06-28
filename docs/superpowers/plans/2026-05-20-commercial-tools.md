# Commercial Tools v0.4.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar el unwrap del envelope `{ errorCode, errorMessage, data }` en `BaseClient` (bug latente que afecta a las tools v0.3.x) y añadir 6 tools comerciales para clientes, contactos-clientes y oportunidades-negocio con paginación 1-indexed.

**Architecture:** `BaseClient.request<T>` ahora extrae `envelope.data` y mapea `envelope.errorCode` a `FreematicaError`. Los métodos del cliente para listados devuelven `{ items, total }` (porque `data = { total, items, rowHeight }`); los de detalle devuelven el objeto directamente. Las dos tools existentes (`materiales-asignados-servicios`, `master-data`) ajustan su shape de respuesta para incluir `total`. Tres nuevos archivos de tools (uno por entidad) registran las 6 tools nuevas. Schema central de paginación reutilizable.

**Tech Stack:** TypeScript 5.3, Node ≥20, `@modelcontextprotocol/sdk` ^1.27.1, zod, vitest, nock.

**Spec:** `docs/superpowers/specs/2026-05-20-commercial-tools-design.md`
**Branch:** `feat/commercial-tools` (ya creada desde development, contiene commit `e16e3e9` de la spec)

---

## File Structure

| Path                                        | Cambio | Responsabilidad                                                    |
| ------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `src/types/api-envelope.ts`                 | Create | `FreematicaEnvelope<T>`, `FreematicaListData<T>`                   |
| `src/clients/base-client.ts`                | Modify | `request<T>` desempaqueta envelope + `mapEnvelopeError`            |
| `src/clients/freematica-client.ts`          | Modify | Existentes retornan `{ items, total }`; añadir 6 métodos nuevos    |
| `src/schemas/pagination.ts`                 | Create | `PaginationSchema` (page, items)                                   |
| `src/types/clientes.ts`                     | Create | `Cliente = Record<string, unknown>`                                |
| `src/types/contactos-clientes.ts`           | Create | `ContactoCliente = Record<string, unknown>`                        |
| `src/types/oportunidades-negocio.ts`        | Create | `OportunidadNegocio = Record<string, unknown>`                     |
| `src/tools/helpers.ts`                      | Modify | Añadir `okList()`                                                  |
| `src/tools/contratos.ts`                    | Modify | Output incluye `total`                                             |
| `src/tools/master-data.ts`                  | Modify | Output incluye `total`                                             |
| `src/tools/clientes.ts`                     | Create | `registerClientesTools` (2 tools)                                  |
| `src/tools/contactos-clientes.ts`           | Create | `registerContactosClientesTools` (1 tool)                          |
| `src/tools/oportunidades-negocio.ts`        | Create | `registerOportunidadesNegocioTools` (3 tools)                      |
| `src/server.ts`                             | Modify | Registrar 3 nuevas register\*Tools + bump 0.4.0                    |
| `src/server-instructions.ts`                | Modify | Documentar 8 tools + paginación + idReg                            |
| `src/index.ts`                              | Modify | Log literal `v0.4.0`                                               |
| `src/transports/http.ts`                    | Modify | `/health` `version: '0.4.0'`                                       |
| `package.json`                              | Modify | Bump `0.4.0`                                                       |
| `tests/clients/base-client.test.ts`         | Modify | Reescribir mocks para envelope + tests de mapeo envelope.errorCode |
| `tests/clients/freematica-client.test.ts`   | Modify | Ajustar mocks existentes + tests para 6 métodos nuevos             |
| `tests/schemas/pagination.test.ts`          | Create | Defaults, mins/maxes, rechazo de page=0                            |
| `tests/tools/helpers.test.ts`               | Modify | Tests para `okList`                                                |
| `tests/tools/contratos.test.ts`             | Modify | Mocks reflejan envelope + assert nuevo shape                       |
| `tests/tools/master-data.test.ts`           | Modify | Mocks reflejan envelope + assert nuevo shape                       |
| `tests/tools/clientes.test.ts`              | Create | 4-5 tests (registration, 2 handlers, errores)                      |
| `tests/tools/contactos-clientes.test.ts`    | Create | 3 tests                                                            |
| `tests/tools/oportunidades-negocio.test.ts` | Create | 5-6 tests                                                          |
| `tests/server.test.ts`                      | Modify | Asserts para las 5 tools nuevas                                    |
| `README.md`                                 | Modify | Tabla Tools, Paginación, idReg, versión 0.4.0                      |
| `CHANGELOG.md`                              | Modify | Entrada `[0.4.0]`                                                  |

---

## Task 1: Tipos del envelope

**Files:**

- Create: `src/types/api-envelope.ts`

- [ ] **Step 1.1: Verify starting point**

```bash
cd /Users/samu/workspace/mcp-freematica
git status
git branch --show-current
npm test
```

Expected: branch `feat/commercial-tools`, working tree clean (excepto plan untracked OK), 51/51 tests passing.

- [ ] **Step 1.2: Crear `src/types/api-envelope.ts`**

```ts
/**
 * Wrapper universal que devuelve el API REST de Freemática en TODAS las
 * respuestas. El `BaseClient` desempaqueta automáticamente este envelope
 * y propaga `data` al método caller.
 *
 * `errorCode` viene como string (p.ej. "200", "404", "500"). Si es distinto
 * de "200" el `BaseClient` lanza `FreematicaError` con un código mapeado.
 */
export interface FreematicaEnvelope<T> {
  errorCode: string;
  errorMessage: string;
  data: T;
}

/**
 * Shape del campo `data` en endpoints de listado.
 *
 * `total` viene como string del API (típicamente "2007"). El método cliente
 * lo convierte a `number` antes de exponerlo.
 *
 * `rowHeight` es metadata interno del API (parece UI-related); el cliente
 * lo descarta.
 */
export interface FreematicaListData<T> {
  total: string;
  items: T[];
  rowHeight: number;
}
```

- [ ] **Step 1.3: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 1.4: Commit**

```bash
git add src/types/api-envelope.ts
git commit -m "feat: add FreematicaEnvelope and FreematicaListData types"
```

---

## Task 2: BaseClient — unwrap del envelope (TDD)

**Files:**

- Modify: `src/clients/base-client.ts`
- Modify: `tests/clients/base-client.test.ts`

- [ ] **Step 2.1: Rewrite `tests/clients/base-client.test.ts`**

Los tests existentes hacen `nock(...).reply(200, fakeData)` donde `fakeData` es directamente el body que el caller espera. Después del cambio, el API real devuelve `{ errorCode, errorMessage, data: fakeData }`. Hay que reescribir todos los mocks.

Contenido completo nuevo de `tests/clients/base-client.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { BaseClient, FreematicaError } from '../../src/clients/base-client.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

class TestClient extends BaseClient {
  testGet<T>(path: string): Promise<T> {
    return this.get<T>(path);
  }
}

function envelope<T>(
  data: T,
  errorCode = '200',
  errorMessage = '',
): {
  errorCode: string;
  errorMessage: string;
  data: T;
} {
  return { errorCode, errorMessage, data };
}

describe('BaseClient', () => {
  let client: TestClient;

  beforeEach(() => {
    client = new TestClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('header injection', () => {
    it('injects all auth headers and Content-Type on GET', async () => {
      const scope = nock(BASE_URL, {
        reqheaders: {
          'x-auth-token': 'tok',
          'x-auth-company': 'co',
          'x-auth-organization': 'org',
          'x-auth-app': 'app',
          'x-auth-session': 'ses',
          'content-type': 'application/json',
        },
      })
        .get('/ping')
        .reply(200, envelope({ ok: true }));

      const res = await client.testGet<{ ok: boolean }>('/ping');
      expect(res).toEqual({ ok: true });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('envelope unwrap', () => {
    it('returns envelope.data on success (errorCode=200)', async () => {
      nock(BASE_URL)
        .get('/x')
        .reply(200, envelope({ foo: 'bar' }));
      const r = await client.testGet<{ foo: string }>('/x');
      expect(r).toEqual({ foo: 'bar' });
    });

    it('unwraps list-shaped data correctly', async () => {
      const list = { total: '42', items: [{ a: 1 }, { a: 2 }], rowHeight: -1 };
      nock(BASE_URL).get('/list').reply(200, envelope(list));
      const r = await client.testGet<typeof list>('/list');
      expect(r).toEqual(list);
    });
  });

  describe('envelope errorCode mapping', () => {
    it('maps envelope.errorCode=401 to invalid_token', async () => {
      nock(BASE_URL)
        .get('/x')
        .reply(200, envelope(null, '401', 'Unauthorized'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'invalid_token' });
    });

    it('maps envelope.errorCode=403 to forbidden', async () => {
      nock(BASE_URL)
        .get('/x')
        .reply(200, envelope(null, '403', 'Forbidden'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'forbidden' });
    });

    it('maps envelope.errorCode=404 to not_found', async () => {
      nock(BASE_URL)
        .get('/x')
        .reply(200, envelope(null, '404', 'Not Found'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'not_found' });
    });

    it('maps envelope.errorCode=429 to rate_limit_exceeded', async () => {
      nock(BASE_URL)
        .get('/x')
        .reply(200, envelope(null, '429', 'Too Many'));
      await expect(client.testGet('/x')).rejects.toMatchObject({
        code: 'rate_limit_exceeded',
      });
    });

    it('maps envelope.errorCode=500 to server_error', async () => {
      nock(BASE_URL)
        .get('/x')
        .reply(200, envelope(null, '500', 'Internal Error'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
    });

    it('maps envelope.errorCode=503 to server_error', async () => {
      nock(BASE_URL)
        .get('/x')
        .reply(200, envelope(null, '503', 'Service Unavailable'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
    });

    it('falls back to unexpected_error for unknown envelope.errorCode', async () => {
      nock(BASE_URL)
        .get('/x')
        .reply(200, envelope(null, '999', 'Weird'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'unexpected_error' });
    });

    it('includes errorMessage in the FreematicaError message', async () => {
      nock(BASE_URL)
        .get('/x')
        .reply(200, envelope(null, '404', 'Resource gone'));
      await expect(client.testGet('/x')).rejects.toMatchObject({
        message: expect.stringContaining('Resource gone'),
      });
    });
  });

  describe('HTTP-level error mapping (axios errors)', () => {
    it('maps HTTP 401 to invalid_token', async () => {
      nock(BASE_URL).get('/x').reply(401, { error: 'unauthorized' });
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'invalid_token' });
    });

    it('maps HTTP 403 to forbidden', async () => {
      nock(BASE_URL).get('/x').reply(403);
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'forbidden' });
    });

    it('maps HTTP 404 to not_found', async () => {
      nock(BASE_URL).get('/x').reply(404);
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'not_found' });
    });

    it('maps HTTP 429 to rate_limit_exceeded', async () => {
      nock(BASE_URL).get('/x').reply(429, '', { 'retry-after': '5' });
      await expect(client.testGet('/x')).rejects.toMatchObject({
        code: 'rate_limit_exceeded',
        retryAfter: 5,
      });
    });

    it('maps HTTP 500 to server_error', async () => {
      nock(BASE_URL).get('/x').reply(500);
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
    });

    it('maps network error to network_error', async () => {
      nock(BASE_URL).get('/x').replyWithError({ code: 'ECONNREFUSED', message: 'down' });
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'network_error' });
    });
  });

  describe('FreematicaError', () => {
    it('is an Error instance with code property', () => {
      const e = new FreematicaError('forbidden', 'nope');
      expect(e).toBeInstanceOf(Error);
      expect(e.code).toBe('forbidden');
      expect(e.message).toBe('nope');
    });
  });
});
```

- [ ] **Step 2.2: Verify the new tests fail**

```bash
npm test -- tests/clients/base-client.test.ts
```

Expected: FAILs — los nuevos tests "envelope unwrap" y "envelope errorCode mapping" no pasarán porque `BaseClient.request` aún devuelve el envelope completo.

- [ ] **Step 2.3: Update `src/clients/base-client.ts`**

Reemplazar el archivo entero con:

```ts
import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { FreematicaEnvelope } from '../types/api-envelope.js';

export type FreematicaErrorCode =
  | 'invalid_token'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit_exceeded'
  | 'server_error'
  | 'network_error'
  | 'unexpected_error';

export class FreematicaError extends Error {
  constructor(
    public readonly code: FreematicaErrorCode,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'FreematicaError';
  }
}

export interface AuthHeaders {
  'x-auth-token': string;
  'x-auth-company': string;
  'x-auth-organization': string;
  'x-auth-app': string;
  'x-auth-session': string;
}

export interface BaseClientConfig {
  baseUrl: string;
  authHeaders: AuthHeaders;
  timeoutMs?: number;
}

export class BaseClient {
  protected readonly http: AxiosInstance;

  constructor(config: BaseClientConfig) {
    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs ?? 30_000,
      headers: {
        ...config.authHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  protected async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  protected async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  protected async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  protected async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  protected async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    try {
      const res = await this.http.request<FreematicaEnvelope<T>>({
        method,
        url: path,
        data: body,
      });
      const envelope = res.data;
      if (envelope?.errorCode !== '200') {
        throw this.mapEnvelopeError(envelope);
      }
      return envelope.data;
    } catch (err) {
      if (err instanceof FreematicaError) throw err;
      throw this.mapAxiosError(err);
    }
  }

  private mapEnvelopeError(env: FreematicaEnvelope<unknown> | undefined): FreematicaError {
    const code = env?.errorCode ?? 'unknown';
    const msg = env?.errorMessage || `API error (envelope errorCode=${code})`;
    if (code === '401') return new FreematicaError('invalid_token', msg);
    if (code === '403') return new FreematicaError('forbidden', msg);
    if (code === '404') return new FreematicaError('not_found', msg);
    if (code === '429') return new FreematicaError('rate_limit_exceeded', msg);
    if (code.startsWith('5')) return new FreematicaError('server_error', msg);
    return new FreematicaError('unexpected_error', msg);
  }

  private mapAxiosError(err: unknown): FreematicaError {
    if (err instanceof AxiosError) {
      if (err.response) {
        const status = err.response.status;
        if (status === 401)
          return new FreematicaError('invalid_token', 'Authentication failed (401)');
        if (status === 403)
          return new FreematicaError('forbidden', 'Insufficient permissions (403)');
        if (status === 404) return new FreematicaError('not_found', 'Resource not found (404)');
        if (status === 429) {
          const retryAfterHeader = err.response.headers['retry-after'];
          const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
          return new FreematicaError(
            'rate_limit_exceeded',
            `Rate limit exceeded${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`,
            retryAfter,
          );
        }
        if (status >= 500) {
          return new FreematicaError('server_error', `Upstream server error (${status})`);
        }
      }
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        return new FreematicaError('network_error', `Network error: ${err.message}`);
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    return new FreematicaError('unexpected_error', `Unexpected error: ${msg}`);
  }
}
```

- [ ] **Step 2.4: Verify tests pass**

```bash
npm test -- tests/clients/base-client.test.ts
npm run typecheck
```

Expected: PASS todos los nuevos tests. (Full suite todavía fallará — porque `freematica-client.test.ts` y las tools tienen mocks viejos. Eso se arregla en las siguientes tasks.)

- [ ] **Step 2.5: Commit**

```bash
git add src/clients/base-client.ts tests/clients/base-client.test.ts
git commit -m "fix: unwrap envelope and map envelope.errorCode to FreematicaError"
```

---

## Task 3: Refactor `FreematicaClient` — métodos existentes retornan `{ items, total }`

**Files:**

- Modify: `src/clients/freematica-client.ts`
- Modify: `tests/clients/freematica-client.test.ts`

- [ ] **Step 3.1: Rewrite `tests/clients/freematica-client.test.ts`**

Reemplazar todo el archivo con (los tests existentes ajustan shape; el test de `getMasterData` también):

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { FreematicaClient } from '../../src/clients/freematica-client.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

function listEnv<T>(items: T[], total: number) {
  return {
    errorCode: '200',
    errorMessage: '',
    data: { total: String(total), items, rowHeight: -1 },
  };
}

function detailEnv<T>(item: T) {
  return { errorCode: '200', errorMessage: '', data: item };
}

describe('FreematicaClient', () => {
  let client: FreematicaClient;

  beforeEach(() => {
    client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getMaterialesAsignadosServicios', () => {
    it('returns { items, total } from /pvss/v2/contratos-servicios-material', async () => {
      const fake = [{ idreg: 1 }, { idreg: 2 }];
      nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(200, listEnv(fake, 2));
      const result = await client.getMaterialesAsignadosServicios();
      expect(result).toEqual({ items: fake, total: 2 });
    });

    it('returns empty items + total=0 for empty dataset', async () => {
      nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(200, listEnv([], 0));
      const result = await client.getMaterialesAsignadosServicios();
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('propagates invalid_token on envelope errorCode=401', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/contratos-servicios-material')
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });
      await expect(client.getMaterialesAsignadosServicios()).rejects.toMatchObject({
        code: 'invalid_token',
      });
    });
  });

  describe('getMasterData', () => {
    it('calls the endpoint mapped for the catalog and returns { items, total }', async () => {
      const fake = [{ idreg: 1, nombre: 'España' }];
      const scope = nock(BASE_URL).get('/pgrl/v1/paises').reply(200, listEnv(fake, 1));
      const result = await client.getMasterData('paises');
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates invalid_token on envelope errorCode=401', async () => {
      nock(BASE_URL)
        .get('/pgrl/v1/paises')
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });
      await expect(client.getMasterData('paises')).rejects.toMatchObject({
        code: 'invalid_token',
      });
    });
  });

  describe('listClientes', () => {
    it('uses default request (no query) when no opts', async () => {
      const fake = [{ COD_CLI: '1' }];
      const scope = nock(BASE_URL).get('/pgrl/v2/clientes').reply(200, listEnv(fake, 100));
      const result = await client.listClientes();
      expect(result).toEqual({ items: fake, total: 100 });
      expect(scope.isDone()).toBe(true);
    });

    it('appends items and page query params when provided', async () => {
      const fake = [{ COD_CLI: '5' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v2/clientes')
        .query({ items: '20', page: '2' })
        .reply(200, listEnv(fake, 100));
      const result = await client.listClientes({ items: 20, page: 2 });
      expect(result).toEqual({ items: fake, total: 100 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getCliente', () => {
    it('returns the cliente object for idReg', async () => {
      const fake = { COD_CLI: '1000', NOMBRE_CLI: 'ACME' };
      nock(BASE_URL).get('/pgrl/v2/clientes/MV9fMTAwMA%3D%3D').reply(200, detailEnv(fake));
      const result = await client.getCliente('MV9fMTAwMA==');
      expect(result).toEqual(fake);
    });

    it('propagates not_found on envelope errorCode=404', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/clientes/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(client.getCliente('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  describe('listContactosClientes', () => {
    it('returns { items, total } from /pgrl/v2/contactos-clientes with pagination', async () => {
      const fake = [{ idReg: 'X' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v2/contactos-clientes')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 50));
      const result = await client.listContactosClientes({ items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 50 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('listOportunidadesNegocio', () => {
    it('returns { items, total } from /pcrm/v2/oportunidades-negocio', async () => {
      const fake = [{ ID_OPORTUNIDAD: 2.0 }];
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/oportunidades-negocio')
        .query({ items: '5', page: '1' })
        .reply(200, listEnv(fake, 25));
      const result = await client.listOportunidadesNegocio({ items: 5, page: 1 });
      expect(result).toEqual({ items: fake, total: 25 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getOportunidadNegocio', () => {
    it('returns the oportunidad object for idReg', async () => {
      const fake = { COD_CLI: '709', ID_OPORTUNIDAD: 2.0 };
      nock(BASE_URL).get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D').reply(200, detailEnv(fake));
      const result = await client.getOportunidadNegocio('MDJfXzI=');
      expect(result).toEqual(fake);
    });
  });

  describe('getOportunidadNegocioDatosAmpliados', () => {
    it('returns the datos-ampliados object for idReg', async () => {
      const fake = { FOO: 'BAR' };
      nock(BASE_URL)
        .get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D/datos-ampliados')
        .reply(200, detailEnv(fake));
      const result = await client.getOportunidadNegocioDatosAmpliados('MDJfXzI=');
      expect(result).toEqual(fake);
    });

    it('propagates not_found when oportunidad has no datos-ampliados', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D/datos-ampliados')
        .reply(200, { errorCode: '404', errorMessage: 'No data', data: null });
      await expect(client.getOportunidadNegocioDatosAmpliados('MDJfXzI=')).rejects.toMatchObject({
        code: 'not_found',
      });
    });
  });
});
```

- [ ] **Step 3.2: Verify tests fail**

```bash
npm test -- tests/clients/freematica-client.test.ts
```

Expected: FAIL — los tests nuevos no encuentran `listClientes`, `getCliente`, etc. Los existentes también fallarán porque devuelven `Promise<T[]>` no `{ items, total }`.

- [ ] **Step 3.3: Create new type files**

`src/types/clientes.ts`:

```ts
/**
 * Cliente devuelto por Freemática.
 *
 * El shape exacto tiene ~87 campos en mayúsculas (`COD_CLI`, `NOMBRE_CLI`,
 * `NIF`, `FECHA_ALTA`, etc.) más un campo `idReg` opaco (base64) que es la
 * clave para los endpoints singulares. Se mantiene como `Record<string, unknown>`
 * hasta que tengamos un caso de uso que justifique tipar campos concretos.
 */
export type Cliente = Record<string, unknown>;
```

`src/types/contactos-clientes.ts`:

```ts
/**
 * Contacto de cliente devuelto por Freemática.
 *
 * Mismo patrón que `Cliente`: campos en mayúsculas + `idReg` opaco. Sin
 * tipado fuerte por ahora.
 */
export type ContactoCliente = Record<string, unknown>;
```

`src/types/oportunidades-negocio.ts`:

```ts
/**
 * Oportunidad de negocio devuelta por Freemática (módulo pcrm).
 *
 * ~33 campos: `COD_CLI`, `COD_ESTADO_OPOR`, `COD_ETAPA_OPOR`, `NOMBRE`,
 * `VALOR`, `ID_OPORTUNIDAD`, etc. Más un `idReg` opaco para el endpoint
 * singular.
 */
export type OportunidadNegocio = Record<string, unknown>;
```

- [ ] **Step 3.4: Update `src/clients/freematica-client.ts`**

Reemplazar el archivo entero con:

```ts
import { BaseClient } from './base-client.js';
import { CATALOG_ENDPOINTS, type MasterDataCatalog } from '../schemas/master-data.js';
import type { FreematicaListData } from '../types/api-envelope.js';
import type { Cliente } from '../types/clientes.js';
import type { ContactoCliente } from '../types/contactos-clientes.js';
import type { MasterDataItem } from '../types/master-data.js';
import type { OportunidadNegocio } from '../types/oportunidades-negocio.js';
import type { VoContratosServMatAsignado } from '../types/contratos.js';

export interface ListResult<T> {
  items: T[];
  total: number;
}

export interface ListOptions {
  page?: number;
  items?: number;
}

/**
 * Typed client for the Freemática REST API.
 *
 * One method per exposed endpoint (or per family of endpoints). The wrapper
 * `{ errorCode, errorMessage, data }` is unwrapped by `BaseClient.request`,
 * so methods only see `data`.
 *
 * For list endpoints, `data` has shape `{ total, items, rowHeight }`. List
 * methods unwrap that to `{ items, total }` (string total → number; rowHeight
 * discarded).
 *
 * For detail endpoints, `data` is the entity directly.
 */
export class FreematicaClient extends BaseClient {
  // ---------------------------------------------------------------------------
  // Existing endpoints (v0.1.0, v0.3.0) — shape adjusted for the unwrap fix
  // ---------------------------------------------------------------------------

  /**
   * Obtener lista de material asignado a servicios.
   *
   * Endpoint: GET /pvss/v2/contratos-servicios-material
   */
  async getMaterialesAsignadosServicios(): Promise<ListResult<VoContratosServMatAsignado>> {
    const data = await this.get<FreematicaListData<VoContratosServMatAsignado>>(
      '/pvss/v2/contratos-servicios-material',
    );
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Obtener un catálogo de datos maestros.
   */
  async getMasterData(catalog: MasterDataCatalog): Promise<ListResult<MasterDataItem>> {
    const endpoint = CATALOG_ENDPOINTS[catalog];
    const data = await this.get<FreematicaListData<MasterDataItem>>(endpoint);
    return { items: data.items, total: Number(data.total) };
  }

  // ---------------------------------------------------------------------------
  // Clientes (v0.4.0)
  // ---------------------------------------------------------------------------

  /** Lista paginada de clientes. */
  async listClientes(opts: ListOptions = {}): Promise<ListResult<Cliente>> {
    return this.listResource<Cliente>('/pgrl/v2/clientes', opts);
  }

  /** Detalle de un cliente por `idReg` opaco. */
  async getCliente(idReg: string): Promise<Cliente> {
    return this.get<Cliente>(`/pgrl/v2/clientes/${encodeURIComponent(idReg)}`);
  }

  // ---------------------------------------------------------------------------
  // Contactos clientes (v0.4.0)
  // ---------------------------------------------------------------------------

  /** Lista paginada de contactos de clientes. */
  async listContactosClientes(opts: ListOptions = {}): Promise<ListResult<ContactoCliente>> {
    return this.listResource<ContactoCliente>('/pgrl/v2/contactos-clientes', opts);
  }

  // ---------------------------------------------------------------------------
  // Oportunidades de negocio (v0.4.0)
  // ---------------------------------------------------------------------------

  /** Lista paginada de oportunidades de negocio. */
  async listOportunidadesNegocio(opts: ListOptions = {}): Promise<ListResult<OportunidadNegocio>> {
    return this.listResource<OportunidadNegocio>('/pcrm/v2/oportunidades-negocio', opts);
  }

  /** Detalle de una oportunidad por `idReg` opaco. */
  async getOportunidadNegocio(idReg: string): Promise<OportunidadNegocio> {
    return this.get<OportunidadNegocio>(
      `/pcrm/v2/oportunidades-negocio/${encodeURIComponent(idReg)}`,
    );
  }

  /**
   * Datos ampliados de una oportunidad por `idReg` opaco.
   *
   * Puede devolver `not_found` si la oportunidad no tiene datos ampliados.
   * El caller debe manejar el `FreematicaError` con código `not_found`.
   */
  async getOportunidadNegocioDatosAmpliados(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pcrm/v2/oportunidades-negocio/${encodeURIComponent(idReg)}/datos-ampliados`,
    );
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async listResource<T>(path: string, opts: ListOptions): Promise<ListResult<T>> {
    const params = new URLSearchParams();
    if (opts.items !== undefined) params.set('items', String(opts.items));
    if (opts.page !== undefined) params.set('page', String(opts.page));
    const query = params.toString();
    const url = query ? `${path}?${query}` : path;
    const data = await this.get<FreematicaListData<T>>(url);
    return { items: data.items, total: Number(data.total) };
  }
}
```

- [ ] **Step 3.5: Verify tests pass**

```bash
npm test -- tests/clients/freematica-client.test.ts
npm run typecheck
```

Expected: PASS (16+ tests pasando en este archivo).

Note: the full suite may still fail because the tools (`contratos.ts`, `master-data.ts`) and their tests haven't been updated to reflect the new shape. We fix those in the next tasks.

- [ ] **Step 3.6: Commit**

```bash
git add src/clients/freematica-client.ts tests/clients/freematica-client.test.ts \
        src/types/clientes.ts src/types/contactos-clientes.ts src/types/oportunidades-negocio.ts
git commit -m "feat: add list/get methods for clientes, contactos-clientes, oportunidades-negocio"
```

---

## Task 4: Ajustar `helpers.ts` — añadir `okList` (TDD)

**Files:**

- Modify: `src/tools/helpers.ts`
- Modify: `tests/tools/helpers.test.ts`

- [ ] **Step 4.1: Añadir tests al final de `tests/tools/helpers.test.ts`**

Localizar el final del archivo (después del describe de `error`). Añadir un `describe('okList')`:

```ts
describe('okList', () => {
  it('wraps list payload with items, count, total, page, items_per_page', () => {
    const result = okList({
      items: [{ a: 1 }, { a: 2 }],
      total: 100,
      page: 2,
      itemsPerPage: 10,
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: [{ a: 1 }, { a: 2 }],
      count: 2,
      total: 100,
      page: 2,
      items_per_page: 10,
    });
  });

  it('omits page/items_per_page when not provided', () => {
    const result = okList({ items: [], total: 0 });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: [],
      count: 0,
      total: 0,
      page: undefined,
      items_per_page: undefined,
    });
  });
});
```

Y añadir `okList` al import statement al inicio del archivo:

```ts
import { ok, error, okList } from '../../src/tools/helpers.js';
```

- [ ] **Step 4.2: Verify it fails**

```bash
npm test -- tests/tools/helpers.test.ts
```

Expected: FAIL (`okList` no existe).

- [ ] **Step 4.3: Añadir `okList` a `src/tools/helpers.ts`**

Añadir al final del archivo (después de la función `error`):

```ts
export function okList(args: {
  items: unknown[];
  total: number;
  page?: number;
  itemsPerPage?: number;
}): ToolResult {
  return ok({
    items: args.items,
    count: args.items.length,
    total: args.total,
    page: args.page,
    items_per_page: args.itemsPerPage,
  });
}
```

- [ ] **Step 4.4: Verify tests pass**

```bash
npm test -- tests/tools/helpers.test.ts
npm run typecheck
```

Expected: PASS (6 tests, los 4 anteriores + 2 nuevos).

- [ ] **Step 4.5: Commit**

```bash
git add src/tools/helpers.ts tests/tools/helpers.test.ts
git commit -m "feat: add okList helper for paginated list responses"
```

---

## Task 5: Ajustar tools existentes a nuevo shape (`contratos`, `master-data`)

**Files:**

- Modify: `src/tools/contratos.ts`
- Modify: `src/tools/master-data.ts`
- Modify: `tests/tools/contratos.test.ts`
- Modify: `tests/tools/master-data.test.ts`

- [ ] **Step 5.1: Actualizar `tests/tools/contratos.test.ts`**

El handler "handler returns ok() with items + count on success" actualmente espera `{ items: fakeData, count: 2 }`. Tras el cambio del cliente, el método retorna `{ items, total }`. Y la tool ahora debe usar `okList`. El test debe esperar el nuevo shape.

Localiza el bloque de mock en el test "handler returns ok() with items + count on success" y reemplaza:

```ts
it('handler returns ok() with items + count on success', async () => {
  const fakeData = [{ idreg: 1 }, { idreg: 2 }];
  nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(200, fakeData);

  const { server } = buildServer();
  const tools = (
    server as unknown as {
      _registeredTools: Record<string, { callback: (args: unknown) => Promise<unknown> }>;
    }
  )._registeredTools;

  const result = (await tools[TOOL_NAME].callback({})) as {
    content: { type: string; text: string }[];
    isError?: boolean;
  };

  expect(result.isError).toBeUndefined();
  const parsed = JSON.parse(result.content[0].text);
  expect(parsed).toEqual({ items: fakeData, count: 2 });
});
```

Por:

```ts
it('handler returns okList() with items, count, total on success', async () => {
  const fakeData = [{ idreg: 1 }, { idreg: 2 }];
  nock(BASE_URL)
    .get('/pvss/v2/contratos-servicios-material')
    .reply(200, {
      errorCode: '200',
      errorMessage: '',
      data: { total: '2', items: fakeData, rowHeight: -1 },
    });

  const { server } = buildServer();
  const tools = (
    server as unknown as {
      _registeredTools: Record<
        string,
        {
          handler?: (args: unknown) => Promise<unknown>;
          callback?: (args: unknown) => Promise<unknown>;
        }
      >;
    }
  )._registeredTools;
  const handler = tools[TOOL_NAME].handler ?? tools[TOOL_NAME].callback;
  if (!handler) throw new Error('handler not registered');

  const result = (await handler({})) as {
    content: { type: string; text: string }[];
    isError?: boolean;
  };

  expect(result.isError).toBeUndefined();
  const parsed = JSON.parse(result.content[0].text);
  expect(parsed).toEqual({
    items: fakeData,
    count: 2,
    total: 2,
    page: undefined,
    items_per_page: undefined,
  });
});
```

Y el test "handler returns error() on API failure" del 401 debe usar envelope:

```ts
it('handler returns error() on API failure', async () => {
  nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(200, {
    errorCode: '401',
    errorMessage: 'Unauthorized',
    data: null,
  });

  const { server } = buildServer();
  const tools = (
    server as unknown as {
      _registeredTools: Record<
        string,
        {
          handler?: (args: unknown) => Promise<unknown>;
          callback?: (args: unknown) => Promise<unknown>;
        }
      >;
    }
  )._registeredTools;
  const handler = tools[TOOL_NAME].handler ?? tools[TOOL_NAME].callback;
  if (!handler) throw new Error('handler not registered');

  const result = (await handler({})) as {
    content: { type: string; text: string }[];
    isError?: boolean;
  };

  expect(result.isError).toBe(true);
  const parsed = JSON.parse(result.content[0].text);
  expect(parsed.error).toBe('invalid_token');
});
```

- [ ] **Step 5.2: Update `src/tools/contratos.ts`**

Localizar el handler del `server.tool(...)`. Está actualmente así:

```ts
    async () => {
      try {
        const items = await client.getMaterialesAsignadosServicios();
        return ok({ items, count: items.length });
      } catch (err) {
        if (err instanceof FreematicaError) return error(err);
        return error(err instanceof Error ? err : new Error(String(err)));
      }
    },
```

Cambiarlo a:

```ts
    async () => {
      try {
        const { items, total } = await client.getMaterialesAsignadosServicios();
        return okList({ items, total });
      } catch (err) {
        if (err instanceof FreematicaError) return error(err);
        return error(err instanceof Error ? err : new Error(String(err)));
      }
    },
```

Y añadir `okList` al import:

```ts
import { error, ok, okList } from './helpers.js';
```

(Si `ok` ya no se usa en este archivo, dejarlo importado igualmente; no causa lint error porque eslint sólo flags unused vars en `argsIgnorePattern`. Si quieres puedes eliminarlo, pero no es necesario.)

- [ ] **Step 5.3: Verify contratos tests pass**

```bash
npm test -- tests/tools/contratos.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5.4: Apply the same to `master-data`**

`tests/tools/master-data.test.ts`: localizar los tests con mocks `.reply(200, fakeData)` y cambiarlos a:

```ts
.reply(200, { errorCode: '200', errorMessage: '', data: { total: '2', items: fakeData, rowHeight: -1 } });
```

El test que espera `{ items: fakeData, count: 2 }` (en el assertion del handler) debe cambiar a:

```ts
expect(parsed).toEqual({
  items: fakeData,
  count: 2,
  total: 2,
  page: undefined,
  items_per_page: undefined,
});
```

Si en el test el catalog es `'paises'`, el handler también puede recibir `{ catalog: 'paises', items, count, total }`. Mira si la implementación actual de `master-data.ts` mete `catalog` en el output. Si lo hace, hay que decidir si mantenerlo. Recomendación: **mantener `catalog` en el output** (echo del input), así que el test debe esperarlo:

```ts
expect(parsed).toEqual({
  catalog: 'paises',
  items: fakeData,
  count: 2,
  total: 2,
});
```

Para mantener compatibilidad con `okList`, no usarlo aquí; usar `ok({ catalog, items, count: items.length, total })` directamente. Es un caso especial.

`src/tools/master-data.ts`: actualizar el handler:

```ts
    async ({ catalog }) => {
      try {
        const { items, total } = await client.getMasterData(catalog);
        return ok({ catalog, items, count: items.length, total });
      } catch (err) {
        if (err instanceof FreematicaError) return error(err);
        return error(err instanceof Error ? err : new Error(String(err)));
      }
    },
```

(No usamos `okList` porque queremos preservar el campo `catalog` en el output como echo del input.)

- [ ] **Step 5.5: Verify master-data tests pass**

```bash
npm test -- tests/tools/master-data.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5.6: Commit**

```bash
git add src/tools/contratos.ts src/tools/master-data.ts \
        tests/tools/contratos.test.ts tests/tools/master-data.test.ts
git commit -m "refactor: adjust contratos and master-data tools to new envelope shape"
```

---

## Task 6: PaginationSchema (TDD)

**Files:**

- Create: `src/schemas/pagination.ts`
- Create: `tests/schemas/pagination.test.ts`

- [ ] **Step 6.1: Escribir tests que fallan**

`tests/schemas/pagination.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { PaginationSchema } from '../../src/schemas/pagination.js';

const Combined = z.object(PaginationSchema);

describe('PaginationSchema', () => {
  it('applies defaults when nothing is provided', () => {
    const result = Combined.parse({});
    expect(result.page).toBe(1);
    expect(result.items).toBe(20);
  });

  it('accepts page=1 and items=50 (boundary)', () => {
    expect(() => Combined.parse({ page: 1, items: 50 })).not.toThrow();
  });

  it('rejects page=0 (API treats as "all", we block it)', () => {
    expect(() => Combined.parse({ page: 0, items: 10 })).toThrow();
  });

  it('rejects page=-1', () => {
    expect(() => Combined.parse({ page: -1, items: 10 })).toThrow();
  });

  it('rejects non-integer page', () => {
    expect(() => Combined.parse({ page: 1.5, items: 10 })).toThrow();
  });

  it('rejects items=0', () => {
    expect(() => Combined.parse({ page: 1, items: 0 })).toThrow();
  });

  it('rejects items=51 (max 50)', () => {
    expect(() => Combined.parse({ page: 1, items: 51 })).toThrow();
  });

  it('rejects negative items', () => {
    expect(() => Combined.parse({ page: 1, items: -5 })).toThrow();
  });
});
```

- [ ] **Step 6.2: Verify fail**

```bash
npm test -- tests/schemas/pagination.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 6.3: Crear `src/schemas/pagination.ts`**

```ts
import { z } from 'zod';

/**
 * Schema parts to paginate Freemática listing tools.
 *
 * IMPORTANT: We block `page=0` because the Freemática API treats it as
 * "return the FULL dataset" (we measured 2.5 MB responses on the clientes
 * endpoint). Pages are 1-indexed.
 *
 * `items` is capped at 50 to keep LLM context manageable.
 */
export const PaginationSchema = {
  page: z
    .number()
    .int()
    .min(1)
    .max(999)
    .default(1)
    .describe(
      'Página a recuperar (1-indexed). Default: 1. AVISO: el API trata page=0 como "devuelve TODO el dataset"; este parámetro lo bloquea al mínimo 1.',
    ),
  items: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe('Items por página. Default 20, máximo 50.'),
};
```

- [ ] **Step 6.4: Verify pass**

```bash
npm test -- tests/schemas/pagination.test.ts
npm run typecheck
```

Expected: 8 tests PASS.

- [ ] **Step 6.5: Commit**

```bash
git add src/schemas/pagination.ts tests/schemas/pagination.test.ts
git commit -m "feat: add PaginationSchema (1-indexed, items capped at 50)"
```

---

## Task 7: Tool `clientes` (list + get) — TDD

**Files:**

- Create: `src/tools/clientes.ts`
- Create: `tests/tools/clientes.test.ts`

- [ ] **Step 7.1: Escribir tests que fallan**

`tests/tools/clientes.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerClientesTools } from '../../src/tools/clientes.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_clientes';
const GET_TOOL = 'freematica_get_cliente';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerClientesTools(server, client);
  return server;
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

function listEnv<T>(items: T[], total: number) {
  return {
    errorCode: '200',
    errorMessage: '',
    data: { total: String(total), items, rowHeight: -1 },
  };
}

function detailEnv<T>(item: T) {
  return { errorCode: '200', errorMessage: '', data: item };
}

describe('registerClientesTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers both tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
    expect(tools).toHaveProperty(GET_TOOL);
  });

  it('list_clientes returns items, count, total, page, items_per_page', async () => {
    const fake = [{ COD_CLI: '1' }, { COD_CLI: '2' }];
    nock(BASE_URL)
      .get('/pgrl/v2/clientes')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 2007));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: fake,
      count: 2,
      total: 2007,
      page: 1,
      items_per_page: 20,
    });
  });

  it('get_cliente returns the cliente object for a valid idReg', async () => {
    const fake = { COD_CLI: '1000', NOMBRE_CLI: 'ACME' };
    nock(BASE_URL).get('/pgrl/v2/clientes/MV9fMTAwMA%3D%3D').reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'MV9fMTAwMA==' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('get_cliente returns error not_found when id does not exist', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/clientes/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});
```

- [ ] **Step 7.2: Verify fail**

```bash
npm test -- tests/tools/clientes.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 7.3: Crear `src/tools/clientes.ts`**

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type ToolResult } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_clientes';
const GET_TOOL_NAME = 'freematica_get_cliente';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de clientes de Freemática.',
  '',
  'Cada item tiene ~87 campos (COD_CLI, NOMBRE_CLI, NIF, FECHA_ALTA, etc.) más un campo `idReg` opaco (base64) que se usa para el endpoint singular `freematica_get_cliente`.',
  '',
  'Paginación 1-indexed: la primera página es page=1. Devuelve también `total` con el total de clientes en el dataset.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle completo de un cliente.',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en los items de freematica_list_clientes. NO usar COD_CLI ni otro código natural — el API devuelve not_found.',
].join('\n');

function errorFor(err: unknown): ToolResult {
  if (err instanceof FreematicaError) return error(err);
  return error(err instanceof Error ? err : new Error(String(err)));
}

export function registerClientesTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }) => {
      try {
        const result = await client.listClientes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items });
      } catch (err) {
        return errorFor(err);
      }
    },
  );

  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco del cliente (campo "idReg" en los items de freematica_list_clientes).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }) => {
      try {
        const cliente = await client.getCliente(id);
        return ok(cliente);
      } catch (err) {
        return errorFor(err);
      }
    },
  );
}
```

> **Note:** El SDK 1.27.x puede requerir cast a `CallToolResult` (ver `src/tools/contratos.ts` v0.1.0). Si TypeScript falla, aplicar el mismo cast (`as CallToolResult`) que en ese archivo. La importación: `import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';`.

- [ ] **Step 7.4: Verify tests pass**

```bash
npm test -- tests/tools/clientes.test.ts
npm test          # full suite
npm run typecheck
```

Expected: 4 tests pasan en `clientes.test.ts`.

- [ ] **Step 7.5: Commit**

```bash
git add src/tools/clientes.ts tests/tools/clientes.test.ts
git commit -m "feat: add freematica_list_clientes and freematica_get_cliente tools"
```

---

## Task 8: Tool `contactos-clientes` (list) — TDD

**Files:**

- Create: `src/tools/contactos-clientes.ts`
- Create: `tests/tools/contactos-clientes.test.ts`

- [ ] **Step 8.1: Escribir tests que fallan**

`tests/tools/contactos-clientes.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerContactosClientesTools } from '../../src/tools/contactos-clientes.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_contactos_clientes';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerContactosClientesTools(server, client);
  return server;
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

function listEnv<T>(items: T[], total: number) {
  return {
    errorCode: '200',
    errorMessage: '',
    data: { total: String(total), items, rowHeight: -1 },
  };
}

describe('registerContactosClientesTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers list tool', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
  });

  it('list_contactos_clientes returns paginated list', async () => {
    const fake = [{ idReg: 'X', NOMBRE: 'Juan' }];
    nock(BASE_URL)
      .get('/pgrl/v2/contactos-clientes')
      .query({ items: '10', page: '1' })
      .reply(200, listEnv(fake, 500));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({ page: 1, items: 10 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: fake,
      count: 1,
      total: 500,
      page: 1,
      items_per_page: 10,
    });
  });

  it('returns error on API failure', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/contactos-clientes')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });
});
```

- [ ] **Step 8.2: Verify fail**

```bash
npm test -- tests/tools/contactos-clientes.test.ts
```

Expected: FAIL.

- [ ] **Step 8.3: Crear `src/tools/contactos-clientes.ts`**

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, okList, type ToolResult } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_contactos_clientes';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de contactos de clientes (personas asociadas a clientes corporativos).',
  '',
  'Cada item incluye un campo `idReg` opaco (base64). En esta versión no exponemos un endpoint singular para contactos; si necesitas el detalle, contacta al mantenedor del MCP.',
  '',
  'Paginación 1-indexed.',
].join('\n');

function errorFor(err: unknown): ToolResult {
  if (err instanceof FreematicaError) return error(err);
  return error(err instanceof Error ? err : new Error(String(err)));
}

export function registerContactosClientesTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }) => {
      try {
        const result = await client.listContactosClientes({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items });
      } catch (err) {
        return errorFor(err);
      }
    },
  );
}
```

- [ ] **Step 8.4: Verify tests pass**

```bash
npm test -- tests/tools/contactos-clientes.test.ts
npm run typecheck
```

Expected: 3 tests PASS.

- [ ] **Step 8.5: Commit**

```bash
git add src/tools/contactos-clientes.ts tests/tools/contactos-clientes.test.ts
git commit -m "feat: add freematica_list_contactos_clientes tool"
```

---

## Task 9: Tools `oportunidades-negocio` (list + get + datos-ampliados) — TDD

**Files:**

- Create: `src/tools/oportunidades-negocio.ts`
- Create: `tests/tools/oportunidades-negocio.test.ts`

- [ ] **Step 9.1: Escribir tests que fallan**

`tests/tools/oportunidades-negocio.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerOportunidadesNegocioTools } from '../../src/tools/oportunidades-negocio.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_oportunidades_negocio';
const GET_TOOL = 'freematica_get_oportunidad_negocio';
const AMP_TOOL = 'freematica_get_oportunidad_negocio_datos_ampliados';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerOportunidadesNegocioTools(server, client);
  return server;
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

function listEnv<T>(items: T[], total: number) {
  return {
    errorCode: '200',
    errorMessage: '',
    data: { total: String(total), items, rowHeight: -1 },
  };
}

function detailEnv<T>(item: T) {
  return { errorCode: '200', errorMessage: '', data: item };
}

describe('registerOportunidadesNegocioTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers all three tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
    expect(tools).toHaveProperty(GET_TOOL);
    expect(tools).toHaveProperty(AMP_TOOL);
  });

  it('list returns paginated oportunidades', async () => {
    const fake = [{ ID_OPORTUNIDAD: 2.0, NOMBRE: 'VIVENIO' }];
    nock(BASE_URL)
      .get('/pcrm/v2/oportunidades-negocio')
      .query({ items: '5', page: '1' })
      .reply(200, listEnv(fake, 25));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({ page: 1, items: 5 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: fake,
      count: 1,
      total: 25,
      page: 1,
      items_per_page: 5,
    });
  });

  it('get returns the oportunidad detail', async () => {
    const fake = { ID_OPORTUNIDAD: 2.0, NOMBRE: 'VIVENIO', VALOR: 1000 };
    nock(BASE_URL).get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D').reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'MDJfXzI=' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('datos-ampliados returns extended data when available', async () => {
    const fake = { EXTRA: 'INFO', OTRO_CAMPO: 42 };
    nock(BASE_URL)
      .get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D/datos-ampliados')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, AMP_TOOL);
    const result = (await handler({ id: 'MDJfXzI=' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('datos-ampliados returns not_found when oportunidad has no extended data', async () => {
    nock(BASE_URL)
      .get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D/datos-ampliados')
      .reply(200, { errorCode: '404', errorMessage: 'No data', data: null });

    const server = buildServer();
    const handler = getHandler(server, AMP_TOOL);
    const result = (await handler({ id: 'MDJfXzI=' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});
```

- [ ] **Step 9.2: Verify fail**

```bash
npm test -- tests/tools/oportunidades-negocio.test.ts
```

Expected: FAIL.

- [ ] **Step 9.3: Crear `src/tools/oportunidades-negocio.ts`**

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import { error, ok, okList, type ToolResult } from './helpers.js';

const LIST_TOOL_NAME = 'freematica_list_oportunidades_negocio';
const GET_TOOL_NAME = 'freematica_get_oportunidad_negocio';
const AMP_TOOL_NAME = 'freematica_get_oportunidad_negocio_datos_ampliados';

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de oportunidades de negocio (CRM).',
  '',
  'Cada item tiene ~33 campos: COD_CLI (id del cliente), COD_ESTADO_OPOR, COD_ETAPA_OPOR, NOMBRE, VALOR, ID_OPORTUNIDAD, FECHA, FECHA_CREACION, USU_ASIGNADO, etc. Más `idReg` opaco para el endpoint singular.',
  '',
  'Paginación 1-indexed.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle de una oportunidad de negocio.',
  '',
  'El parámetro `id` DEBE ser el `idReg` opaco que aparece en los items de freematica_list_oportunidades_negocio.',
].join('\n');

const AMP_DESCRIPTION = [
  'Devuelve los datos ampliados de una oportunidad de negocio.',
  '',
  'NOTA: Este endpoint puede devolver `not_found` si la oportunidad no tiene datos ampliados configurados. Es un caso esperado, no un error de software — explicarle al usuario que esa oportunidad no tiene info adicional.',
  '',
  'El parámetro `id` DEBE ser el `idReg` opaco (mismo que en get_oportunidad_negocio).',
].join('\n');

function errorFor(err: unknown): ToolResult {
  if (err instanceof FreematicaError) return error(err);
  return error(err instanceof Error ? err : new Error(String(err)));
}

const IdSchema = {
  id: z
    .string()
    .min(1)
    .describe(
      'idReg opaco de la oportunidad (campo "idReg" en los items de freematica_list_oportunidades_negocio).',
    ),
};

export function registerOportunidadesNegocioTools(
  server: McpServer,
  client: FreematicaClient,
): void {
  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    PaginationSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }) => {
      try {
        const result = await client.listOportunidadesNegocio({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items });
      } catch (err) {
        return errorFor(err);
      }
    },
  );

  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    IdSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }) => {
      try {
        const opo = await client.getOportunidadNegocio(id);
        return ok(opo);
      } catch (err) {
        return errorFor(err);
      }
    },
  );

  server.tool(
    AMP_TOOL_NAME,
    AMP_DESCRIPTION,
    IdSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }) => {
      try {
        const datos = await client.getOportunidadNegocioDatosAmpliados(id);
        return ok(datos);
      } catch (err) {
        return errorFor(err);
      }
    },
  );
}
```

- [ ] **Step 9.4: Verify tests pass**

```bash
npm test -- tests/tools/oportunidades-negocio.test.ts
npm run typecheck
```

Expected: 5 tests PASS.

- [ ] **Step 9.5: Commit**

```bash
git add src/tools/oportunidades-negocio.ts tests/tools/oportunidades-negocio.test.ts
git commit -m "feat: add oportunidades-negocio tools (list + get + datos-ampliados)"
```

---

## Task 10: Wire factory + refuerzo test del server

**Files:**

- Modify: `src/server.ts`
- Modify: `tests/server.test.ts`

- [ ] **Step 10.1: Actualizar `src/server.ts`**

Reemplazar el contenido entero por:

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from './clients/freematica-client.js';
import { FREEMATICA_MCP_INSTRUCTIONS } from './server-instructions.js';
import { registerClientesTools } from './tools/clientes.js';
import { registerContactosClientesTools } from './tools/contactos-clientes.js';
import { registerContratosTools } from './tools/contratos.js';
import { registerMasterDataTools } from './tools/master-data.js';
import { registerOportunidadesNegocioTools } from './tools/oportunidades-negocio.js';

export interface CreateFreematicaServerOptions {
  client: FreematicaClient;
}

/**
 * Factory that builds a fully wired MCP server.
 *
 * Add a new tool group by importing its register* function and calling it
 * below — no other change is needed for the HTTP transport to pick it up.
 */
export function createFreematicaServer(opts: CreateFreematicaServerOptions): McpServer {
  const server = new McpServer(
    { name: 'freematica-mcp', version: '0.4.0' },
    { instructions: FREEMATICA_MCP_INSTRUCTIONS },
  );

  registerContratosTools(server, opts.client);
  registerMasterDataTools(server, opts.client);
  registerClientesTools(server, opts.client);
  registerContactosClientesTools(server, opts.client);
  registerOportunidadesNegocioTools(server, opts.client);

  return server;
}
```

- [ ] **Step 10.2: Reescribir `tests/server.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createFreematicaServer } from '../src/server.js';
import { FreematicaClient } from '../src/clients/freematica-client.js';

const TEST_CLIENT = new FreematicaClient({
  baseUrl: 'https://x.example.com',
  authHeaders: {
    'x-auth-token': 't',
    'x-auth-company': 'c',
    'x-auth-organization': 'o',
    'x-auth-app': 'a',
    'x-auth-session': 's',
  },
});

function registeredToolNames(server: ReturnType<typeof createFreematicaServer>): string[] {
  const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
    ._registeredTools;
  return Object.keys(tools).sort();
}

describe('createFreematicaServer', () => {
  it('registers all 8 expected tools', () => {
    const server = createFreematicaServer({ client: TEST_CLIENT });
    const names = registeredToolNames(server);
    expect(names).toEqual([
      'freematica_get_cliente',
      'freematica_get_master_data',
      'freematica_get_oportunidad_negocio',
      'freematica_get_oportunidad_negocio_datos_ampliados',
      'freematica_list_clientes',
      'freematica_list_contactos_clientes',
      'freematica_list_materiales_asignados_servicios',
      'freematica_list_oportunidades_negocio',
    ]);
  });
});
```

- [ ] **Step 10.3: Verify**

```bash
npm test -- tests/server.test.ts
npm test          # full suite
npm run typecheck
```

Expected: All pass. Full suite ≥ ~65 tests.

- [ ] **Step 10.4: Commit**

```bash
git add src/server.ts tests/server.test.ts
git commit -m "feat: wire 5 new commercial tools into createFreematicaServer (v0.4.0)"
```

---

## Task 11: Server instructions + version bump literals

**Files:**

- Modify: `src/server-instructions.ts`
- Modify: `src/transports/http.ts`
- Modify: `src/index.ts`
- Modify: `package.json`

- [ ] **Step 11.1: Reescribir `src/server-instructions.ts`**

```ts
export const FREEMATICA_MCP_INSTRUCTIONS = `
# Freemática MCP

Este servidor expone operaciones del API REST de Freemática como tools MCP.

## Tools disponibles (8)

### Materiales (1)

- **freematica_list_materiales_asignados_servicios** — Lista de material
  asignado a servicios (sin parámetros). Devuelve { items, count, total }.

### Datos maestros (1)

- **freematica_get_master_data** — Devuelve un catálogo de datos maestros.
  Parámetro \`catalog\` (enum): tipos-contrato, tipo-instalacion, clases-servicios,
  tipos-casos, subtipos-casos, tipos-oportunidad-negocio, tipos-impuestos,
  tipos-marcajes, naturalezas-abono, paises, nacionalidades, provincias,
  poblaciones, empresas, delegaciones, lineas-negocio, cargos-clientes,
  familias, subfamilias. Devuelve { catalog, items, count, total }.

### Clientes (2)

- **freematica_list_clientes(page=1, items=20)** — Lista paginada de clientes.
- **freematica_get_cliente(id)** — Detalle de un cliente. \`id\` = \`idReg\` opaco.

### Contactos clientes (1)

- **freematica_list_contactos_clientes(page=1, items=20)** — Lista paginada.

### Oportunidades de negocio (3)

- **freematica_list_oportunidades_negocio(page=1, items=20)** — Lista paginada.
- **freematica_get_oportunidad_negocio(id)** — Detalle. \`id\` = \`idReg\` opaco.
- **freematica_get_oportunidad_negocio_datos_ampliados(id)** — Datos ampliados.
  Puede devolver not_found si la oportunidad no tiene datos extra.

## Paginación

Todas las tools \`freematica_list_*\` aceptan dos parámetros opcionales:

- **page** (int, ≥1, default 1): página a recuperar, 1-indexed.
- **items** (int, 1..50, default 20): items por página.

La respuesta siempre incluye \`total\` = total de elementos en el dataset,
para que puedas paginar (\`page = total / items + 1\`).

AVISO: NO uses \`page=0\` (este parámetro lo bloquea al mínimo 1). El API real
trata \`page=0\` como "devuelve TODO el dataset" — puede ser muchos MB.

## IDs opacos en endpoints de detalle

Las tools \`freematica_get_*\` requieren un \`id\` que es el campo \`idReg\` de los
items en los listados — un string opaco base64 como \`MV9fMTAwMA==\` o \`MDJfXzI=\`.

NO uses códigos naturales como \`COD_CLI\` o \`ID_OPORTUNIDAD\` — el API devuelve
not_found. Patrón típico:

1. Llamar a \`freematica_list_clientes\` y localizar el cliente que buscas.
2. Tomar su campo \`idReg\`.
3. Pasarlo como \`id\` a \`freematica_get_cliente\`.

## Resolución de códigos a nombres

Muchas tools devuelven códigos como \`COD_TIPO_OPOR: "01"\` o \`COD_GRUPO_CLI: 1.0\`.
Para mostrar nombres legibles, usa \`freematica_get_master_data\` con el catálogo
correspondiente y haz el lookup.

## Manejo de errores

Las llamadas pueden fallar con uno de estos códigos:

| Código | Significado | Acción del LLM |
|---|---|---|
| invalid_token | Credenciales caducadas o inválidas | Avisar al usuario; renovar en Nubiia. |
| forbidden | Permisos insuficientes | Explicar; no reintentar. |
| not_found | Recurso o endpoint inexistente | Comprobar el id; no reintentar (excepto datos-ampliados, que puede ser un caso normal). |
| rate_limit_exceeded | Demasiadas peticiones | Esperar y reintentar una vez. |
| server_error | Error 5xx del API | Reintentar una vez con backoff. |
| network_error | Problemas de red | Reintentar una vez tras 2s. |
| unexpected_error | Error no clasificado | Loggear y reintentar una vez. |
`.trim();
```

- [ ] **Step 11.2: Bump version literals**

Buscar todas las apariciones de `0.3.1` en `src/`:

```bash
grep -rn "0\.3\.1" src/
```

Expected: 3 archivos (server.ts ya cambiado en Task 10, http.ts, index.ts). Si el server.ts aún muestra '0.3.1' es un error en Task 10 — corregir.

Cambiar en `src/transports/http.ts` el literal:

```ts
res.json({ status: 'ok', version: '0.3.1', sessions: sessions.size });
```

a:

```ts
res.json({ status: 'ok', version: '0.4.0', sessions: sessions.size });
```

Cambiar en `src/index.ts` el literal:

```ts
`[freematica-mcp] Starting stdio transport v0.3.1 | base=${auth.FREEMATICA_BASE_URL}`,
```

a:

```ts
`[freematica-mcp] Starting stdio transport v0.4.0 | base=${auth.FREEMATICA_BASE_URL}`,
```

Cambiar en `package.json`:

```json
"version": "0.3.1",
```

a:

```json
"version": "0.4.0",
```

Y `npm install` para actualizar el lockfile:

```bash
npm install
```

Verificar:

```bash
grep -rn "0\.3\.1" src/
```

Expected: no matches.

- [ ] **Step 11.3: Validate**

```bash
npm run lint && npm run typecheck && npm run build && npm test
```

Expected: PASS los 4.

- [ ] **Step 11.4: Commit**

```bash
git add src/server-instructions.ts src/transports/http.ts src/index.ts \
        package.json package-lock.json
git commit -m "chore: extend server instructions, bump version to 0.4.0"
```

---

## Task 12: README + CHANGELOG

**Files:**

- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 12.1: Actualizar la tabla "Tools expuestas" en README**

Localizar la tabla existente. Reemplazarla por:

```md
| Tool                                                 | Endpoint Freemática                                          | Descripción                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `freematica_list_materiales_asignados_servicios`     | `GET /pvss/v2/contratos-servicios-material`                  | Lista de material asignado a servicios                                                 |
| `freematica_get_master_data`                         | (19 endpoints según `catalog`)                               | Devuelve un catálogo de datos maestros (tipos, geográficos, organizativos, inventario) |
| `freematica_list_clientes`                           | `GET /pgrl/v2/clientes`                                      | Lista paginada de clientes                                                             |
| `freematica_get_cliente`                             | `GET /pgrl/v2/clientes/{idReg}`                              | Detalle de un cliente                                                                  |
| `freematica_list_contactos_clientes`                 | `GET /pgrl/v2/contactos-clientes`                            | Lista paginada de contactos                                                            |
| `freematica_list_oportunidades_negocio`              | `GET /pcrm/v2/oportunidades-negocio`                         | Lista paginada de oportunidades                                                        |
| `freematica_get_oportunidad_negocio`                 | `GET /pcrm/v2/oportunidades-negocio/{idReg}`                 | Detalle de oportunidad                                                                 |
| `freematica_get_oportunidad_negocio_datos_ampliados` | `GET /pcrm/v2/oportunidades-negocio/{idReg}/datos-ampliados` | Datos ampliados (puede 404)                                                            |
```

- [ ] **Step 12.2: Añadir sección "Paginación" después de "Datos maestros disponibles"**

Insertar antes de `## Configuración`:

```md
## Paginación

Todas las tools `freematica_list_*` aceptan dos parámetros opcionales:

- **`page`** (int, ≥1, default 1): página a recuperar, **1-indexed**.
- **`items`** (int, 1..50, default 20): items por página.

La respuesta incluye siempre `total` (total de elementos en el dataset) para que el LLM pueda iterar páginas.

> ⚠️ El parámetro está bloqueado en `page ≥ 1` porque el API real de Freemática trata `page=0` como "devuelve TODO el dataset" (varios MB en endpoints grandes como `clientes`). Verificado empíricamente.

## IDs opacos en endpoints de detalle

Las tools `freematica_get_*` requieren un `id` que **NO** es el código natural (`COD_CLI`, `ID_OPORTUNIDAD`) sino el campo **`idReg`** que aparece en los items del listado correspondiente. Es un string opaco base64 como `MV9fMTAwMA==`.

Si pasas un código natural, el API responde `not_found`.

Patrón típico de uso desde el LLM:

1. `freematica_list_clientes(page=1, items=20)` → encontrar el cliente que interesa.
2. Tomar el campo `idReg` de ese item.
3. `freematica_get_cliente(id="<idReg>")` → detalle completo.
```

- [ ] **Step 12.3: Actualizar literal de versión en "Verificación"**

Buscar:

```
"status": "ok", "version": "0.3.1"
```

Reemplazar por:

```
"status": "ok", "version": "0.4.0"
```

- [ ] **Step 12.4: Añadir referencias v0.4.0 en "Especificaciones y diseño"**

Localizar:

```md
- v0.3.0 spec: `docs/superpowers/specs/2026-05-19-master-data-tool-design.md` (master data tool)
- v0.3.0 plan: `docs/superpowers/plans/2026-05-19-master-data-tool.md`
```

Añadir debajo:

```md
- v0.4.0 spec: `docs/superpowers/specs/2026-05-20-commercial-tools-design.md` (commercial tools + envelope unwrap fix)
- v0.4.0 plan: `docs/superpowers/plans/2026-05-20-commercial-tools.md`
```

- [ ] **Step 12.5: Añadir entrada al CHANGELOG.md**

Insertar como primera entrada (antes del `[0.3.1]`):

```md
## [0.4.0] — 2026-05-20

### Fixed

- **Envelope unwrap**: el API REST de Freemática envuelve todas las respuestas en `{ errorCode, errorMessage, data }`. El `BaseClient` desempaqueta ahora `data` automáticamente y mapea `errorCode != "200"` a `FreematicaError` (con códigos como `invalid_token`, `not_found`, `server_error`, etc.). Las tools v0.3.x estaban devolviendo el wrapper completo en `items` — bug silencioso al no haber sido consumidas en producción.

### Added

- 6 tools comerciales nuevas:
  - `freematica_list_clientes` (paginada)
  - `freematica_get_cliente`
  - `freematica_list_contactos_clientes` (paginada)
  - `freematica_list_oportunidades_negocio` (paginada)
  - `freematica_get_oportunidad_negocio`
  - `freematica_get_oportunidad_negocio_datos_ampliados`
- `PaginationSchema` reutilizable: `page` (1-indexed, default 1), `items` (1..50, default 20). Bloquea `page=0` (peligroso en el API real).
- Helper `okList()` para serializar respuestas de listado con `items, count, total, page, items_per_page`.
- `FreematicaListData<T>` y `FreematicaEnvelope<T>` types.

### Changed (breaking — no consumed yet)

- Tools existentes (`freematica_list_materiales_asignados_servicios`, `freematica_get_master_data`) devuelven ahora `{ items, count, total, ... }` (antes era el wrapper completo de Freemática mal mapeado).
- `FreematicaClient.getMaterialesAsignadosServicios()` y `getMasterData()` devuelven `Promise<{ items, total }>` en vez de `Promise<T[]>`.

### Notes

- Probado empíricamente contra el API real de Freemática. Confirmado que `grupoCli` documentado en Postman no funciona en producción — no se expone como filtro.
```

- [ ] **Step 12.6: Validate**

```bash
npm run lint && npm run typecheck && npm run build && npm test
```

Expected: PASS los 4.

- [ ] **Step 12.7: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: document v0.4.0 commercial tools, pagination, and idReg pattern"
```

---

## Task 13: PR + merge + tag v0.4.0 (requiere aprobación humana)

**Files:** ninguno (solo git/gh)

- [ ] **Step 13.1: STOP — presentar resumen al usuario para aprobación de push**

> "Implementación completa en `feat/commercial-tools`. Lint + typecheck + build + tests OK localmente (≥65 tests pasando). Plan:
>
> 1. Push branch.
> 2. PR a `development`, esperar CI verde, squash-merge.
> 3. PR `development` → `main`, esperar CI verde, merge.
> 4. Tag `v0.4.0` + push → dispara `publish.yml`.
> 5. Verificar publicación.
>
> ¿Apruebo todo el flujo?"

**WAIT for explicit user approval before continuing.**

- [ ] **Step 13.2: Push feature branch**

```bash
git push -u origin feat/commercial-tools
```

- [ ] **Step 13.3: PR contra development**

```bash
gh pr create --base development --head feat/commercial-tools \
  --title "feat: commercial tools + envelope unwrap (v0.4.0)" \
  --body "$(cat <<'EOF'
## Resumen

Arregla un bug latente en el `BaseClient` (envelope unwrap) y añade 6 tools comerciales (clientes, contactos-clientes, oportunidades-negocio).

## Cambios

### Bug fix (crítico)
- `BaseClient.request` ahora desempaqueta el envelope `{ errorCode, errorMessage, data }` que devuelve el API REST de Freemática y mapea `errorCode` a `FreematicaError`.
- Tools v0.3.x estaban devolviendo el wrapper completo en `items` — confirmado empíricamente contra el API real.

### Features nuevas (6 tools)
- Clientes: list + get
- Contactos clientes: list
- Oportunidades de negocio: list + get + datos-ampliados

### Schema de paginación
- 1-indexed (`page=0` bloqueado a nivel Zod).
- `items` cap 50.

### Sin filtros
- `grupoCli` verificado empíricamente como ignorado por el API. No se expone.

## Validación local

- lint, typecheck, build: clean
- ≥65/65 tests OK
- Probado contra API real para validar shape y comportamiento de paginación.

## Spec / Plan

- Spec: docs/superpowers/specs/2026-05-20-commercial-tools-design.md
- Plan: docs/superpowers/plans/2026-05-20-commercial-tools.md
EOF
)"
```

- [ ] **Step 13.4: Esperar CI y mergear PR**

```bash
until gh pr view --json statusCheckRollup --jq '.statusCheckRollup[0].status' 2>/dev/null | grep -q COMPLETED; do sleep 5; done
gh pr view --json statusCheckRollup --jq '.statusCheckRollup[0].conclusion'   # debe ser "SUCCESS"
gh pr merge --squash --delete-branch
```

- [ ] **Step 13.5: PR development → main**

```bash
git checkout development && git pull
gh pr create --base main --head development \
  --title "release: v0.4.0 — commercial tools + envelope unwrap fix" \
  --body "Lanza v0.4.0 a producción. Detalles en CHANGELOG.md y en el PR a development."
```

- [ ] **Step 13.6: Esperar CI y mergear**

```bash
until gh pr view --json statusCheckRollup --jq '.statusCheckRollup[0].status' 2>/dev/null | grep -q COMPLETED; do sleep 5; done
gh pr merge --merge --delete-branch=false
```

- [ ] **Step 13.7: Tag y push (dispara publish)**

```bash
git checkout main && git pull
git tag v0.4.0
git push origin v0.4.0
```

- [ ] **Step 13.8: Verificar publicación**

```bash
until gh run list --workflow=publish.yml --limit 1 --json status --jq '.[0].status' 2>/dev/null | grep -q completed; do sleep 5; done
gh run list --workflow=publish.yml --limit 1 --json conclusion --jq '.[0].conclusion'   # debe ser "success"
```

---

## Task 14: Commitear el plan

**Files:**

- `docs/superpowers/plans/2026-05-20-commercial-tools.md`

Esto debe hacerse al final, una vez todo lo demás esté commiteado (idealmente integrado en el PR, no como commit separado tras el tag). Si no, integrar en el primer push.

- [ ] **Step 14.1: Add the plan doc and commit (antes de Step 13.2)**

```bash
git add docs/superpowers/plans/2026-05-20-commercial-tools.md
git commit -m "docs: add implementation plan for v0.4.0 commercial tools"
```

> **Implementador:** mueve este commit al inicio del flujo de PR (después de Task 12) para que el plan viaje con el PR.

---

## Self-Review (autor del plan)

**Spec coverage:**

| Spec section                | Cubierto en                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| §2 Goals                    | Tasks 2 (unwrap), 7-9 (6 tools), 6 (paginación), 11 (idReg en descripción), 1+3 (api-envelope types)                                          |
| §3 Non-goals                | Respetado (sin filtros, sin escritura, sin casos, sin contactos detalle, sin tipado fuerte, sin help tool)                                    |
| §4 Decisiones de diseño     | Distribuidas en Tasks 2 (unwrap+mapEnvelopeError), 6 (pagination), 7/9 (id=string con .describe), 5 (shape de tools existentes), 11 (version) |
| §5 Estructura de archivos   | Tasks 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12                                                                                                      |
| §6.1 api-envelope.ts        | Task 1                                                                                                                                        |
| §6.2 base-client.ts         | Task 2                                                                                                                                        |
| §6.3 freematica-client.ts   | Task 3                                                                                                                                        |
| §6.4 pagination.ts          | Task 6                                                                                                                                        |
| §6.5 types                  | Task 3 (combinado con freematica-client)                                                                                                      |
| §6.6 helpers.ts             | Task 4                                                                                                                                        |
| §6.7 tools                  | Tasks 7, 8, 9                                                                                                                                 |
| §6.8 server.ts              | Task 10                                                                                                                                       |
| §6.9 server-instructions.ts | Task 11                                                                                                                                       |
| §7 Data flow                | Verificado en Tasks 7-9 (tests E2E)                                                                                                           |
| §8 Manejo de errores        | Tasks 2 (envelope mapping), 7-9 (errorFor)                                                                                                    |
| §9 Testing                  | Tasks 2, 3, 4, 6, 7, 8, 9, 10                                                                                                                 |
| §11 README                  | Task 12                                                                                                                                       |
| §12 Version                 | Tasks 10 (server.ts), 11 (package.json + http + index)                                                                                        |
| §13 Open questions          | Out of scope para el plan; doc del comportamiento de datos-ampliados en Task 9 y 11                                                           |

**Placeholder scan:** ✅ Sin "TBD" / "TODO" / "implement later". Las notas sobre `CallToolResult` cast son guías concretas referenciando código existente (`src/tools/contratos.ts`), no placeholders.

**Type consistency:**

- `FreematicaEnvelope<T>` y `FreematicaListData<T>` (Task 1) → usados en Tasks 2, 3.
- `ListResult<T>` y `ListOptions` (Task 3) → exportados; usados implícitamente por las tools en Tasks 7-9.
- `Cliente`, `ContactoCliente`, `OportunidadNegocio` (Task 3) → usados como tipos genéricos en `FreematicaClient` methods.
- `MasterDataCatalog`, `CATALOG_ENDPOINTS` (preexistentes) → siguen siendo válidos.
- `PaginationSchema` (Task 6) → usado en Tasks 7, 8, 9.
- `okList` (Task 4) → usado en Tasks 5, 7, 8, 9.
- `errorFor` (helper local) → repetido en 7, 8, 9; consistente.
- Tool names usados en todos los tests reflejan los nombres en las implementaciones (verificado: `freematica_list_clientes`, etc.).

**Git workflow:** Cumple las normas globales — branch ya creada (`feat/commercial-tools` desde development), push y PR requieren aprobación humana (Task 13.1), sin co-authored-by ni referencias a Claude/AI, commits convencionales.
