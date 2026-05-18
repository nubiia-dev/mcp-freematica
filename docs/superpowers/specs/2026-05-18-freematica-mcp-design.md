# Freemática MCP Server — Design Spec

- **Date:** 2026-05-18
- **Author:** Samuel Fraga
- **Status:** Approved, ready for implementation
- **Repo:** `slm-freematica-mcp` (Freemática org)

---

## 1. Context

Freemática expone una API REST corporativa (`api-p01.clientservicepanel.com`) con 513 operaciones documentadas en un Postman collection (`apidocs/Freematica API - Complete Collection.postman_collection.json`).

Queremos exponer un subconjunto de esas operaciones como un servidor MCP (Model Context Protocol) para que Claude pueda consumirlas. El MCP se desplegará en la plataforma **Nubiia**, que actúa como host/proxy entre Claude y el servidor MCP.

**Objetivo de este primer iteración:** automatizar **una sola** operación — _"obtener lista de material asignado a servicios"_ — con la arquitectura preparada para que añadir más operaciones del Postman sea una tarea trivial (un archivo nuevo en `src/tools/` y un método nuevo en `FreematicaClient`).

## 2. Operación a automatizar (v0.1.0)

| Campo | Valor |
|---|---|
| Tool MCP | `freematica_list_materiales_asignados_servicios` |
| Método HTTP | `GET` |
| URL | `https://api-p01.clientservicepanel.com/restsat/api/pvss/v2/contratos-servicios-material` |
| Headers requeridos | `x-auth-token`, `x-auth-company`, `x-auth-organization`, `x-auth-app`, `x-auth-session`, `Content-Type: application/json` |
| Query params | _Ninguno_ |
| Path params | _Ninguno_ |
| Body | _Ninguno_ |
| Respuesta | `VoContratosServMatAsignado[]` |
| Internal Method | `MCT_TABLA_GESTION` |
| API Group | Contratos |
| App | `pvss` |
| Version | `v2` |
| Descripción Postman | _"Devuelve un arreglo de objetos VoContratosServMatAsignado con la información solicitada de material asignado"_ |

**Nota:** el shape exacto de `VoContratosServMatAsignado` no está documentado en el Postman; se inferirá del primer response real y se tipará en `src/types/contratos.ts`. Hasta tener acceso al API, el tipo se declara como `Record<string, unknown>` y se afina iterativamente.

## 3. Decisiones de diseño

| Decisión | Elección | Justificación |
|---|---|---|
| Lenguaje / runtime | TypeScript + Node.js ≥ 20 | Mejor SDK del MCP, alineado con `mcp-nevent` y `mcp-holded`. |
| MCP SDK | `@modelcontextprotocol/sdk` ^1.27.1 | Oficial, misma versión que `mcp-nevent`. |
| Transporte | **Streamable HTTP** (único) | Nubiia conecta remotamente. Sin stdio. |
| Inyección de credenciales | Variables de entorno (`FREEMATICA_AUTH_*`) cargadas al arrancar | Estándar; Nubiia las setea al lanzar el proceso. Credenciales globales por instalación. |
| Validación de inputs | Zod | Estándar del MCP SDK TS. |
| Cliente HTTP | `axios` envuelto en `BaseClient` | Headers de auth se inyectan automáticamente; mapeo de errores centralizado. |
| Estructura de tools | 1 archivo por **API Group** del Postman en `src/tools/` | Misma convención que `mcp-nevent`. Cuando un grupo pase de ~15 tools, se split. |
| Naming de tools | `freematica_<verbo>_<recurso>` (snake_case) | Mismo estilo que `nevent_<verbo>_<recurso>`. Namespace claro. |
| Auth de Claude → MCP | **No implementada en este server** | Nubiia gestiona la auth entre Claude y el MCP. El server confía en quien llega al endpoint HTTP. |
| Logging persistente | **No** | No hay MongoDB; logging a stderr basta para esta versión. |
| Operation mode (READ/STANDARD/FULL) | **No por ahora** | Solo hay una tool read-only. Se introduce cuando se añadan tools destructivas. |
| Despliegue | Solo código + Dockerfile opcional | Nubiia se encarga del deploy. |

## 4. Arquitectura

```
┌──────────────┐    HTTP (Streamable)    ┌────────────────────────────┐
│   Nubiia     │ ───────────────────────▶│  slm-freematica-mcp        │
│  (cliente)   │                         │  (Express + MCP SDK)       │
└──────────────┘                         │                            │
                                         │  ┌──────────────────────┐  │
                                         │  │  Tool Registry       │  │
                                         │  │  (factory pattern)   │  │
                                         │  └──────────┬───────────┘  │
                                         │             │              │
                                         │  ┌──────────▼───────────┐  │
                                         │  │  FreematicaClient    │  │
                                         │  │  (axios + headers)   │  │
                                         │  └──────────┬───────────┘  │
                                         └─────────────┼──────────────┘
                                                       │ HTTPS
                                         ┌─────────────▼──────────────┐
                                         │  api-p01.clientservice...  │
                                         │  (Freematica REST API)     │
                                         └────────────────────────────┘
```

## 5. Estructura de archivos

```
slm-freematica-mcp/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
├── .gitignore
├── .env.example
├── README.md
├── LICENSE
├── Dockerfile
├── .github/
│   └── workflows/
│       └── ci.yml                          # lint + typecheck + test
├── apidocs/
│   └── Freematica API - Complete Collection.postman_collection.json
├── docs/
│   └── superpowers/specs/
│       └── 2026-05-18-freematica-mcp-design.md
└── src/
    ├── index.ts                            # bootstrap: carga config + arranca HTTP
    ├── config.ts                           # carga + valida env vars (Zod)
    ├── server.ts                           # factory createFreematicaServer
    ├── server-instructions.ts              # instrucciones para el LLM
    ├── transports/
    │   └── http.ts                         # Express + StreamableHTTPServerTransport
    ├── clients/
    │   ├── base-client.ts                  # axios + headers auth + mapeo errores
    │   └── freematica-client.ts            # métodos por endpoint
    ├── tools/
    │   ├── helpers.ts                      # ok(), error(), formatters
    │   └── contratos.ts                    # registerContratosTools(server, client)
    ├── schemas/
    │   └── contratos.ts                    # Zod schemas de inputs (vacíos para v0.1.0)
    └── types/
        └── contratos.ts                    # VoContratosServMatAsignado, etc.

tests/
├── clients/freematica-client.test.ts
├── tools/contratos.test.ts
└── helpers/mock-server.ts                  # mock del API con nock
```

## 6. Componentes

### 6.1 `src/config.ts`

Carga y valida env vars con Zod. Falla con mensaje claro en arranque si falta alguna.

```ts
const ConfigSchema = z.object({
  FREEMATICA_BASE_URL: z.string().url().default('https://api-p01.clientservicepanel.com/restsat/api'),
  FREEMATICA_AUTH_TOKEN: z.string().min(1),
  FREEMATICA_AUTH_COMPANY: z.string().min(1),
  FREEMATICA_AUTH_ORGANIZATION: z.string().min(1),
  FREEMATICA_AUTH_APP: z.string().min(1),
  FREEMATICA_AUTH_SESSION: z.string().min(1),
  MCP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MCP_ALLOWED_ORIGINS: z.string().default('*'),
});

export type Config = z.infer<typeof ConfigSchema>;
export function loadConfig(): Config { /* parse + format errors */ }
```

### 6.2 `src/clients/base-client.ts`

Cliente HTTP genérico que:
- Inyecta los 5 headers `x-auth-*` + `Content-Type` automáticamente.
- Expone `request<T>(method, path, body?)` y atajos `get<T>(path)`, `post<T>(path, body)`, etc.
- Mapea respuestas HTTP a errores normalizados `FreematicaError` con `code` y `message`.

**Códigos de error normalizados:**

| Código | Trigger | LLM action |
|---|---|---|
| `invalid_token` | 401 | Avisar al usuario; las credenciales del MCP necesitan renovarse en Nubiia. |
| `forbidden` | 403 | Sin permisos para la operación. |
| `not_found` | 404 | Recurso/endpoint inexistente. |
| `rate_limit_exceeded` | 429 | Esperar `retryAfter` y reintentar una vez. |
| `server_error` | 5xx | Reintentar una vez con backoff. |
| `network_error` | ECONNREFUSED / timeout | Reintentar una vez tras 2s. |
| `unexpected_error` | resto | Loggear y reintentar una vez. |

### 6.3 `src/clients/freematica-client.ts`

Extiende `BaseClient`. Un método por endpoint expuesto en alguna tool. Tipa la respuesta.

```ts
export class FreematicaClient extends BaseClient {
  getMaterialesAsignadosServicios(): Promise<VoContratosServMatAsignado[]> {
    return this.get<VoContratosServMatAsignado[]>('/pvss/v2/contratos-servicios-material');
  }
}
```

### 6.4 `src/server.ts`

Factory `createFreematicaServer(opts)` que devuelve un `McpServer` con todas las tools registradas. Una sola dependencia: `client: FreematicaClient`.

```ts
export function createFreematicaServer(opts: CreateFreematicaServerOptions): McpServer {
  const server = new McpServer(
    { name: 'freematica-mcp', version: '0.1.0' },
    { instructions: FREEMATICA_MCP_INSTRUCTIONS }
  );
  registerContratosTools(server, opts.client);
  return server;
}
```

### 6.5 `src/tools/contratos.ts`

Una función `registerContratosTools(server, client)` que registra todas las tools del API Group "Contratos". En v0.1.0 solo registra una.

```ts
server.tool(
  'freematica_list_materiales_asignados_servicios',
  'Devuelve la lista de material asignado a servicios (pvss/v2/contratos-servicios-material). ' +
  'Equivale a la operación VoContratosServMatAsignado del backend de Freemática. ' +
  'No requiere parámetros.',
  {}, // sin inputs
  { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  async () => {
    const items = await client.getMaterialesAsignadosServicios();
    return ok({ items, count: items.length });
  }
);
```

### 6.6 `src/transports/http.ts`

Express app con:
- `POST /mcp` — JSON-RPC (`StreamableHTTPServerTransport`).
- `GET /mcp` — SSE stream.
- `DELETE /mcp` — terminación de sesión.
- `GET /health` — healthcheck (`{ status: 'ok', version }`).
- CORS configurable vía `MCP_ALLOWED_ORIGINS`.
- `express-rate-limit` en `/mcp` para evitar abuso.
- Session pruning cada 30 min (mismo patrón que `mcp-nevent`).

El `FreematicaClient` es **singleton** (no per-session) porque las credenciales son globales por instalación.

### 6.7 `src/index.ts`

```ts
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

const { app, shutdown } = await createHttpApp({ port: config.MCP_PORT, client, allowedOrigins: config.MCP_ALLOWED_ORIGINS });

process.on('SIGTERM', () => void shutdown().then(() => process.exit(0)));
process.on('SIGINT', () => void shutdown().then(() => process.exit(0)));

app.listen(config.MCP_PORT, () => {
  console.error(`[freematica-mcp] HTTP server listening on port ${config.MCP_PORT}`);
});
```

## 7. Data flow

1. Nubiia hace `POST /mcp` con un payload JSON-RPC `tools/call` para `freematica_list_materiales_asignados_servicios`.
2. `StreamableHTTPServerTransport` enruta al handler registrado por `registerContratosTools`.
3. El handler llama a `client.getMaterialesAsignadosServicios()`.
4. `BaseClient.request()` hace `axios.get(BASE_URL + '/pvss/v2/contratos-servicios-material', { headers: AUTH_HEADERS })`.
5. Si la respuesta es 2xx, devuelve el array tipado.
6. Si no, lanza `FreematicaError` con código normalizado.
7. El handler retorna `ok({ items, count })` (éxito) o `error(code, message)` (fallo) — ambos en formato MCP `content[]`.

## 8. Manejo de errores

- **Errores de config** → fallan al arrancar, antes de aceptar requests. Mensaje claro en stderr indicando qué env var falta.
- **Errores HTTP del API** → `BaseClient` los mapea a `FreematicaError` con `code` + `message`.
- **Errores en handlers** → `helpers.ts::error(code, message)` los serializa como `{ content: [{ type: 'text', text: JSON.stringify({ error: code, message }) }], isError: true }`.
- **Errores inesperados** → top-level try/catch en cada handler que retorna `error('unexpected_error', err.message)`.

## 9. Testing

- **Framework:** `vitest` (mismo que `mcp-nevent` y `mcp-holded`).
- **Mocking del API:** `nock` para interceptar llamadas HTTP de axios.
- **Unit tests:**
  - `BaseClient` — verifica inyección de headers, mapeo de errores HTTP a códigos normalizados.
  - `FreematicaClient.getMaterialesAsignadosServicios()` — verifica URL correcta, deserialización.
  - `registerContratosTools` — verifica que la tool se registra y que su handler devuelve `ok()`/`error()` correctamente.
- **Integration test:** levanta el server HTTP + un cliente MCP de testing, hace una llamada end-to-end con nock interceptando el API.
- **Coverage objetivo:** ≥80% en `src/clients/` y `src/tools/`.

## 10. CI/CD

- **GitHub Actions** (`.github/workflows/ci.yml`):
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
- **Sin deploy automatizado** en este iteración. Nubiia hace `git pull` o `docker pull` cuando convenga.

## 11. Stack final (`package.json`)

```json
{
  "name": "slm-freematica-mcp",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": { "freematica-mcp": "dist/index.js" },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
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
    "@vitest/ui": "^2.1.8",
    "eslint": "^9.0.0",
    "nock": "^13.5.0",
    "tsx": "^4.6.0",
    "typescript": "^5.3.0",
    "vitest": "^2.1.8"
  }
}
```

## 12. Cómo añadir nuevas tools (guía para crecer)

Para añadir un endpoint nuevo del Postman:

1. **Tipar la respuesta** en `src/types/<grupo>.ts` (ej. `VoContratosServicios`).
2. **Añadir método** al `FreematicaClient` en `src/clients/freematica-client.ts`:
   ```ts
   getContratosServicios(): Promise<VoContratosServicios[]> {
     return this.get<VoContratosServicios[]>('/pvss/v1/contratos-servicios');
   }
   ```
3. **Añadir `server.tool(...)`** al `register<Grupo>Tools` correspondiente en `src/tools/<grupo>.ts`.
4. **Si el grupo es nuevo:** crear `src/tools/<grupo>.ts` y añadir `register<Grupo>Tools(server, client)` en `server.ts`.
5. **Tests:** uno para el método del client (nock), uno para el handler de la tool.

## 13. Out of scope (futuro)

- OAuth / multi-tenant — Nubiia se encarga; si en el futuro alguna instancia necesita credenciales por-usuario lo añadiremos siguiendo el patrón de `mcp-nevent`.
- Stdio transport — no aplica para Nubiia.
- Operation mode `READ_ONLY`/`STANDARD`/`FULL` — añadir cuando se introduzcan tools destructivas (POST/PUT/DELETE).
- Logging persistente — añadir cuando haya analítica de uso necesaria.
- Help tool (`freematica_help`) — útil cuando haya >5 tools.
- Renovación automática del `x-auth-token` o `x-auth-session` — el Postman collection no incluye endpoint de login; si Freemática lo proporciona en el futuro, añadir refresh transparente en `BaseClient`.

## 14. Open questions

1. ¿La organización Freemática en GitHub ya existe y tengo permisos de creación de repos? (asumido sí).
2. ¿Nubiia espera un endpoint específico distinto de `/mcp`? (asumido `/mcp` por ser el estándar del SDK).
3. ¿Las credenciales `x-auth-*` tienen TTL? Si caducan, ¿cómo se renuevan en Nubiia? (no bloquea v0.1.0 pero a documentar).
