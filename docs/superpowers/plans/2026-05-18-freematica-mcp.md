# Freemática MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el repositorio `mcp-freematica` que expone como MCP server (Streamable HTTP) la operación "Obtener lista de material asignado a servicios" del API REST de Freemática, con arquitectura preparada para añadir el resto de operaciones del Postman collection sin refactor.

**Architecture:** TypeScript + `@modelcontextprotocol/sdk` + Express. Factory pattern para registrar tools (mismo patrón que `mcp-nevent`). `BaseClient` axios con inyección automática de los 5 headers `x-auth-*` desde env vars. `FreematicaClient` con un método por endpoint. Errores HTTP normalizados a códigos para el LLM.

**Tech Stack:** TypeScript 5.3, Node ≥20, `@modelcontextprotocol/sdk` ^1.27.1, axios, express, zod, vitest, nock, eslint, prettier.

**Spec:** `docs/superpowers/specs/2026-05-18-freematica-mcp-design.md`

**Repo state on start:** El directorio `/Users/samu/workspace/mcp-freematica/` existe con `apidocs/Freematica API - Complete Collection.postman_collection.json` y `docs/superpowers/{specs,plans}/`. **NO es un git repo todavía.** El usuario debe haber creado manualmente el repo vacío en `https://github.com/<freematica-org>/mcp-freematica` antes de la Task 17 (push inicial).

---

## File Structure

| Path                                      | Responsibility                                              |
| ----------------------------------------- | ----------------------------------------------------------- |
| `package.json`                            | Dependencies, scripts, metadata                             |
| `tsconfig.json`                           | TypeScript compiler config (ES2022, ESNext modules, strict) |
| `vitest.config.ts`                        | Vitest config (coverage, globals)                           |
| `eslint.config.js`                        | ESLint flat config                                          |
| `.prettierrc`                             | Prettier config                                             |
| `.gitignore`                              | node_modules, dist, .env, coverage                          |
| `.env.example`                            | Template de env vars requeridas                             |
| `Dockerfile`                              | Imagen para Nubiia (opcional)                               |
| `LICENSE`                                 | MIT                                                         |
| `README.md`                               | Cómo configurar, arrancar y añadir tools                    |
| `.github/workflows/ci.yml`                | Lint + typecheck + test en push/PR                          |
| `src/index.ts`                            | Bootstrap (carga config + arranca HTTP)                     |
| `src/config.ts`                           | Zod schema de env vars + `loadConfig()`                     |
| `src/server-instructions.ts`              | Texto de instrucciones para el LLM                          |
| `src/server.ts`                           | Factory `createFreematicaServer()`                          |
| `src/transports/http.ts`                  | Express app + StreamableHTTPServerTransport                 |
| `src/clients/base-client.ts`              | Cliente axios genérico + mapeo de errores                   |
| `src/clients/freematica-client.ts`        | Métodos por endpoint del API                                |
| `src/tools/helpers.ts`                    | `ok()`, `error()`, formato MCP                              |
| `src/tools/contratos.ts`                  | `registerContratosTools(server, client)`                    |
| `src/schemas/contratos.ts`                | Zod schemas de inputs (placeholder vacío para v0.1.0)       |
| `src/types/contratos.ts`                  | `VoContratosServMatAsignado`                                |
| `tests/clients/base-client.test.ts`       | Unit tests del BaseClient                                   |
| `tests/clients/freematica-client.test.ts` | Unit tests del FreematicaClient                             |
| `tests/tools/helpers.test.ts`             | Unit tests de helpers                                       |
| `tests/tools/contratos.test.ts`           | Unit tests de la tool                                       |
| `tests/server.test.ts`                    | Tests del factory                                           |
| `tests/config.test.ts`                    | Tests de `loadConfig`                                       |

---

## Task 1: Inicializar repo y configuración base

**Files:**

- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `.env.example`, `LICENSE`

- [ ] **Step 1.1: `git init` y configurar branch `main`**

```bash
cd /Users/samu/workspace/mcp-freematica
git init -b main
```

- [ ] **Step 1.2: Crear `.gitignore`**

Contenido:

```
node_modules/
dist/
coverage/
.env
.env.local
*.log
.DS_Store
.vscode/
.idea/
```

- [ ] **Step 1.3: Crear `package.json`**

```json
{
  "name": "mcp-freematica",
  "version": "0.1.0",
  "description": "MCP server for Freemática REST API (consumed by Claude via Nubiia)",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "freematica-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "lint": "eslint src tests",
    "lint:fix": "eslint src tests --fix",
    "format": "prettier --write src tests",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "engines": {
    "node": ">=20"
  },
  "keywords": ["mcp", "freematica", "nubiia"],
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "axios": "^1.7.0",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "express-rate-limit": "^7.4.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@vitest/coverage-v8": "^2.1.8",
    "@vitest/ui": "^2.1.8",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "nock": "^13.5.0",
    "prettier": "^3.3.0",
    "tsx": "^4.6.0",
    "typescript": "^5.3.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 1.4: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitAny": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 1.5: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
    },
  },
});
```

- [ ] **Step 1.6: Crear `eslint.config.js`**

```js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
];
```

- [ ] **Step 1.7: Crear `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 1.8: Crear `.env.example`**

```
# Required: Freemática API credentials (provided by Nubiia at runtime)
FREEMATICA_AUTH_TOKEN=
FREEMATICA_AUTH_COMPANY=
FREEMATICA_AUTH_ORGANIZATION=
FREEMATICA_AUTH_APP=
FREEMATICA_AUTH_SESSION=

# Optional
FREEMATICA_BASE_URL=https://api-p01.clientservicepanel.com/restsat/api
MCP_PORT=3000
MCP_ALLOWED_ORIGINS=*
```

- [ ] **Step 1.9: Crear `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 Freemática

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 1.10: Instalar dependencias**

Run: `npm install`
Expected: `node_modules/` creado, `package-lock.json` generado, sin errores.

- [ ] **Step 1.11: Verificar typecheck básico**

Run: `npm run typecheck`
Expected: PASS (no hay código aún; sólo valida que tsconfig es válido).

- [ ] **Step 1.12: Commit inicial en `main`**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vitest.config.ts eslint.config.js .prettierrc .env.example LICENSE apidocs/ docs/
git commit -m "chore: initial repo setup with TypeScript, vitest, eslint, prettier"
```

- [ ] **Step 1.13: Crear branch `development` y cambiar a ella**

```bash
git checkout -b development
```

- [ ] **Step 1.14: Crear branch de feature**

```bash
git checkout -b feat/initial-mcp-server
```

---

## Task 2: Implementar `config.ts` (TDD)

**Files:**

- Create: `src/config.ts`
- Test: `tests/config.test.ts`

- [ ] **Step 2.1: Escribir test que falla**

`tests/config.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads valid config from env vars', () => {
    process.env.FREEMATICA_AUTH_TOKEN = 'tok';
    process.env.FREEMATICA_AUTH_COMPANY = 'co';
    process.env.FREEMATICA_AUTH_ORGANIZATION = 'org';
    process.env.FREEMATICA_AUTH_APP = 'app';
    process.env.FREEMATICA_AUTH_SESSION = 'ses';

    const config = loadConfig();

    expect(config.FREEMATICA_AUTH_TOKEN).toBe('tok');
    expect(config.FREEMATICA_AUTH_COMPANY).toBe('co');
    expect(config.FREEMATICA_BASE_URL).toBe('https://api-p01.clientservicepanel.com/restsat/api');
    expect(config.MCP_PORT).toBe(3000);
    expect(config.MCP_ALLOWED_ORIGINS).toBe('*');
  });

  it('throws clear error when FREEMATICA_AUTH_TOKEN missing', () => {
    process.env.FREEMATICA_AUTH_COMPANY = 'co';
    process.env.FREEMATICA_AUTH_ORGANIZATION = 'org';
    process.env.FREEMATICA_AUTH_APP = 'app';
    process.env.FREEMATICA_AUTH_SESSION = 'ses';
    delete process.env.FREEMATICA_AUTH_TOKEN;

    expect(() => loadConfig()).toThrow(/FREEMATICA_AUTH_TOKEN/);
  });

  it('coerces MCP_PORT to number', () => {
    process.env.FREEMATICA_AUTH_TOKEN = 'tok';
    process.env.FREEMATICA_AUTH_COMPANY = 'co';
    process.env.FREEMATICA_AUTH_ORGANIZATION = 'org';
    process.env.FREEMATICA_AUTH_APP = 'app';
    process.env.FREEMATICA_AUTH_SESSION = 'ses';
    process.env.MCP_PORT = '8080';

    const config = loadConfig();

    expect(config.MCP_PORT).toBe(8080);
    expect(typeof config.MCP_PORT).toBe('number');
  });

  it('rejects MCP_PORT out of range', () => {
    process.env.FREEMATICA_AUTH_TOKEN = 'tok';
    process.env.FREEMATICA_AUTH_COMPANY = 'co';
    process.env.FREEMATICA_AUTH_ORGANIZATION = 'org';
    process.env.FREEMATICA_AUTH_APP = 'app';
    process.env.FREEMATICA_AUTH_SESSION = 'ses';
    process.env.MCP_PORT = '99999';

    expect(() => loadConfig()).toThrow(/MCP_PORT/);
  });
});
```

- [ ] **Step 2.2: Verificar que falla**

Run: `npm test -- tests/config.test.ts`
Expected: FAIL ("Cannot find module '../src/config.js'").

- [ ] **Step 2.3: Implementar `src/config.ts`**

```ts
import { z } from 'zod';

const ConfigSchema = z.object({
  FREEMATICA_BASE_URL: z
    .string()
    .url()
    .default('https://api-p01.clientservicepanel.com/restsat/api'),
  FREEMATICA_AUTH_TOKEN: z.string().min(1),
  FREEMATICA_AUTH_COMPANY: z.string().min(1),
  FREEMATICA_AUTH_ORGANIZATION: z.string().min(1),
  FREEMATICA_AUTH_APP: z.string().min(1),
  FREEMATICA_AUTH_SESSION: z.string().min(1),
  MCP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MCP_ALLOWED_ORIGINS: z.string().default('*'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `[freematica-mcp] Invalid configuration:\n${issues}\n\n` +
        `Set the missing/invalid environment variables and restart.`,
    );
  }
  return result.data;
}
```

- [ ] **Step 2.4: Verificar que pasa**

Run: `npm test -- tests/config.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 2.5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat: add config loader with zod validation"
```

---

## Task 3: Implementar tipos placeholder (`types/contratos.ts`)

**Files:**

- Create: `src/types/contratos.ts`

- [ ] **Step 3.1: Crear archivo de tipos**

```ts
/**
 * Response object for GET /pvss/v2/contratos-servicios-material.
 *
 * The exact shape is not documented in the Postman collection. The type is
 * declared as a loose record until we have access to real API responses;
 * tighten it then.
 */
export type VoContratosServMatAsignado = Record<string, unknown>;
```

- [ ] **Step 3.2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3.3: Commit**

```bash
git add src/types/contratos.ts
git commit -m "feat: add placeholder type for VoContratosServMatAsignado"
```

---

## Task 4: Implementar `BaseClient` (TDD)

**Files:**

- Create: `src/clients/base-client.ts`
- Test: `tests/clients/base-client.test.ts`

- [ ] **Step 4.1: Escribir test que falla**

`tests/clients/base-client.test.ts`:

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

describe('BaseClient', () => {
  let client: TestClient;

  beforeEach(() => {
    client = new TestClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

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
      .reply(200, { ok: true });

    const res = await client.testGet<{ ok: boolean }>('/ping');

    expect(res).toEqual({ ok: true });
    expect(scope.isDone()).toBe(true);
  });

  it('maps 401 to invalid_token', async () => {
    nock(BASE_URL).get('/x').reply(401, { error: 'unauthorized' });
    await expect(client.testGet('/x')).rejects.toMatchObject({
      code: 'invalid_token',
    });
  });

  it('maps 403 to forbidden', async () => {
    nock(BASE_URL).get('/x').reply(403);
    await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('maps 404 to not_found', async () => {
    nock(BASE_URL).get('/x').reply(404);
    await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('maps 429 to rate_limit_exceeded', async () => {
    nock(BASE_URL).get('/x').reply(429, '', { 'retry-after': '5' });
    await expect(client.testGet('/x')).rejects.toMatchObject({
      code: 'rate_limit_exceeded',
    });
  });

  it('maps 500 to server_error', async () => {
    nock(BASE_URL).get('/x').reply(500);
    await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
  });

  it('maps network error to network_error', async () => {
    nock(BASE_URL).get('/x').replyWithError({ code: 'ECONNREFUSED', message: 'down' });
    await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'network_error' });
  });

  it('FreematicaError is an Error instance with code property', () => {
    const e = new FreematicaError('forbidden', 'nope');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('forbidden');
    expect(e.message).toBe('nope');
  });
});
```

- [ ] **Step 4.2: Verificar que falla**

Run: `npm test -- tests/clients/base-client.test.ts`
Expected: FAIL ("Cannot find module").

- [ ] **Step 4.3: Implementar `src/clients/base-client.ts`**

```ts
import axios, { type AxiosInstance, AxiosError } from 'axios';

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
      const res = await this.http.request<T>({ method, url: path, data: body });
      return res.data;
    } catch (err) {
      throw this.mapError(err);
    }
  }

  private mapError(err: unknown): FreematicaError {
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

- [ ] **Step 4.4: Verificar que pasa**

Run: `npm test -- tests/clients/base-client.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 4.5: Commit**

```bash
git add src/clients/base-client.ts tests/clients/base-client.test.ts
git commit -m "feat: add BaseClient with axios + normalized error codes"
```

---

## Task 5: Implementar `FreematicaClient` (TDD)

**Files:**

- Create: `src/clients/freematica-client.ts`
- Test: `tests/clients/freematica-client.test.ts`

- [ ] **Step 5.1: Escribir test que falla**

`tests/clients/freematica-client.test.ts`:

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

describe('FreematicaClient', () => {
  let client: FreematicaClient;

  beforeEach(() => {
    client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getMaterialesAsignadosServicios', () => {
    it('calls GET /pvss/v2/contratos-servicios-material and returns the array', async () => {
      const fakeData = [
        { idreg: 1, material: 'cable RJ45', servicio: 'SVC-100' },
        { idreg: 2, material: 'router', servicio: 'SVC-101' },
      ];
      const scope = nock(BASE_URL)
        .get('/pvss/v2/contratos-servicios-material')
        .reply(200, fakeData);

      const result = await client.getMaterialesAsignadosServicios();

      expect(result).toEqual(fakeData);
      expect(scope.isDone()).toBe(true);
    });

    it('returns empty array when API returns empty array', async () => {
      nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(200, []);
      const result = await client.getMaterialesAsignadosServicios();
      expect(result).toEqual([]);
    });

    it('propagates FreematicaError on 401', async () => {
      nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(401);
      await expect(client.getMaterialesAsignadosServicios()).rejects.toMatchObject({
        code: 'invalid_token',
      });
    });
  });
});
```

- [ ] **Step 5.2: Verificar que falla**

Run: `npm test -- tests/clients/freematica-client.test.ts`
Expected: FAIL.

- [ ] **Step 5.3: Implementar `src/clients/freematica-client.ts`**

```ts
import { BaseClient } from './base-client.js';
import type { VoContratosServMatAsignado } from '../types/contratos.js';

/**
 * Typed client for the Freemática REST API.
 *
 * One method per exposed endpoint. Add a new method when a new Postman
 * operation gets wrapped into an MCP tool.
 */
export class FreematicaClient extends BaseClient {
  /**
   * Obtener lista de material asignado a servicios.
   *
   * Postman: pvss → Contratos → "Obtener lista de material asignado a servicios"
   * Endpoint: GET /pvss/v2/contratos-servicios-material
   * Internal method: MCT_TABLA_GESTION
   */
  getMaterialesAsignadosServicios(): Promise<VoContratosServMatAsignado[]> {
    return this.get<VoContratosServMatAsignado[]>('/pvss/v2/contratos-servicios-material');
  }
}
```

- [ ] **Step 5.4: Verificar que pasa**

Run: `npm test -- tests/clients/freematica-client.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5.5: Commit**

```bash
git add src/clients/freematica-client.ts tests/clients/freematica-client.test.ts
git commit -m "feat: add FreematicaClient with getMaterialesAsignadosServicios"
```

---

## Task 6: Implementar `tools/helpers.ts` (TDD)

**Files:**

- Create: `src/tools/helpers.ts`
- Test: `tests/tools/helpers.test.ts`

- [ ] **Step 6.1: Escribir test que falla**

`tests/tools/helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ok, error } from '../../src/tools/helpers.js';
import { FreematicaError } from '../../src/clients/base-client.js';

describe('ok', () => {
  it('wraps data in MCP content array as JSON text', () => {
    const result = ok({ count: 2, items: [1, 2] });
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ count: 2, items: [1, 2] }, null, 2) }],
    });
    expect(result.isError).toBeUndefined();
  });
});

describe('error', () => {
  it('wraps code + message with isError=true', () => {
    const result = error('forbidden', 'nope');
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({ error: 'forbidden', message: 'nope' });
  });

  it('accepts a FreematicaError instance', () => {
    const result = error(new FreematicaError('not_found', 'gone'));
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({ error: 'not_found', message: 'gone' });
  });

  it('falls back to unexpected_error for unknown errors', () => {
    const result = error(new Error('boom'));
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('boom');
  });
});
```

- [ ] **Step 6.2: Verificar que falla**

Run: `npm test -- tests/tools/helpers.test.ts`
Expected: FAIL.

- [ ] **Step 6.3: Implementar `src/tools/helpers.ts`**

```ts
import { FreematicaError, type FreematicaErrorCode } from '../clients/base-client.js';

export interface ToolTextContent {
  type: 'text';
  text: string;
}

export interface ToolResult {
  content: ToolTextContent[];
  isError?: boolean;
}

export function ok(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

export function error(codeOrErr: FreematicaErrorCode | Error, message?: string): ToolResult {
  let code: FreematicaErrorCode;
  let msg: string;

  if (codeOrErr instanceof FreematicaError) {
    code = codeOrErr.code;
    msg = codeOrErr.message;
  } else if (codeOrErr instanceof Error) {
    code = 'unexpected_error';
    msg = codeOrErr.message;
  } else {
    code = codeOrErr;
    msg = message ?? code;
  }

  return {
    content: [{ type: 'text', text: JSON.stringify({ error: code, message: msg }, null, 2) }],
    isError: true,
  };
}
```

- [ ] **Step 6.4: Verificar que pasa**

Run: `npm test -- tests/tools/helpers.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6.5: Commit**

```bash
git add src/tools/helpers.ts tests/tools/helpers.test.ts
git commit -m "feat: add tools/helpers with ok() and error() formatters"
```

---

## Task 7: Implementar la tool `contratos` (TDD)

**Files:**

- Create: `src/tools/contratos.ts`, `src/schemas/contratos.ts`
- Test: `tests/tools/contratos.test.ts`

- [ ] **Step 7.1: Crear `src/schemas/contratos.ts` (placeholder vacío)**

```ts
/**
 * Zod schemas for inputs of tools in the "Contratos" API group.
 *
 * Empty for v0.1.0 because the only tool (list materiales asignados) takes
 * no inputs. Will be populated as more tools land.
 */
export {};
```

- [ ] **Step 7.2: Escribir test que falla**

`tests/tools/contratos.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerContratosTools } from '../../src/tools/contratos.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const TOOL_NAME = 'freematica_list_materiales_asignados_servicios';

function buildServer(): { server: McpServer; client: FreematicaClient } {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerContratosTools(server, client);
  return { server, client };
}

describe('registerContratosTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers the freematica_list_materiales_asignados_servicios tool', () => {
    const { server } = buildServer();
    // McpServer exposes a private `_registeredTools` map in 1.x — check via list
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty(TOOL_NAME);
  });

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

  it('handler returns error() on API failure', async () => {
    nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(401);

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

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('invalid_token');
  });
});
```

> **Note for implementer:** The `_registeredTools` access pattern above is a workaround to introspect what `McpServer.tool()` registered. If the SDK exposes a public introspection API in `^1.27.x`, prefer that. If the private field has a different name in your installed SDK version, adapt the test (open `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js` to check).

- [ ] **Step 7.3: Verificar que falla**

Run: `npm test -- tests/tools/contratos.test.ts`
Expected: FAIL.

- [ ] **Step 7.4: Implementar `src/tools/contratos.ts`**

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { error, ok } from './helpers.js';

const LIST_MATERIALES_TOOL_NAME = 'freematica_list_materiales_asignados_servicios';

const LIST_MATERIALES_TOOL_DESCRIPTION = [
  'Devuelve la lista completa de material asignado a servicios.',
  '',
  'Endpoint: GET /pvss/v2/contratos-servicios-material (Freemática API).',
  'Tipo de respuesta: VoContratosServMatAsignado[].',
  '',
  'Esta operación no acepta parámetros: siempre devuelve la lista entera para',
  'la organización autenticada. La respuesta es un objeto con dos campos:',
  '  - items: array de objetos VoContratosServMatAsignado',
  '  - count: número total de elementos',
].join('\n');

/**
 * Registers every MCP tool that maps to operations in the "Contratos" API group
 * (Postman: app `pvss` → group `Contratos`).
 *
 * Add new tools here by calling `server.tool(...)` again. When this file grows
 * past ~15 tools, split it into `src/tools/contratos/<entity>.ts`.
 */
export function registerContratosTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    LIST_MATERIALES_TOOL_NAME,
    LIST_MATERIALES_TOOL_DESCRIPTION,
    {},
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async () => {
      try {
        const items = await client.getMaterialesAsignadosServicios();
        return ok({ items, count: items.length });
      } catch (err) {
        if (err instanceof FreematicaError) return error(err);
        return error(err instanceof Error ? err : new Error(String(err)));
      }
    },
  );
}
```

- [ ] **Step 7.5: Verificar que pasa**

Run: `npm test -- tests/tools/contratos.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7.6: Commit**

```bash
git add src/tools/contratos.ts src/schemas/contratos.ts tests/tools/contratos.test.ts
git commit -m "feat: add freematica_list_materiales_asignados_servicios tool"
```

---

## Task 8: Implementar `server-instructions.ts` y `server.ts` (TDD)

**Files:**

- Create: `src/server.ts`, `src/server-instructions.ts`
- Test: `tests/server.test.ts`

- [ ] **Step 8.1: Crear `src/server-instructions.ts`**

```ts
export const FREEMATICA_MCP_INSTRUCTIONS = `
# Freemática MCP

Este servidor expone operaciones del API REST de Freemática como tools MCP.

## Tools disponibles

- **freematica_list_materiales_asignados_servicios** — Devuelve la lista de
  material asignado a servicios (sin parámetros). Devuelve un objeto
  { items: VoContratosServMatAsignado[], count: number }.

## Manejo de errores

Las llamadas pueden fallar con uno de estos códigos:

| Código | Significado | Acción del LLM |
|---|---|---|
| invalid_token | Credenciales caducadas o inválidas | Avisar al usuario; renovar en Nubiia. |
| forbidden | Permisos insuficientes | Explicar; no reintentar. |
| not_found | Recurso o endpoint inexistente | Comprobar el ID; no reintentar. |
| rate_limit_exceeded | Demasiadas peticiones | Esperar y reintentar una vez. |
| server_error | Error 5xx del API | Reintentar una vez con backoff. |
| network_error | Problemas de red | Reintentar una vez tras 2s. |
| unexpected_error | Error no clasificado | Loggear y reintentar una vez. |
`.trim();
```

- [ ] **Step 8.2: Escribir test que falla**

`tests/server.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createFreematicaServer } from '../src/server.js';
import { FreematicaClient } from '../src/clients/freematica-client.js';

describe('createFreematicaServer', () => {
  it('returns an McpServer with name freematica-mcp and the contratos tool registered', () => {
    const client = new FreematicaClient({
      baseUrl: 'https://x.example.com',
      authHeaders: {
        'x-auth-token': 't',
        'x-auth-company': 'c',
        'x-auth-organization': 'o',
        'x-auth-app': 'a',
        'x-auth-session': 's',
      },
    });

    const server = createFreematicaServer({ client });

    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty('freematica_list_materiales_asignados_servicios');
  });
});
```

- [ ] **Step 8.3: Verificar que falla**

Run: `npm test -- tests/server.test.ts`
Expected: FAIL.

- [ ] **Step 8.4: Implementar `src/server.ts`**

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from './clients/freematica-client.js';
import { FREEMATICA_MCP_INSTRUCTIONS } from './server-instructions.js';
import { registerContratosTools } from './tools/contratos.js';

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
    { name: 'freematica-mcp', version: '0.1.0' },
    { instructions: FREEMATICA_MCP_INSTRUCTIONS },
  );

  registerContratosTools(server, opts.client);

  return server;
}
```

- [ ] **Step 8.5: Verificar que pasa**

Run: `npm test -- tests/server.test.ts`
Expected: PASS.

- [ ] **Step 8.6: Verificar test suite completa**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 8.7: Commit**

```bash
git add src/server.ts src/server-instructions.ts tests/server.test.ts
git commit -m "feat: add createFreematicaServer factory with LLM instructions"
```

---

## Task 9: Implementar el transport HTTP

**Files:**

- Create: `src/transports/http.ts`

> **Why no unit test for the transport:** the StreamableHTTPServerTransport is heavily SDK-integrated; an end-to-end smoke test (Task 12) is more valuable than a brittle mock-heavy unit test. The transport is small and read-only.

- [ ] **Step 9.1: Implementar `src/transports/http.ts`**

```ts
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { createFreematicaServer } from '../server.js';

export interface HttpTransportConfig {
  port: number;
  client: FreematicaClient;
  allowedOrigins: string;
}

export interface HttpAppResult {
  app: express.Application;
  shutdown: () => Promise<void>;
}

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  createdAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

export async function createHttpApp(config: HttpTransportConfig): Promise<HttpAppResult> {
  const app = express();
  const sessions = new Map<string, SessionEntry>();

  const origins =
    config.allowedOrigins === '*' ? true : config.allowedOrigins.split(',').map((s) => s.trim());

  app.use(
    cors({
      origin: origins,
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'Mcp-Session-Id', 'Authorization'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  const mcpRateLimit = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '0.1.0', sessions: sessions.size });
  });

  // POST /mcp — JSON-RPC handler
  app.post('/mcp', mcpRateLimit, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let entry: SessionEntry | undefined = sessionId ? sessions.get(sessionId) : undefined;

    if (!entry) {
      if (!isInitializeRequest(req.body)) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'No session: send initialize first' },
          id: null,
        });
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          sessions.set(sid, { transport, createdAt: Date.now() });
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };

      const server = createFreematicaServer({ client: config.client });
      await server.connect(transport);

      await transport.handleRequest(req, res, req.body);
      return;
    }

    await entry.transport.handleRequest(req, res, req.body);
  });

  // GET /mcp — SSE stream
  app.get('/mcp', mcpRateLimit, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const entry = sessionId ? sessions.get(sessionId) : undefined;
    if (!entry) {
      res.status(400).send('Invalid or missing Mcp-Session-Id');
      return;
    }
    await entry.transport.handleRequest(req, res);
  });

  // DELETE /mcp — terminate session
  app.delete('/mcp', mcpRateLimit, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const entry = sessionId ? sessions.get(sessionId) : undefined;
    if (!entry) {
      res.status(404).send('Session not found');
      return;
    }
    await entry.transport.handleRequest(req, res);
    sessions.delete(sessionId!);
  });

  // Background pruning of orphaned sessions
  const pruneInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [sid, entry] of sessions.entries()) {
        if (now - entry.createdAt > SESSION_TTL_MS) {
          try {
            void entry.transport.close();
          } catch {
            /* ignore */
          }
          sessions.delete(sid);
        }
      }
    },
    5 * 60 * 1000,
  );

  const shutdown = async (): Promise<void> => {
    clearInterval(pruneInterval);
    for (const entry of sessions.values()) {
      try {
        await entry.transport.close();
      } catch {
        /* ignore */
      }
    }
    sessions.clear();
  };

  return { app, shutdown };
}
```

- [ ] **Step 9.2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 9.3: Commit**

```bash
git add src/transports/http.ts
git commit -m "feat: add Streamable HTTP transport with session management"
```

---

## Task 10: Implementar `src/index.ts` (entry point)

**Files:**

- Create: `src/index.ts`

- [ ] **Step 10.1: Implementar `src/index.ts`**

```ts
#!/usr/bin/env node
import { loadConfig } from './config.js';
import { FreematicaClient } from './clients/freematica-client.js';
import { createHttpApp } from './transports/http.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const client = new FreematicaClient({
    baseUrl: config.FREEMATICA_BASE_URL,
    authHeaders: {
      'x-auth-token': config.FREEMATICA_AUTH_TOKEN,
      'x-auth-company': config.FREEMATICA_AUTH_COMPANY,
      'x-auth-organization': config.FREEMATICA_AUTH_ORGANIZATION,
      'x-auth-app': config.FREEMATICA_AUTH_APP,
      'x-auth-session': config.FREEMATICA_AUTH_SESSION,
    },
  });

  const { app, shutdown } = await createHttpApp({
    port: config.MCP_PORT,
    client,
    allowedOrigins: config.MCP_ALLOWED_ORIGINS,
  });

  process.on('SIGTERM', () => {
    void shutdown().then(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    void shutdown().then(() => process.exit(0));
  });

  app.listen(config.MCP_PORT, () => {
    console.error(
      `[freematica-mcp] HTTP server listening on port ${config.MCP_PORT} | base=${config.FREEMATICA_BASE_URL}`,
    );
    console.error(`[freematica-mcp] MCP endpoint:    http://localhost:${config.MCP_PORT}/mcp`);
    console.error(`[freematica-mcp] Health endpoint: http://localhost:${config.MCP_PORT}/health`);
  });
}

main().catch((err) => {
  console.error('[freematica-mcp] FATAL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 10.2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 10.3: Build**

Run: `npm run build`
Expected: PASS, `dist/` creado con `.js` y `.d.ts`.

- [ ] **Step 10.4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add bootstrap entry point"
```

---

## Task 11: Crear `Dockerfile`

**Files:**

- Create: `Dockerfile`

- [ ] **Step 11.1: Crear `Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY src ./src
RUN npm ci && npm run build && npm prune --production

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
```

- [ ] **Step 11.2: Commit**

```bash
git add Dockerfile
git commit -m "chore: add Dockerfile for container deployment"
```

---

## Task 12: Smoke test end-to-end manual

**Files:**

- None (manual verification)

- [ ] **Step 12.1: Crear `.env.local` con credenciales reales o de test**

Pedir a Samuel los valores reales o de un entorno de test:

```
FREEMATICA_AUTH_TOKEN=<real>
FREEMATICA_AUTH_COMPANY=<real>
FREEMATICA_AUTH_ORGANIZATION=<real>
FREEMATICA_AUTH_APP=<real>
FREEMATICA_AUTH_SESSION=<real>
```

> **NO commitear `.env.local`** — está en `.gitignore`.

- [ ] **Step 12.2: Arrancar el server en modo dev**

Run: `npm run dev` (o `set -a; source .env.local; set +a; npm run dev`)
Expected: log "HTTP server listening on port 3000".

- [ ] **Step 12.3: Probar healthcheck**

Run en otra terminal:

```bash
curl -s http://localhost:3000/health
```

Expected: `{"status":"ok","version":"0.1.0","sessions":0}`.

- [ ] **Step 12.4: Probar el flujo MCP completo con `curl`**

Inicializar sesión:

```bash
curl -i -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}'
```

Expected: status 200, header `Mcp-Session-Id: <uuid>`.

Llamar a la tool con el session id devuelto:

```bash
SESSION_ID=<paste-uuid-here>
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"freematica_list_materiales_asignados_servicios","arguments":{}}}'
```

Expected: respuesta JSON-RPC con `result.content[0].text` conteniendo `items` y `count`.

- [ ] **Step 12.5: Verificar contra credenciales falsas**

Lanzar con credenciales inválidas → la tool debería devolver `{"error":"invalid_token", ...}`. Confirma que el manejo de errores funciona end-to-end.

- [ ] **Step 12.6: Si la respuesta real revela el shape de `VoContratosServMatAsignado`, refinar el tipo**

Si tras la prueba real con credenciales válidas obtenemos un sample del shape, actualizar `src/types/contratos.ts` con una interfaz tipada:

```ts
export interface VoContratosServMatAsignado {
  idreg: number;
  // ... añadir campos descubiertos
}
```

Y commit:

```bash
git add src/types/contratos.ts
git commit -m "refactor: tighten VoContratosServMatAsignado type from real API sample"
```

> Si no hay acceso al API real, dejar el tipo `Record<string, unknown>`.

---

## Task 13: Configurar CI (GitHub Actions)

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 13.1: Crear `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, development]
  pull_request:
    branches: [main, development]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

- [ ] **Step 13.2: Verificar localmente que los 4 jobs pasan**

Run en paralelo:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Expected: PASS los cuatro.

- [ ] **Step 13.3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (lint + typecheck + test + build)"
```

---

## Task 14: Escribir `README.md`

**Files:**

- Create: `README.md`

- [ ] **Step 14.1: Crear `README.md`**

````markdown
# mcp-freematica

MCP server que expone operaciones del API REST de Freemática para ser consumidas por Claude a través de Nubiia.

## Stack

- TypeScript + Node.js ≥20
- `@modelcontextprotocol/sdk` (Streamable HTTP transport)
- Express + axios + zod
- Vitest + nock para tests

## Tools expuestas

| Tool                                             | Endpoint Freemática                         | Descripción                            |
| ------------------------------------------------ | ------------------------------------------- | -------------------------------------- |
| `freematica_list_materiales_asignados_servicios` | `GET /pvss/v2/contratos-servicios-material` | Lista de material asignado a servicios |

## Configuración

Crea un archivo `.env` (o exporta las variables al entorno del proceso):

```bash
FREEMATICA_AUTH_TOKEN=<token>
FREEMATICA_AUTH_COMPANY=<company>
FREEMATICA_AUTH_ORGANIZATION=<organization>
FREEMATICA_AUTH_APP=<app>
FREEMATICA_AUTH_SESSION=<session>

# Opcionales
FREEMATICA_BASE_URL=https://api-p01.clientservicepanel.com/restsat/api
MCP_PORT=3000
MCP_ALLOWED_ORIGINS=*
```

Ver `.env.example` para la plantilla.

## Desarrollo

```bash
npm install
npm run dev        # arranca con tsx (hot reload)
npm test           # ejecuta vitest una vez
npm run test:watch # watcher
npm run lint
npm run typecheck
npm run build      # compila a dist/
npm start          # ejecuta dist/index.js
```

## Endpoints HTTP

| Método | Path      | Descripción                                          |
| ------ | --------- | ---------------------------------------------------- |
| POST   | `/mcp`    | JSON-RPC del MCP (envía `initialize` la primera vez) |
| GET    | `/mcp`    | Stream SSE (requiere `Mcp-Session-Id`)               |
| DELETE | `/mcp`    | Terminar sesión                                      |
| GET    | `/health` | Healthcheck                                          |

## Cómo añadir una nueva operación

1. **Tipar la respuesta** en `src/types/<grupo>.ts`.
2. **Añadir método** al `FreematicaClient` (`src/clients/freematica-client.ts`):
   ```ts
   getContratosServicios(): Promise<VoContratosServicios[]> {
     return this.get<VoContratosServicios[]>('/pvss/v1/contratos-servicios');
   }
   ```
3. **Añadir `server.tool(...)`** en `src/tools/<grupo>.ts` (o crear el archivo si el grupo es nuevo).
4. **Si el grupo es nuevo:** registrar `register<Grupo>Tools(server, client)` en `src/server.ts`.
5. **Tests:** un test del método del client (con nock) + un test del handler de la tool.

Patrón inspirado en `mcp-nevent` y `mcp-holded`.

## Despliegue

Pensado para ejecutarse dentro de **Nubiia**. La plataforma se encarga del deploy y de inyectar las variables de entorno. Si necesitas contenerizar:

```bash
docker build -t mcp-freematica .
docker run --env-file .env -p 3000:3000 mcp-freematica
```

## Especificaciones y diseño

- Spec: `docs/superpowers/specs/2026-05-18-freematica-mcp-design.md`
- Plan: `docs/superpowers/plans/2026-05-18-freematica-mcp.md`
- API: `apidocs/Freematica API - Complete Collection.postman_collection.json`

## Licencia

MIT — ver `LICENSE`.
````

- [ ] **Step 14.2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, endpoints, and contribution guide"
```

---

## Task 15: Validación final (pre-push)

**Files:**

- None (solo verificación)

- [ ] **Step 15.1: Lint, typecheck, test, build en serie**

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Expected: PASS los cuatro.

- [ ] **Step 15.2: Verificar coverage**

Run: `npm run test:coverage`
Expected: coverage ≥80% en `src/clients/` y `src/tools/`.

- [ ] **Step 15.3: Revisar `git status`**

Run: `git status && git log --oneline -20`
Expected: working tree limpio, todos los commits del feature en `feat/initial-mcp-server`.

- [ ] **Step 15.4: STOP — pedir aprobación al usuario para push**

> **No hacer push ni crear PR sin aprobación explícita del usuario** (regla del CLAUDE.md global).
>
> Mensaje al usuario:
>
> > "Implementación completa en la rama `feat/initial-mcp-server`. He hecho N commits. He pasado lint + typecheck + tests + build localmente. Listo para empujar a GitHub. ¿Apruebas el push?
> >
> > Antes de empujar necesito que confirmes:
> >
> > 1. Que el repo `mcp-freematica` ya existe en la organización Freemática de GitHub (vacío, sin README).
> > 2. La URL exacta del remote (`git@github.com:<org>/mcp-freematica.git` o HTTPS)."

---

## Task 16: Push y PR (sólo tras aprobación humana)

**Files:**

- None

- [ ] **Step 16.1: Añadir remote y push de `main` y `development`**

```bash
git remote add origin <URL-DEL-REPO>
git push -u origin main
git push -u origin development
```

- [ ] **Step 16.2: Push de la rama feature**

```bash
git checkout feat/initial-mcp-server
git push -u origin feat/initial-mcp-server
```

- [ ] **Step 16.3: Crear PR contra `development`**

```bash
gh pr create --base development --head feat/initial-mcp-server \
  --title "feat: bootstrap MCP server with first tool (materiales asignados)" \
  --body "$(cat <<'EOF'
## Resumen

Bootstrap del repositorio `mcp-freematica`:

- Stack: TypeScript + `@modelcontextprotocol/sdk` + Express + axios + zod.
- Transport: Streamable HTTP (para Nubiia).
- Credenciales: 5 headers `x-auth-*` inyectados desde env vars.
- Arquitectura preparada para crecer: factory `createFreematicaServer`, `BaseClient` genérico con mapeo de errores, tools agrupadas por API group del Postman.

## Tool incluida

- `freematica_list_materiales_asignados_servicios` → `GET /pvss/v2/contratos-servicios-material`

## Testing

- Vitest + nock; cobertura ≥80% en clients y tools.
- Smoke test manual end-to-end documentado en el plan.

## Documentación

- Spec: `docs/superpowers/specs/2026-05-18-freematica-mcp-design.md`
- Plan: `docs/superpowers/plans/2026-05-18-freematica-mcp.md`
- README: incluye guía paso a paso para añadir nuevas operaciones.

## Checklist

- [x] Lint
- [x] Typecheck
- [x] Tests
- [x] Build
- [x] Smoke test local
EOF
)"
```

- [ ] **Step 16.4: Mostrar URL del PR al usuario y STOP**

El humano hace el merge a `development`.

---

## Self-Review (autor del plan)

**Spec coverage check:**

| Spec section                | Cubierto en                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| §2 Operación a automatizar  | Task 5, Task 7                                                       |
| §3 Decisiones de diseño     | Task 1 (stack, deps), Task 2 (config), Task 9 (transport único HTTP) |
| §4 Arquitectura             | Tasks 4, 5, 7, 8, 9                                                  |
| §5 Estructura de archivos   | Distribuida en Tasks 1-10                                            |
| §6.1 `config.ts`            | Task 2                                                               |
| §6.2 `base-client.ts`       | Task 4 (mapeo de los 7 códigos de error incluido)                    |
| §6.3 `freematica-client.ts` | Task 5                                                               |
| §6.4 `server.ts`            | Task 8                                                               |
| §6.5 `tools/contratos.ts`   | Task 7                                                               |
| §6.6 `transports/http.ts`   | Task 9                                                               |
| §6.7 `index.ts`             | Task 10                                                              |
| §7 Data flow                | Verificado en Task 12 (smoke test)                                   |
| §8 Manejo de errores        | Tasks 4, 6, 7                                                        |
| §9 Testing                  | Tasks 2, 4, 5, 6, 7, 8                                               |
| §10 CI/CD                   | Task 13                                                              |
| §11 `package.json` stack    | Task 1                                                               |
| §12 Cómo añadir tools       | Task 14 (README)                                                     |
| §13 Out of scope            | Implícitamente respetado (no se implementa)                          |
| §14 Open questions          | Task 15.4, Task 16 (URL del remote pendiente del usuario)            |

**Placeholder scan:** ✅ Sin "TBD" / "TODO" / "fill in". Una nota honesta en Task 7.2 sobre `_registeredTools` indicando al implementador qué hacer si la SDK ha cambiado el nombre.

**Type consistency:**

- `FreematicaError` con `code: FreematicaErrorCode` — usado de forma consistente en Tasks 4, 6, 7.
- `AuthHeaders` interface — definida en Task 4, usada en Tasks 5, 10.
- `BaseClientConfig` — definido en Task 4, usado en Tasks 5, 8.
- `VoContratosServMatAsignado` — Task 3 lo define, Tasks 5 y 7 lo usan.
- `ok()` / `error()` signatures — Task 6 define, Task 7 usa.
- `CreateFreematicaServerOptions` — Task 8 define, Task 9 usa.

Todo coherente.

**Git workflow check:** Cumple las normas del CLAUDE.md global:

- No se trabaja en `main` (sólo el commit inicial `chore:`).
- Branch `development` creada antes de empezar features.
- Feature branch `feat/initial-mcp-server` desde development.
- Push y PR requieren aprobación humana explícita (Task 15.4 → Task 16).
- Sin co-authored-by ni referencias a Claude.
- Commits siguen formato convencional (`feat:`, `chore:`, `ci:`, `docs:`).
