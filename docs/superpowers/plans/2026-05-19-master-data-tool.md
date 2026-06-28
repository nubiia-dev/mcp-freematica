# Master Data Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir una nueva MCP tool `freematica_get_master_data` que expone 19 catálogos de datos maestros del API de Freemática (tipos, geográficos, organizativos, inventario) a través de un único enum `catalog`.

**Architecture:** Schema central `src/schemas/master-data.ts` con el enum `MASTER_DATA_CATALOGS` y el record `CATALOG_ENDPOINTS` como única fuente de verdad. Método nuevo `FreematicaClient.getMasterData(catalog)` que resuelve el endpoint vía el record. Nuevo archivo `src/tools/master-data.ts` con `registerMasterDataTools(server, client)` invocado desde `src/server.ts`. Sin paginación, sin filtros. Tipo de items `Record<string, unknown>[]` (igual que la tool existente).

**Tech Stack:** TypeScript 5.3, Node ≥20, `@modelcontextprotocol/sdk` ^1.27.1, zod, vitest, nock.

**Spec:** `docs/superpowers/specs/2026-05-19-master-data-tool-design.md`
**Branch:** `feat/master-data-tool` (ya creada desde main, ya contiene el commit `cc943da` de la spec)

---

## File Structure

| Path                                      | Cambio | Responsabilidad                                                                                                                |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/schemas/master-data.ts`              | Create | `MASTER_DATA_CATALOGS` const tuple, `MasterDataCatalog` type, `MasterDataCatalogSchema` (Zod enum), `CATALOG_ENDPOINTS` record |
| `src/types/master-data.ts`                | Create | `MasterDataItem` = `Record<string, unknown>`                                                                                   |
| `src/clients/freematica-client.ts`        | Modify | Añadir método `getMasterData(catalog)`                                                                                         |
| `src/tools/master-data.ts`                | Create | `registerMasterDataTools(server, client)` con `freematica_get_master_data`                                                     |
| `src/server.ts`                           | Modify | Invocar `registerMasterDataTools(server, opts.client)`                                                                         |
| `src/server-instructions.ts`              | Modify | Añadir bloque "Master data" al texto de instrucciones                                                                          |
| `src/transports/http.ts`                  | Modify | Bump version 0.2.0 → 0.3.0 en `/health`                                                                                        |
| `tests/schemas/master-data.test.ts`       | Create | Guard: cada catálogo del enum tiene endpoint mapeado                                                                           |
| `tests/clients/freematica-client.test.ts` | Modify | Añadir `describe('getMasterData', ...)` con 2 tests                                                                            |
| `tests/tools/master-data.test.ts`         | Create | 3 tests (registration, success, error)                                                                                         |
| `package.json`                            | Modify | Bump version 0.2.0 → 0.3.0                                                                                                     |
| `README.md`                               | Modify | Tabla "Tools expuestas" + sección "Datos maestros disponibles"                                                                 |
| `CHANGELOG.md`                            | Modify | Entrada `[0.3.0] — 2026-05-19`                                                                                                 |

---

## Task 1: Schema y mapeo de catálogos (TDD ligero — guard test)

**Files:**

- Create: `src/schemas/master-data.ts`
- Create: `tests/schemas/master-data.test.ts`

- [ ] **Step 1.1: Verificar punto de partida**

```bash
cd /Users/samu/workspace/mcp-freematica
git status
git branch --show-current
npm test
```

Expected: working tree clean (excepto untracked plan), branch `feat/master-data-tool`, 37/37 tests passing.

Si el working tree tiene cambios no relacionados, STOP y reportar.

- [ ] **Step 1.2: Escribir test guard que falla**

`tests/schemas/master-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  MASTER_DATA_CATALOGS,
  CATALOG_ENDPOINTS,
  MasterDataCatalogSchema,
} from '../../src/schemas/master-data.js';

describe('MASTER_DATA_CATALOGS', () => {
  it('includes the 19 expected catalogs in stable order', () => {
    expect(MASTER_DATA_CATALOGS).toEqual([
      'tipos-contrato',
      'tipo-instalacion',
      'clases-servicios',
      'tipos-casos',
      'subtipos-casos',
      'tipos-oportunidad-negocio',
      'tipos-impuestos',
      'tipos-marcajes',
      'naturalezas-abono',
      'paises',
      'nacionalidades',
      'provincias',
      'poblaciones',
      'empresas',
      'delegaciones',
      'lineas-negocio',
      'cargos-clientes',
      'familias',
      'subfamilias',
    ]);
    expect(MASTER_DATA_CATALOGS).toHaveLength(19);
  });
});

describe('CATALOG_ENDPOINTS', () => {
  it('has an endpoint mapping for every catalog in the enum', () => {
    for (const catalog of MASTER_DATA_CATALOGS) {
      expect(CATALOG_ENDPOINTS[catalog]).toBeDefined();
      expect(CATALOG_ENDPOINTS[catalog]).toMatch(/^\/[a-z]/);
    }
  });

  it('maps tipos-contrato to /ppre/v2/tipos-contrato', () => {
    expect(CATALOG_ENDPOINTS['tipos-contrato']).toBe('/ppre/v2/tipos-contrato');
  });

  it('maps clases-servicios to /pvss/v1/clases-servicios', () => {
    expect(CATALOG_ENDPOINTS['clases-servicios']).toBe('/pvss/v1/clases-servicios');
  });

  it('maps delegaciones to /pgrl/v2/delegaciones (v2, not v1)', () => {
    expect(CATALOG_ENDPOINTS['delegaciones']).toBe('/pgrl/v2/delegaciones');
  });

  it('maps poblaciones to /pgrl/v2/poblaciones', () => {
    expect(CATALOG_ENDPOINTS['poblaciones']).toBe('/pgrl/v2/poblaciones');
  });
});

describe('MasterDataCatalogSchema', () => {
  it('accepts every catalog value', () => {
    for (const catalog of MASTER_DATA_CATALOGS) {
      expect(() => MasterDataCatalogSchema.parse(catalog)).not.toThrow();
    }
  });

  it('rejects unknown catalogs', () => {
    expect(() => MasterDataCatalogSchema.parse('not-a-catalog')).toThrow();
  });
});
```

- [ ] **Step 1.3: Verificar que falla**

```bash
npm test -- tests/schemas/master-data.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 1.4: Crear `src/schemas/master-data.ts`**

```ts
import { z } from 'zod';

export const MASTER_DATA_CATALOGS = [
  'tipos-contrato',
  'tipo-instalacion',
  'clases-servicios',
  'tipos-casos',
  'subtipos-casos',
  'tipos-oportunidad-negocio',
  'tipos-impuestos',
  'tipos-marcajes',
  'naturalezas-abono',
  'paises',
  'nacionalidades',
  'provincias',
  'poblaciones',
  'empresas',
  'delegaciones',
  'lineas-negocio',
  'cargos-clientes',
  'familias',
  'subfamilias',
] as const;

export type MasterDataCatalog = (typeof MASTER_DATA_CATALOGS)[number];

export const MasterDataCatalogSchema = z.enum(MASTER_DATA_CATALOGS);

export const CATALOG_ENDPOINTS: Record<MasterDataCatalog, string> = {
  'tipos-contrato': '/ppre/v2/tipos-contrato',
  'tipo-instalacion': '/ppre/v1/tipo-instalacion',
  'clases-servicios': '/pvss/v1/clases-servicios',
  'tipos-casos': '/pcrm/v2/tipos-casos',
  'subtipos-casos': '/pcrm/v2/subtipos-casos',
  'tipos-oportunidad-negocio': '/pcrm/v2/tipos-oportunidad-negocio',
  'tipos-impuestos': '/pgrl/v2/tipos-impuestos',
  'tipos-marcajes': '/pkai/v1/tiposmarcajes',
  'naturalezas-abono': '/pven/v1/naturalezas-abono',
  paises: '/pgrl/v1/paises',
  nacionalidades: '/pgrl/v1/nacionalidades',
  provincias: '/pgrl/v1/provincias',
  poblaciones: '/pgrl/v2/poblaciones',
  empresas: '/pgrl/v1/empresas',
  delegaciones: '/pgrl/v2/delegaciones',
  'lineas-negocio': '/pgrl/v2/lineas-negocio',
  'cargos-clientes': '/pgrl/v2/cargos-clientes',
  familias: '/part/v1/familias',
  subfamilias: '/part/v1/subfamilias',
};
```

- [ ] **Step 1.5: Verificar que pasa**

```bash
npm test -- tests/schemas/master-data.test.ts
npm test          # full suite
npm run typecheck
```

Expected: PASS (8 tests en el archivo nuevo); full suite ≥ 45 tests passing.

- [ ] **Step 1.6: Commit**

```bash
git add src/schemas/master-data.ts tests/schemas/master-data.test.ts
git commit -m "feat: add master data catalogs enum and endpoint mapping"
```

---

## Task 2: Tipo placeholder

**Files:**

- Create: `src/types/master-data.ts`

- [ ] **Step 2.1: Crear el archivo**

```ts
/**
 * Item de un catálogo de datos maestros de Freemática.
 *
 * El shape exacto varía por catálogo (algunos exponen `{ idreg, codigo, nombre }`,
 * otros tienen campos específicos). Se mantiene como `Record<string, unknown>`
 * hasta que se vean respuestas reales y se decida si tiparlos por catálogo o
 * con un shape común mínimo.
 */
export type MasterDataItem = Record<string, unknown>;
```

- [ ] **Step 2.2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2.3: Commit**

```bash
git add src/types/master-data.ts
git commit -m "feat: add MasterDataItem type alias"
```

---

## Task 3: Método `getMasterData` en `FreematicaClient` (TDD)

**Files:**

- Modify: `src/clients/freematica-client.ts`
- Modify: `tests/clients/freematica-client.test.ts`

- [ ] **Step 3.1: Añadir tests al final del archivo existente**

Abrir `tests/clients/freematica-client.test.ts` y, **dentro del `describe('FreematicaClient', ...)`** ya existente, justo antes del cierre de ese describe, insertar:

```ts
describe('getMasterData', () => {
  it('calls the endpoint mapped for the requested catalog and returns the array', async () => {
    const fakeData = [
      { idreg: 1, nombre: 'España' },
      { idreg: 2, nombre: 'Francia' },
    ];
    const scope = nock(BASE_URL).get('/pgrl/v1/paises').reply(200, fakeData);

    const result = await client.getMasterData('paises');

    expect(result).toEqual(fakeData);
    expect(scope.isDone()).toBe(true);
  });

  it('propagates FreematicaError on 401', async () => {
    nock(BASE_URL).get('/pgrl/v1/paises').reply(401);
    await expect(client.getMasterData('paises')).rejects.toMatchObject({
      code: 'invalid_token',
    });
  });
});
```

- [ ] **Step 3.2: Verificar que falla**

```bash
npm test -- tests/clients/freematica-client.test.ts
```

Expected: FAIL (`client.getMasterData is not a function`).

- [ ] **Step 3.3: Añadir el método al cliente**

Abrir `src/clients/freematica-client.ts`. El archivo actual tiene esta estructura:

```ts
import { BaseClient } from './base-client.js';
import type { VoContratosServMatAsignado } from '../types/contratos.js';

export class FreematicaClient extends BaseClient {
  getMaterialesAsignadosServicios(): Promise<VoContratosServMatAsignado[]> {
    return this.get<VoContratosServMatAsignado[]>('/pvss/v2/contratos-servicios-material');
  }
}
```

Reemplazar el archivo entero por:

```ts
import { BaseClient } from './base-client.js';
import type { VoContratosServMatAsignado } from '../types/contratos.js';
import { CATALOG_ENDPOINTS, type MasterDataCatalog } from '../schemas/master-data.js';
import type { MasterDataItem } from '../types/master-data.js';

/**
 * Typed client for the Freemática REST API.
 *
 * One method per exposed endpoint (or per family of endpoints). Add a new
 * method when a new Postman operation gets wrapped into an MCP tool.
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

  /**
   * Obtener un catálogo de datos maestros.
   *
   * Resuelve el endpoint via `CATALOG_ENDPOINTS[catalog]`. Para añadir un
   * catálogo nuevo basta con extender el enum y el record en
   * `src/schemas/master-data.ts`.
   */
  getMasterData(catalog: MasterDataCatalog): Promise<MasterDataItem[]> {
    const endpoint = CATALOG_ENDPOINTS[catalog];
    return this.get<MasterDataItem[]>(endpoint);
  }
}
```

- [ ] **Step 3.4: Verificar que pasa**

```bash
npm test -- tests/clients/freematica-client.test.ts
npm test          # full suite
npm run typecheck
```

Expected: PASS. Tests en este archivo: 5 (3 anteriores + 2 nuevos). Full suite: ≥47 tests.

- [ ] **Step 3.5: Commit**

```bash
git add src/clients/freematica-client.ts tests/clients/freematica-client.test.ts
git commit -m "feat: add FreematicaClient.getMasterData(catalog) method"
```

---

## Task 4: Tool `freematica_get_master_data` (TDD)

**Files:**

- Create: `src/tools/master-data.ts`
- Create: `tests/tools/master-data.test.ts`

- [ ] **Step 4.1: Escribir tests que fallan**

`tests/tools/master-data.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerMasterDataTools } from '../../src/tools/master-data.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const TOOL_NAME = 'freematica_get_master_data';

function buildServer(): { server: McpServer; client: FreematicaClient } {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerMasterDataTools(server, client);
  return { server, client };
}

interface ToolHandler {
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
}

function getHandler(server: McpServer): (args: Record<string, unknown>) => Promise<unknown> {
  const tools = (server as unknown as { _registeredTools: Record<string, ToolHandler> })
    ._registeredTools;
  const tool = tools[TOOL_NAME];
  if (!tool) throw new Error(`Tool not registered: ${TOOL_NAME}`);
  const fn = tool.handler ?? tool.callback;
  if (!fn) throw new Error(`Tool has no handler/callback: ${TOOL_NAME}`);
  return fn;
}

describe('registerMasterDataTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers the freematica_get_master_data tool', () => {
    const { server } = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty(TOOL_NAME);
  });

  it('handler returns ok() with catalog, items, count on success', async () => {
    const fakeData = [
      { idreg: 1, nombre: 'España' },
      { idreg: 2, nombre: 'Francia' },
    ];
    nock(BASE_URL).get('/pgrl/v1/paises').reply(200, fakeData);

    const { server } = buildServer();
    const handler = getHandler(server);

    const result = (await handler({ catalog: 'paises' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({ catalog: 'paises', items: fakeData, count: 2 });
  });

  it('handler returns error() on API failure', async () => {
    nock(BASE_URL).get('/pgrl/v1/paises').reply(401);

    const { server } = buildServer();
    const handler = getHandler(server);

    const result = (await handler({ catalog: 'paises' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('invalid_token');
  });
});
```

> **Note:** the helper `getHandler` accepts both `tool.callback` (some SDK versions) and `tool.handler` (1.27.x) — this mirrors what the existing `tests/tools/contratos.test.ts` learned at implementation time. If your installed SDK version exposes neither, inspect `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js` and adjust accordingly.

- [ ] **Step 4.2: Verificar que falla**

```bash
npm test -- tests/tools/master-data.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 4.3: Implementar `src/tools/master-data.ts`**

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { MASTER_DATA_CATALOGS, MasterDataCatalogSchema } from '../schemas/master-data.js';
import { error, ok } from './helpers.js';

const TOOL_NAME = 'freematica_get_master_data';

const CATALOG_DESCRIPTIONS = [
  'tipos-contrato (tipos de contrato comercial)',
  'tipo-instalacion (tipos de instalación física)',
  'clases-servicios (clases de servicio operativas)',
  'tipos-casos (CRM)',
  'subtipos-casos (CRM)',
  'tipos-oportunidad-negocio (CRM)',
  'tipos-impuestos (IVA, IRPF, retenciones)',
  'tipos-marcajes (presencia / jornada)',
  'naturalezas-abono',
  'paises',
  'nacionalidades',
  'provincias',
  'poblaciones (municipios)',
  'empresas',
  'delegaciones',
  'lineas-negocio',
  'cargos-clientes (puestos de contactos)',
  'familias (de artículos)',
  'subfamilias',
].join(', ');

const TOOL_DESCRIPTION = [
  'Devuelve un catálogo de datos maestros de Freemática (tipos, geográficos, organizativos, inventario).',
  '',
  `Catálogos disponibles (${MASTER_DATA_CATALOGS.length}): ${CATALOG_DESCRIPTIONS}.`,
  '',
  'Útil para traducir códigos crípticos en respuestas de otras tools (por ejemplo, los IDs de tipo de contrato o clase de servicio que aparecen en freematica_list_materiales_asignados_servicios).',
  '',
  'La respuesta es un objeto con tres campos:',
  '  - catalog: el catálogo solicitado (echo del input)',
  '  - items: array de objetos con los registros del catálogo',
  '  - count: número total de elementos',
].join('\n');

/**
 * Registra la tool freematica_get_master_data sobre el McpServer.
 *
 * Una sola tool expone los 19 catálogos vía un enum `catalog`. Añadir nuevos
 * catálogos requiere actualizar `src/schemas/master-data.ts` (enum + record),
 * no este archivo.
 */
export function registerMasterDataTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    TOOL_NAME,
    TOOL_DESCRIPTION,
    {
      catalog: MasterDataCatalogSchema.describe(
        `Catálogo a consultar. Valores válidos: ${CATALOG_DESCRIPTIONS}.`,
      ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ catalog }) => {
      try {
        const items = await client.getMasterData(catalog);
        return ok({ catalog, items, count: items.length });
      } catch (err) {
        if (err instanceof FreematicaError) return error(err);
        return error(err instanceof Error ? err : new Error(String(err)));
      }
    },
  );
}
```

> **Note for implementer:** the `server.tool()` callback signature in SDK 1.27.x may require casting the return value to `CallToolResult` (see what `src/tools/contratos.ts` did in v0.1.0). If TypeScript errors arise, add the same cast pattern used there.

- [ ] **Step 4.4: Verificar que pasa**

```bash
npm test -- tests/tools/master-data.test.ts
npm test          # full suite
npm run typecheck
```

Expected: PASS (3 tests new). Full suite: ≥50 tests.

- [ ] **Step 4.5: Commit**

```bash
git add src/tools/master-data.ts tests/tools/master-data.test.ts
git commit -m "feat: add freematica_get_master_data tool"
```

---

## Task 5: Wire the tool into `createFreematicaServer`

**Files:**

- Modify: `src/server.ts`

- [ ] **Step 5.1: Modificar `src/server.ts`**

El archivo actual:

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from './clients/freematica-client.js';
import { FREEMATICA_MCP_INSTRUCTIONS } from './server-instructions.js';
import { registerContratosTools } from './tools/contratos.js';

export interface CreateFreematicaServerOptions {
  client: FreematicaClient;
}

export function createFreematicaServer(opts: CreateFreematicaServerOptions): McpServer {
  const server = new McpServer(
    { name: 'freematica-mcp', version: '0.2.0' },
    { instructions: FREEMATICA_MCP_INSTRUCTIONS },
  );

  registerContratosTools(server, opts.client);

  return server;
}
```

Cámbialo a:

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from './clients/freematica-client.js';
import { FREEMATICA_MCP_INSTRUCTIONS } from './server-instructions.js';
import { registerContratosTools } from './tools/contratos.js';
import { registerMasterDataTools } from './tools/master-data.js';

export interface CreateFreematicaServerOptions {
  client: FreematicaClient;
}

export function createFreematicaServer(opts: CreateFreematicaServerOptions): McpServer {
  const server = new McpServer(
    { name: 'freematica-mcp', version: '0.3.0' },
    { instructions: FREEMATICA_MCP_INSTRUCTIONS },
  );

  registerContratosTools(server, opts.client);
  registerMasterDataTools(server, opts.client);

  return server;
}
```

(Dos cambios: `version: '0.2.0'` → `'0.3.0'` y la nueva línea `registerMasterDataTools`.)

- [ ] **Step 5.2: Verificar que el test del server existente sigue pasando**

`tests/server.test.ts` verifica que `freematica_list_materiales_asignados_servicios` está registrada. Después del cambio debe seguir pasando, y opcionalmente añadiremos otra aserción en Task 6.

```bash
npm test
npm run typecheck
```

Expected: PASS. Full suite todavía ≥50 tests.

- [ ] **Step 5.3: Commit**

```bash
git add src/server.ts
git commit -m "feat: wire master data tool into createFreematicaServer"
```

---

## Task 6: Reforzar el test del server factory

**Files:**

- Modify: `tests/server.test.ts`

- [ ] **Step 6.1: Añadir test para la nueva tool**

Abrir `tests/server.test.ts`. El archivo actual:

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

Reemplazarlo por:

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

describe('createFreematicaServer', () => {
  it('registers the contratos tool', () => {
    const server = createFreematicaServer({ client: TEST_CLIENT });
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty('freematica_list_materiales_asignados_servicios');
  });

  it('registers the master data tool', () => {
    const server = createFreematicaServer({ client: TEST_CLIENT });
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty('freematica_get_master_data');
  });
});
```

- [ ] **Step 6.2: Verificar que pasa**

```bash
npm test -- tests/server.test.ts
npm test          # full suite
```

Expected: 2 tests en `server.test.ts`. Full suite: ≥51 tests.

- [ ] **Step 6.3: Commit**

```bash
git add tests/server.test.ts
git commit -m "test: assert master data tool is registered by the server factory"
```

---

## Task 7: Actualizar `server-instructions.ts`

**Files:**

- Modify: `src/server-instructions.ts`

- [ ] **Step 7.1: Reescribir el bloque de instrucciones**

Abrir `src/server-instructions.ts`. Actualmente exporta una constante `FREEMATICA_MCP_INSTRUCTIONS` con tablas de tools y de errores.

Localiza la línea que enumera las "Tools disponibles" y reemplaza ese bloque para que incluya la nueva tool. La versión final del archivo debe ser:

```ts
export const FREEMATICA_MCP_INSTRUCTIONS = `
# Freemática MCP

Este servidor expone operaciones del API REST de Freemática como tools MCP.

## Tools disponibles

- **freematica_list_materiales_asignados_servicios** — Devuelve la lista de
  material asignado a servicios (sin parámetros). Devuelve un objeto
  { items: VoContratosServMatAsignado[], count: number }.

- **freematica_get_master_data** — Devuelve un catálogo de datos maestros.
  Parámetro \`catalog\` (enum): tipos-contrato, tipo-instalacion, clases-servicios,
  tipos-casos, subtipos-casos, tipos-oportunidad-negocio, tipos-impuestos,
  tipos-marcajes, naturalezas-abono, paises, nacionalidades, provincias,
  poblaciones, empresas, delegaciones, lineas-negocio, cargos-clientes,
  familias, subfamilias. Devuelve { catalog, items, count }.

  Patrón típico: cuando una respuesta de otra tool contenga IDs de tipo de
  contrato o clase de servicio, llamar primero a freematica_get_master_data
  con el catálogo correspondiente para mapear esos IDs a nombres humanos.

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

- [ ] **Step 7.2: Typecheck y test**

```bash
npm run typecheck
npm test
```

Expected: PASS. Full suite igual número que antes.

- [ ] **Step 7.3: Commit**

```bash
git add src/server-instructions.ts
git commit -m "docs: extend server instructions with master data tool"
```

---

## Task 8: Bump version en package.json + /health endpoint

**Files:**

- Modify: `package.json`
- Modify: `src/transports/http.ts`

- [ ] **Step 8.1: Bump version en `package.json`**

Cambiar:

```json
"version": "0.2.0",
```

por:

```json
"version": "0.3.0",
```

Después:

```bash
npm install
```

Expected: actualiza solo la entrada raíz del lockfile.

- [ ] **Step 8.2: Bump version en `/health`**

`src/transports/http.ts` tiene una línea (alrededor del handler `GET /health`) con:

```ts
res.json({ status: 'ok', version: '0.2.0', sessions: sessions.size });
```

Cambiarla a:

```ts
res.json({ status: 'ok', version: '0.3.0', sessions: sessions.size });
```

Y en `src/index.ts`, donde el log de stdio dice `Starting stdio transport v0.2.0`, cambiarlo a:

```ts
`[freematica-mcp] Starting stdio transport v0.3.0 | base=${auth.FREEMATICA_BASE_URL}`,
```

(Buscar `v0.2.0` por todo `src/` para no perder ningún literal.)

```bash
grep -rn "v0.2.0\|0\.2\.0" src/ | grep -v dist
```

Expected: ver las 3 líneas (server.ts ya cambiado en Task 5, http.ts y index.ts ahora). Si server.ts aún muestra '0.2.0' hay un error en Task 5 — corregir.

- [ ] **Step 8.3: Validar todo el stack**

```bash
npm run lint && npm run typecheck && npm run build && npm test
```

Expected: PASS los 4.

- [ ] **Step 8.4: Commit**

```bash
git add package.json package-lock.json src/transports/http.ts src/index.ts
git commit -m "chore: bump version to 0.3.0"
```

---

## Task 9: README + CHANGELOG

**Files:**

- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 9.1: Añadir tool a la tabla "Tools expuestas" en README**

Localizar en `README.md` la tabla:

```md
| Tool                                             | Endpoint Freemática                         | Descripción                            |
| ------------------------------------------------ | ------------------------------------------- | -------------------------------------- |
| `freematica_list_materiales_asignados_servicios` | `GET /pvss/v2/contratos-servicios-material` | Lista de material asignado a servicios |
```

Añadir una fila debajo:

```md
| `freematica_get_master_data` | (19 endpoints según `catalog`) | Devuelve un catálogo de datos maestros (tipos, geográficos, organizativos, inventario) |
```

- [ ] **Step 9.2: Añadir sección "Datos maestros disponibles" después de "Modos de transporte" y antes de "Configuración"**

```md
## Datos maestros disponibles

La tool `freematica_get_master_data` acepta un parámetro `catalog` con uno de los 19 valores siguientes. Cada uno mapea a un endpoint específico de Freemática.

| `catalog`                   | Endpoint Freemática                      | Contenido                      |
| --------------------------- | ---------------------------------------- | ------------------------------ |
| **Tipos / clasificaciones** |                                          |                                |
| `tipos-contrato`            | `GET /ppre/v2/tipos-contrato`            | Tipos de contrato comercial    |
| `tipo-instalacion`          | `GET /ppre/v1/tipo-instalacion`          | Tipos de instalación física    |
| `clases-servicios`          | `GET /pvss/v1/clases-servicios`          | Clases de servicio operativas  |
| `tipos-casos`               | `GET /pcrm/v2/tipos-casos`               | Tipos de caso CRM              |
| `subtipos-casos`            | `GET /pcrm/v2/subtipos-casos`            | Subtipos de caso CRM           |
| `tipos-oportunidad-negocio` | `GET /pcrm/v2/tipos-oportunidad-negocio` | Tipos de oportunidad comercial |
| `tipos-impuestos`           | `GET /pgrl/v2/tipos-impuestos`           | IVA, IRPF, retenciones         |
| `tipos-marcajes`            | `GET /pkai/v1/tiposmarcajes`             | Tipos de marcaje               |
| `naturalezas-abono`         | `GET /pven/v1/naturalezas-abono`         | Naturalezas de abono comercial |
| **Geográficos**             |                                          |                                |
| `paises`                    | `GET /pgrl/v1/paises`                    | Países                         |
| `nacionalidades`            | `GET /pgrl/v1/nacionalidades`            | Nacionalidades                 |
| `provincias`                | `GET /pgrl/v1/provincias`                | Provincias                     |
| `poblaciones`               | `GET /pgrl/v2/poblaciones`               | Municipios                     |
| **Organizativos**           |                                          |                                |
| `empresas`                  | `GET /pgrl/v1/empresas`                  | Empresas                       |
| `delegaciones`              | `GET /pgrl/v2/delegaciones`              | Delegaciones                   |
| `lineas-negocio`            | `GET /pgrl/v2/lineas-negocio`            | Líneas de negocio              |
| `cargos-clientes`           | `GET /pgrl/v2/cargos-clientes`           | Cargos de contactos            |
| **Inventario**              |                                          |                                |
| `familias`                  | `GET /part/v1/familias`                  | Familias de artículos          |
| `subfamilias`               | `GET /part/v1/subfamilias`               | Subfamilias                    |

Respuesta: `{ catalog, items, count }`. Patrón típico de uso: llamar primero al catálogo correspondiente cuando otra tool devuelva IDs crípticos para resolverlos a nombres humanos.
```

- [ ] **Step 9.3: Actualizar referencia de versión en "Verificación de la configuración"**

Localizar la línea:

```md
2. **Con env vars válidas (modo HTTP)** — arranca con `MCP_TRANSPORT=http` y el proceso queda escuchando; `/health` devuelve `{ "status": "ok", "version": "0.2.0", "sessions": 0 }`:
```

Cambiar `0.2.0` por `0.3.0`.

- [ ] **Step 9.4: Añadir referencia a la spec/plan v0.3.0 en "Especificaciones y diseño"**

Al final de la sección "Especificaciones y diseño" del README, añadir:

```md
- v0.3.0 spec: `docs/superpowers/specs/2026-05-19-master-data-tool-design.md` (master data tool)
- v0.3.0 plan: `docs/superpowers/plans/2026-05-19-master-data-tool.md`
```

- [ ] **Step 9.5: Añadir entrada al `CHANGELOG.md`**

Insertar como primera entrada (antes de `[0.2.0]`):

```md
## [0.3.0] — 2026-05-19

### Added

- Nueva tool `freematica_get_master_data` que expone 19 catálogos de datos maestros del API de Freemática (tipos, geográficos, organizativos, inventario) a través de un único enum `catalog`.
- `src/schemas/master-data.ts` con `MASTER_DATA_CATALOGS` (enum de 19 valores) y `CATALOG_ENDPOINTS` (mapeo a endpoints REST). Una sola fuente de verdad para añadir catálogos futuros.
- `FreematicaClient.getMasterData(catalog)` que resuelve el endpoint via el record.
- Sección "Datos maestros disponibles" en README con la tabla catálogo → endpoint.

### Changed

- `createFreematicaServer` ahora registra dos tools (la existente + la nueva).
- `server-instructions.ts` ampliado con la nueva tool y un patrón de uso (resolver IDs crípticos a nombres humanos).
- Version reportada en `/health` y en el `serverInfo` MCP actualizada a `0.3.0`.
```

- [ ] **Step 9.6: Validar todo**

```bash
npm run lint && npm run typecheck && npm run build && npm test
```

Expected: PASS los 4.

- [ ] **Step 9.7: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: document master data tool in README and CHANGELOG (v0.3.0)"
```

---

## Task 10: PR + merge + tag v0.3.0 (requiere aprobación humana)

**Files:** ninguno (solo git/gh)

- [ ] **Step 10.1: STOP — presentar resumen al usuario para aprobación de push**

> "Implementación completa en `feat/master-data-tool`. Lint + typecheck + build + tests OK localmente (≥51 tests pasando). Plan:
>
> 1. Push branch.
> 2. PR a `development`, esperar CI verde, squash-merge.
> 3. PR `development` → `main`, esperar CI verde, merge.
> 4. Tag `v0.3.0` + push → dispara `publish.yml`.
> 5. Verificar publicación.
>
> ¿Apruebo todo el flujo?"

**WAIT for explicit user approval before continuing.**

- [ ] **Step 10.2: Push feature branch**

```bash
git push -u origin feat/master-data-tool
```

- [ ] **Step 10.3: PR contra development**

```bash
gh pr create --base development --head feat/master-data-tool \
  --title "feat: add master data tool (v0.3.0)" \
  --body "$(cat <<'EOF'
## Resumen

Añade `freematica_get_master_data` para exponer 19 catálogos de datos maestros del API de Freemática a través de un único parámetro `catalog` (enum).

## Cambios

- `src/schemas/master-data.ts`: `MASTER_DATA_CATALOGS` + `CATALOG_ENDPOINTS` como fuente única de verdad.
- `src/clients/freematica-client.ts`: método nuevo `getMasterData(catalog)`.
- `src/tools/master-data.ts`: tool nueva `registerMasterDataTools(server, client)`.
- `src/server.ts`: invoca el registro y bump a v0.3.0.
- `src/server-instructions.ts`: amplía con la nueva tool y patrón de uso.
- `src/transports/http.ts` + `src/index.ts`: bump version literal.
- Tests: 8 nuevos en `tests/schemas/master-data.test.ts`, 2 en `freematica-client.test.ts`, 3 en `tests/tools/master-data.test.ts`, 1 reforzado en `server.test.ts`.
- README + CHANGELOG.

## Catálogos incluidos

Tipos/clasificaciones (9), Geográficos (4), Organizativos (4), Inventario (2). Excluidos catálogos operativos y financieros por decisión de producto.

## Validación local

- lint, typecheck, build: clean
- ≥51/51 tests OK

## Spec / Plan

- Spec: docs/superpowers/specs/2026-05-19-master-data-tool-design.md
- Plan: docs/superpowers/plans/2026-05-19-master-data-tool.md
EOF
)"
```

- [ ] **Step 10.4: Esperar CI y mergear**

```bash
until gh pr view --json statusCheckRollup --jq '.statusCheckRollup[0].status' 2>/dev/null | grep -q COMPLETED; do sleep 5; done
gh pr view --json statusCheckRollup --jq '.statusCheckRollup[0].conclusion'   # debe ser "SUCCESS"
gh pr merge --squash --delete-branch
```

- [ ] **Step 10.5: PR development → main**

```bash
git checkout development && git pull
gh pr create --base main --head development \
  --title "release: v0.3.0 — master data tool" \
  --body "Lanza v0.3.0 a producción. Detalles en CHANGELOG.md y en el PR a development."
```

- [ ] **Step 10.6: Esperar CI y mergear**

```bash
until gh pr view --json statusCheckRollup --jq '.statusCheckRollup[0].status' 2>/dev/null | grep -q COMPLETED; do sleep 5; done
gh pr merge --merge --delete-branch=false
```

- [ ] **Step 10.7: Tag y push (dispara publish)**

```bash
git checkout main && git pull
git tag v0.3.0
git push origin v0.3.0
```

- [ ] **Step 10.8: Verificar publicación**

```bash
until gh run list --workflow=publish.yml --limit 1 --json status --jq '.[0].status' 2>/dev/null | grep -q completed; do sleep 5; done
gh run list --workflow=publish.yml --limit 1 --json conclusion --jq '.[0].conclusion'   # debe ser "success"
```

Si la conclusión es `success`, `@nubiia/mcp-freematica@0.3.0` ya está disponible en GitHub Packages.

---

## Self-Review (autor del plan)

**Spec coverage:**

| Spec section                | Cubierto en                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------- |
| §2 Goals                    | Tasks 1-7                                                                          |
| §3 Non-goals                | Respetado (operativos/financieros excluidos; sin paginación, cache, tipado fuerte) |
| §4 Catálogos incluidos      | Task 1 (enum + record)                                                             |
| §5 Decisiones de diseño     | Tasks 1 (record único), 4 (one tool with enum), 5 (factory wire), 8 (version)      |
| §6 Estructura de archivos   | Distribuida en Tasks 1-9                                                           |
| §7.1 schemas/master-data.ts | Task 1                                                                             |
| §7.2 types/master-data.ts   | Task 2                                                                             |
| §7.3 freematica-client      | Task 3                                                                             |
| §7.4 tools/master-data      | Task 4                                                                             |
| §7.5 server.ts              | Task 5                                                                             |
| §7.6 server-instructions    | Task 7                                                                             |
| §8 Data flow                | Verificado en Task 4 (tests)                                                       |
| §9 Manejo de errores        | Task 4 (try/catch en handler)                                                      |
| §10 Testing                 | Tasks 1 (schema guard), 3 (client), 4 (tool), 6 (server factory)                   |
| §11 README                  | Task 9                                                                             |
| §12 Version                 | Tasks 5 (server.ts), 8 (package.json + http + index)                               |
| §13 Open questions          | Out of scope; no requieren task                                                    |

**Placeholder scan:** ✅ Sin "TBD" / "TODO" / "implement later". Notas para el implementador sobre `tool.callback` vs `tool.handler` y posible cast a `CallToolResult` son guías concretas con referencias a archivos existentes, no placeholders.

**Type consistency:**

- `MasterDataCatalog` (Task 1) usado en Tasks 3, 4.
- `MasterDataItem` (Task 2) usado en Task 3.
- `MASTER_DATA_CATALOGS`, `CATALOG_ENDPOINTS`, `MasterDataCatalogSchema` (Task 1) consistentes en Tasks 3, 4.
- `registerMasterDataTools` (Task 4) invocado en Task 5.
- `getMasterData` (Task 3) invocado en Task 4.

**Git workflow:** Cumple las normas globales — branch desde `main` (ya creada), push y PR requieren aprobación humana (Task 10.1), sin co-authored-by ni referencias a Claude/AI, commits convencionales.
