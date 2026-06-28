# Commercial Tools v0.4.0 — Design Spec

- **Date:** 2026-05-20
- **Author:** Samuel Fraga
- **Status:** Approved, ready for implementation
- **Repo:** `nubiia-dev/mcp-freematica`
- **Target version:** `0.4.0`
- **Predecessors:** v0.3.1 (`docs/superpowers/specs/2026-05-19-master-data-tool-design.md`).

---

## 1. Context

Hasta v0.3.1, el MCP expone dos tools (`freematica_list_materiales_asignados_servicios`, `freematica_get_master_data`). Durante el testing empírico contra el API real de Freemática para diseñar v0.4.0, se descubrieron **tres hallazgos críticos**:

1. **Bug del unwrap**: el API REST envuelve todas las respuestas en `{ errorCode, errorMessage, data }`. El `BaseClient` actual devuelve este wrapper completo en vez de `data`. Las tools existentes han estado retornando basura silenciosamente — Nubiia no las ha consumido en producción.
2. **Paginación contra-intuitiva**: `page=0` significa "devuelve TODO el dataset" (2 MB+ en clientes). Las páginas reales empiezan en `page=1`. `items` solo (sin `page`) devuelve los primeros N items.
3. **Filtros del Postman no funcionan**: `grupoCli` documentado pero ignorado por el servidor (verificado con `grupoCli=1`, `grupoCli=98`, `grupoCli=99999` — mismo resultado).

Esta release **arregla los tres** y añade **6 tools comerciales** (clientes, contactos-clientes, oportunidades-negocio) con paginación correcta y sin filtros falsos.

## 2. Goals

- Arreglar el unwrap del wrapper `{ errorCode, errorMessage, data }` a nivel `BaseClient`. Una sola corrección, todas las tools beneficiadas.
- Añadir 6 tools comerciales (3 entidades: clientes, contactos-clientes, oportunidades-negocio).
- Documentar y validar la paginación correctamente (1-indexed, cap items=50).
- Documentar explícitamente el `idReg` opaco como la clave para endpoints singulares.
- Mantener arquitectura existente (factory, BaseClient/FreematicaClient, helpers, registerXTools).

## 3. Non-goals

- Filtros (`grupoCli`, `idCliente`, `estado`, etc.) — empíricamente rotos en el API o no documentados. Se añadirán en una iteración futura cuando se verifiquen empíricamente.
- Endpoints de escritura (POST/PUT/DELETE). Solo lectura.
- Tools de casos, contratos, ofertas-ETT (excluidas por decisión del usuario).
- Detalle de contactos-clientes individuales (`/contactos-clientes/:idReg`). El usuario solo pidió lista.
- Tipado fuerte de cada entidad. `Record<string, unknown>` (los items tienen >80 campos opacos en mayúsculas).
- Tool meta-helper (`freematica_help`). Aún <10 tools.

## 4. Decisiones de diseño

| Decisión                    | Elección                                                                | Justificación                                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lugar del unwrap            | `BaseClient.request<T>()`                                               | El wrapper es universal en TODOS los endpoints. Unwrap automático evita repetirlo en cada método.                                                                 |
| Verificación de `errorCode` | En `request<T>()`, mapea a `FreematicaError`                            | El API devuelve siempre status HTTP 200, pero `errorCode` interno puede ser != "200" (ej. el `404` que vimos cuando el id no existe). Hay que checar el envelope. |
| Shape de listados           | `data: { total, items, rowHeight }` → método retorna `{ items, total }` | `rowHeight` no es útil al LLM, se descarta. `total` sí (informa cuántas páginas hay).                                                                             |
| Shape de detalle            | `data: <objeto del item>` → método retorna el objeto directo            | El detalle no envuelve en `{items}`.                                                                                                                              |
| Paginación tool inputs      | `page: int >=1, default 1`; `items: int 1..50, default 20`              | Bloqueamos `page=0` (devuelve TODO). Cap `items` en 50 para evitar respuestas masivas.                                                                            |
| Naming del id               | El input se llama `id` y la doc explica que es el `idReg` opaco         | Naming MCP estándar; explicar en la `.describe()` que el LLM debe usar el campo `idReg` de los listados, no `COD_CLI`/`ID_OPORTUNIDAD`.                           |
| Datos ampliados             | Tool independiente `freematica_get_oportunidad_negocio_datos_ampliados` | Endpoint distinto (`/datos-ampliados` suffix). Puede devolver 404 si no existen — documentar al LLM cómo manejarlo.                                               |
| Tipado de items             | `Record<string, unknown>`                                               | Igual que tools existentes. Los campos son códigos crípticos `COD_*` que se traducen vía master-data tool.                                                        |
| Output tool listado         | `{ items, count, total, page, items_per_page }`                         | `count` = `items.length` (esta página), `total` = del API, `page`/`items_per_page` = echo del input. Le da al LLM toda la info para paginar.                      |
| Output tool detalle         | El objeto del item directamente                                         | Sin wrapper extra. Si quieres metadatos, ya hay otra capa MCP.                                                                                                    |
| Versión                     | `0.4.0`                                                                 | Minor: añade tools. Breaking en shape de respuestas existentes pero nadie las consume aún, así que asumimos el cambio.                                            |

## 5. Estructura de archivos

```
src/
├── clients/
│   ├── base-client.ts                  # MODIFY: unwrap envelope + verify errorCode
│   └── freematica-client.ts            # MODIFY: existing methods retornan { items, total }; añadir 6 métodos nuevos
├── tools/
│   ├── contratos.ts                    # MODIFY: tool existente devuelve { items, count, total }
│   ├── master-data.ts                  # MODIFY: tool existente devuelve { items, count, total }
│   ├── clientes.ts                     # NEW: registerClientesTools (list_clientes + get_cliente)
│   ├── contactos-clientes.ts           # NEW: registerContactosClientesTools (list_contactos_clientes)
│   ├── oportunidades-negocio.ts        # NEW: registerOportunidadesNegocioTools (list + get + get_datos_ampliados)
│   └── helpers.ts                      # MODIFY: añadir `okList()` helper para shape { items, count, total, page, items_per_page }
├── schemas/
│   ├── pagination.ts                   # NEW: PaginationSchema (page, items)
│   ├── master-data.ts                  # no cambia
│   └── contratos.ts                    # no cambia
├── types/
│   ├── api-envelope.ts                 # NEW: FreematicaEnvelope<T>, FreematicaListData<T>
│   ├── clientes.ts                     # NEW: Cliente = Record<string, unknown>
│   ├── contactos-clientes.ts           # NEW: ContactoCliente = Record<string, unknown>
│   ├── oportunidades-negocio.ts        # NEW: OportunidadNegocio = Record<string, unknown>
│   ├── master-data.ts                  # no cambia
│   └── contratos.ts                    # no cambia
├── server.ts                           # MODIFY: registrar las 3 nuevas register*Tools
└── server-instructions.ts              # MODIFY: documentar nuevas tools + patrón paginación + idReg

tests/
├── clients/
│   ├── base-client.test.ts             # MODIFY: añadir tests del unwrap + errorCode mapping
│   └── freematica-client.test.ts       # MODIFY: ajustar tests existentes; añadir tests de 6 métodos nuevos
├── tools/
│   ├── contratos.test.ts               # MODIFY: ajustar a nuevo shape (items, count, total)
│   ├── master-data.test.ts             # MODIFY: ajustar a nuevo shape
│   ├── clientes.test.ts                # NEW
│   ├── contactos-clientes.test.ts      # NEW
│   ├── oportunidades-negocio.test.ts   # NEW
│   └── helpers.test.ts                 # MODIFY: tests de okList
├── schemas/
│   ├── pagination.test.ts              # NEW
│   └── master-data.test.ts             # no cambia
└── server.test.ts                      # MODIFY: assert que las 3 nuevas tools están registradas
```

## 6. Componentes

### 6.1 `src/types/api-envelope.ts` (nuevo)

```ts
export interface FreematicaEnvelope<T> {
  errorCode: string; // "200" en éxito; "404", "500", etc en error
  errorMessage: string;
  data: T;
}

export interface FreematicaListData<T> {
  total: string; // viene como string del API
  items: T[];
  rowHeight: number; // descartar — no útil al LLM
}
```

### 6.2 `src/clients/base-client.ts` (modify)

Cambios en `request<T>()`:

```ts
protected async request<T>(method, path, body?): Promise<T> {
  try {
    const res = await this.http.request<FreematicaEnvelope<T>>({ method, url: path, data: body });
    const envelope = res.data;
    if (envelope.errorCode !== '200') {
      throw this.mapEnvelopeError(envelope);
    }
    return envelope.data;
  } catch (err) {
    if (err instanceof FreematicaError) throw err;
    throw this.mapError(err);
  }
}

private mapEnvelopeError(env: FreematicaEnvelope<unknown>): FreematicaError {
  const code = env.errorCode;
  const msg = env.errorMessage || `API error (envelope errorCode=${code})`;
  if (code === '401') return new FreematicaError('invalid_token', msg);
  if (code === '403') return new FreematicaError('forbidden', msg);
  if (code === '404') return new FreematicaError('not_found', msg);
  if (code === '429') return new FreematicaError('rate_limit_exceeded', msg);
  if (code.startsWith('5')) return new FreematicaError('server_error', msg);
  return new FreematicaError('unexpected_error', msg);
}
```

`mapError(err)` para excepciones HTTP/red sigue igual.

### 6.3 `src/clients/freematica-client.ts` (modify + add)

```ts
import type { FreematicaListData } from '../types/api-envelope.js';

export interface ListResult<T> {
  items: T[];
  total: number; // convertimos string → number
}

export interface ListOptions {
  page?: number;
  items?: number;
}

export class FreematicaClient extends BaseClient {
  // ---- existentes (cambian shape) ----

  async getMaterialesAsignadosServicios(): Promise<ListResult<VoContratosServMatAsignado>> {
    // Sin paginación porque no la documenta el Postman para este endpoint.
    // Si en producción devuelve >200 items, considerar añadirla en v0.4.x.
    const data = await this.get<FreematicaListData<VoContratosServMatAsignado>>(
      '/pvss/v2/contratos-servicios-material',
    );
    return { items: data.items, total: Number(data.total) };
  }

  async getMasterData(catalog: MasterDataCatalog): Promise<ListResult<MasterDataItem>> {
    const endpoint = CATALOG_ENDPOINTS[catalog];
    const data = await this.get<FreematicaListData<MasterDataItem>>(endpoint);
    return { items: data.items, total: Number(data.total) };
  }

  // ---- nuevas ----

  async listClientes(opts: ListOptions = {}): Promise<ListResult<Cliente>> {
    return this.listResource<Cliente>('/pgrl/v2/clientes', opts);
  }

  async getCliente(idReg: string): Promise<Cliente> {
    return this.get<Cliente>(`/pgrl/v2/clientes/${encodeURIComponent(idReg)}`);
  }

  async listContactosClientes(opts: ListOptions = {}): Promise<ListResult<ContactoCliente>> {
    return this.listResource<ContactoCliente>('/pgrl/v2/contactos-clientes', opts);
  }

  async listOportunidadesNegocio(opts: ListOptions = {}): Promise<ListResult<OportunidadNegocio>> {
    return this.listResource<OportunidadNegocio>('/pcrm/v2/oportunidades-negocio', opts);
  }

  async getOportunidadNegocio(idReg: string): Promise<OportunidadNegocio> {
    return this.get<OportunidadNegocio>(
      `/pcrm/v2/oportunidades-negocio/${encodeURIComponent(idReg)}`,
    );
  }

  async getOportunidadNegocioDatosAmpliados(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pcrm/v2/oportunidades-negocio/${encodeURIComponent(idReg)}/datos-ampliados`,
    );
  }

  // ---- helper interno ----

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

### 6.4 `src/schemas/pagination.ts` (nuevo)

```ts
import { z } from 'zod';

export const PaginationSchema = {
  page: z
    .number()
    .int()
    .min(1)
    .max(999)
    .default(1)
    .describe(
      'Página a recuperar (1-indexed). Default: 1. AVISO: el API trata page=0 como "devuelve TODO el dataset", por eso aquí lo bloqueamos al mínimo 1.',
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

### 6.5 `src/types/clientes.ts`, `contactos-clientes.ts`, `oportunidades-negocio.ts` (nuevos)

Cada uno:

```ts
// src/types/clientes.ts
export type Cliente = Record<string, unknown>;
```

(Mismo patrón para ContactoCliente y OportunidadNegocio.)

### 6.6 `src/tools/helpers.ts` (modify)

Añadir `okList()`:

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

### 6.7 `src/tools/clientes.ts`, `contactos-clientes.ts`, `oportunidades-negocio.ts` (nuevos)

Patrón común. Ejemplo de `clientes.ts`:

```ts
const LIST_TOOL_NAME = 'freematica_list_clientes';
const GET_TOOL_NAME = 'freematica_get_cliente';

export function registerClientesTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    LIST_TOOL_NAME,
    'Devuelve la lista paginada de clientes de Freemática. ...',
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
    'Devuelve el detalle completo de un cliente. El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en los items de freematica_list_clientes — NO el COD_CLI ni otro código natural. ...',
    {
      id: z
        .string()
        .min(1)
        .describe('idReg opaco del cliente (campo "idReg" en los items del listado).'),
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

function errorFor(err: unknown): ToolResult {
  if (err instanceof FreematicaError) return error(err);
  return error(err instanceof Error ? err : new Error(String(err)));
}
```

Mismo patrón para los otros dos archivos. La tool `freematica_get_oportunidad_negocio_datos_ampliados` incluye una nota en su `description` advirtiendo que puede devolver `not_found`.

### 6.8 `src/server.ts`

```ts
registerContratosTools(server, opts.client);
registerMasterDataTools(server, opts.client);
registerClientesTools(server, opts.client);
registerContactosClientesTools(server, opts.client);
registerOportunidadesNegocioTools(server, opts.client);
```

Bump version a `0.4.0`.

### 6.9 `src/server-instructions.ts`

Reescribir el bloque "Tools disponibles" con las 8 tools totales:

- `freematica_list_materiales_asignados_servicios`
- `freematica_get_master_data`
- `freematica_list_clientes` + `freematica_get_cliente`
- `freematica_list_contactos_clientes`
- `freematica_list_oportunidades_negocio` + `freematica_get_oportunidad_negocio` + `freematica_get_oportunidad_negocio_datos_ampliados`

Añadir una nueva sección "## Paginación" explicando page=1 → primera página, items max 50, total devuelto en cada listado.

Añadir una nueva sección "## IDs opacos" explicando que `idReg` es el campo a usar en los endpoints `get_*`, no códigos naturales.

## 7. Data flow (típico)

1. LLM llama `freematica_list_clientes(page=1, items=20)`.
2. Tool valida con Zod (page≥1, items≤50).
3. `client.listClientes({page:1, items:20})` construye `/pgrl/v2/clientes?items=20&page=1`.
4. `BaseClient.get<FreematicaListData<Cliente>>(...)`:
   - axios GET → recibe `{ errorCode: "200", errorMessage: "", data: { total: "2007", items: [...], rowHeight: -1 } }`.
   - `request<T>` extrae `envelope.data` → `{ total: "2007", items: [...], rowHeight: -1 }`.
5. `listClientes` mapea a `{ items: [...], total: 2007 }`.
6. Tool devuelve `okList({items, total, page:1, itemsPerPage:20})` → `{ items, count: 20, total: 2007, page: 1, items_per_page: 20 }`.
7. LLM ve los items, encuentra el `idReg` de uno, llama `freematica_get_cliente(id="MV9fMTAwMA==")`.
8. `client.getCliente("MV9fMTAwMA==")` → GET `/pgrl/v2/clientes/MV9fMTAwMA==`.
9. `BaseClient.request` extrae `data` (el objeto del cliente directamente).
10. Tool devuelve `ok(cliente)`.

## 8. Manejo de errores

Códigos posibles (sin cambios respecto a v0.3.x):

| Código                | Cuándo                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `invalid_token`       | HTTP 401 o envelope.errorCode = "401"                                                                   |
| `forbidden`           | HTTP 403 o envelope.errorCode = "403"                                                                   |
| `not_found`           | HTTP 404 o envelope.errorCode = "404" (id inexistente, endpoint inexistente, datos-ampliados sin datos) |
| `rate_limit_exceeded` | HTTP 429 o envelope.errorCode = "429"                                                                   |
| `server_error`        | HTTP 5xx o envelope.errorCode = "5\*"                                                                   |
| `network_error`       | ECONNREFUSED / ETIMEDOUT / ENOTFOUND                                                                    |
| `unexpected_error`    | Cualquier otra cosa                                                                                     |

Nuevo: `mapEnvelopeError` para el caso donde HTTP es 200 pero el envelope dice otro código. Es muy común en este API.

## 9. Testing

### 9.1 BaseClient — nuevos tests

```ts
it('unwraps envelope.data on success', async () => {
  nock(BASE_URL)
    .get('/x')
    .reply(200, { errorCode: '200', errorMessage: '', data: { foo: 'bar' } });
  const r = await client.testGet<{ foo: string }>('/x');
  expect(r).toEqual({ foo: 'bar' });
});

it('maps envelope.errorCode=404 to not_found', async () => {
  nock(BASE_URL).get('/x').reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
  await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'not_found' });
});
```

(Mismo patrón para 401, 403, 429, 5xx en el envelope.)

### 9.2 FreematicaClient — ajustes + nuevos tests

- Tests existentes (`getMaterialesAsignadosServicios`, `getMasterData`) ajustan el shape esperado: ahora devuelven `{ items, total }` en vez de array directo. Los nock mocks deben devolver el envelope completo.
- 6 nuevos tests, uno por método nuevo: verifica URL correcta + propagación de errores.

### 9.3 Tools — ajustes + nuevos tests

- `contratos.test.ts` y `master-data.test.ts`: ajustar el shape esperado de la respuesta de la tool: `{ items, count, total, page?, items_per_page? }`.
- Tres nuevos archivos de test, uno por archivo de tools nuevo. Cada uno con ≥3 tests (registration, happy path, error).

### 9.4 PaginationSchema — nuevos tests

- `page=0` rechazado.
- `page=1.5` rechazado (no int).
- `items=51` rechazado (max 50).
- `items=0` rechazado.
- Defaults `page=1`, `items=20`.

### 9.5 Server factory — nuevos asserts

Verificar que las 5 nuevas tools están registradas (`freematica_list_clientes`, `freematica_get_cliente`, etc.).

## 10. README + CHANGELOG

- Añadir 6 filas a la tabla "Tools expuestas".
- Sección nueva "Paginación" con ejemplo de page=2.
- Sección nueva "IDs opacos en endpoints de detalle".
- Actualizar versión literal en "Verificación".
- CHANGELOG con `### Fixed` (unwrap), `### Added` (6 tools + paginación), `### Changed` (shape de respuesta de tools existentes, breaking pero sin consumidores).

## 11. Versionado

`0.4.0`. Aunque hay un breaking change en el shape de respuesta de las dos tools v0.3.x, ningún cliente las consume todavía (Nubiia no ha llegado a producción real). Documentado en CHANGELOG.

## 12. Out of scope (futuro)

- Filtros server-side. Recordatorio: `grupoCli`, `idCliente`, `clienteId`, `estado` verificados empíricamente como ignorados por el API.
- Detalle de contactos-clientes (`/contactos-clientes/:idReg`).
- Operaciones de escritura.
- Tools de casos (excluidas por decisión).
- Tipado fuerte de entidades (Cliente, OportunidadNegocio).
- Cache server-side.
- Tool `freematica_help`.

## 13. Open questions

1. ¿`/oportunidades-negocio/{id}/datos-ampliados` con id=2 devuelve 404 — es porque la oportunidad no tiene datos ampliados, o porque el endpoint no funciona? Asumimos lo primero; el LLM debe manejar el `not_found` con gracia.
2. ¿El cap de `items=50` es razonable? Cliente con 87 campos = ~1.7 KB por item ⇒ 50 items = ~85 KB. Razonable para LLM context. Si se queda corto en producción, subir a 100 en una iteración futura.
3. ¿Hay endpoints de filtros REALMENTE funcionales que el Postman no documenta explícitamente? Pendiente de descubrir en producción.
