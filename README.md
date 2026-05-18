# slm-freematica-mcp

MCP server que expone operaciones del API REST de Freemática para ser consumidas por Claude a través de Nubiia.

## Stack

- TypeScript + Node.js ≥20
- `@modelcontextprotocol/sdk` (Streamable HTTP transport)
- Express + axios + zod
- Vitest + nock para tests

## Tools expuestas

| Tool | Endpoint Freemática | Descripción |
|---|---|---|
| `freematica_list_materiales_asignados_servicios` | `GET /pvss/v2/contratos-servicios-material` | Lista de material asignado a servicios |

## Configuración

El servidor lee toda su configuración de **variables de entorno** al arrancar. Si falta alguna obligatoria, el proceso muere con un mensaje claro listando qué falta — no acepta requests hasta que la configuración sea válida.

### Variables de entorno

| Variable | Obligatoria | Default | Descripción |
|---|---|---|---|
| `FREEMATICA_AUTH_TOKEN` | ✅ | — | Header `x-auth-token` para autenticar con la API de Freemática. |
| `FREEMATICA_AUTH_COMPANY` | ✅ | — | Header `x-auth-company`. Identifica la empresa dentro del API. |
| `FREEMATICA_AUTH_ORGANIZATION` | ✅ | — | Header `x-auth-organization`. Identifica la organización. |
| `FREEMATICA_AUTH_APP` | ✅ | — | Header `x-auth-app`. Identifica la aplicación que consume (p.ej. `pvss`). |
| `FREEMATICA_AUTH_SESSION` | ✅ | — | Header `x-auth-session`. Identifica la sesión activa. |
| `FREEMATICA_BASE_URL` | ❌ | `https://api-p01.clientservicepanel.com/restsat/api` | Base URL del API de Freemática. Cambiar solo si Freemática cambia el host o se usa un entorno alternativo. |
| `MCP_PORT` | ❌ | `3000` | Puerto TCP donde el servidor MCP expone `/mcp` y `/health`. |
| `MCP_ALLOWED_ORIGINS` | ❌ | `*` | CORS: lista de orígenes permitidos separados por coma, o `*` para todos. En producción restringir al dominio de Nubiia. |

### De dónde salen las credenciales `x-auth-*`

Las 5 credenciales `x-auth-*` son **preexistentes** — el Postman collection de Freemática no expone un endpoint de login, así que estas credenciales se obtienen fuera de banda (típicamente por el departamento de IT de Freemática o el integrador de Serlimar).

- Pide los 5 valores al responsable técnico de Freemática (o usa los mismos que ya emplea `slm-integration` si están en el gestor de secretos).
- **NO comitees credenciales reales**. El repositorio tiene `.env.*` en `.gitignore` (excepto `.env.example`).
- Si las credenciales caducan, el MCP devolverá `invalid_token` en todas las llamadas. Renovarlas implica reiniciar el proceso (no hay refresh automático en v0.1.0).

### Configuración en Nubiia (producción)

Nubiia despliega el servidor MCP y se encarga de inyectar las variables de entorno. En el panel de Nubiia:

1. Crea un MCP server apuntando a la URL del contenedor desplegado (por ejemplo `https://freematica-mcp.serlimar.internal/mcp`).
2. Añade las 8 variables de entorno listadas arriba (5 obligatorias + 3 opcionales) en la sección de secretos.
3. Recomendado: setear `MCP_ALLOWED_ORIGINS` al dominio exacto desde el que Claude/Nubiia conecta, no `*`.
4. Verifica con el endpoint `GET /health` que el servidor está vivo antes de habilitar el MCP en Claude.

### Configuración local (desarrollo)

Para desarrollo local crea un `.env` (o `.env.local`) en la raíz:

```bash
cp .env.example .env
# Edita .env y rellena los 5 FREEMATICA_AUTH_*
```

Luego arranca con:

```bash
set -a; source .env; set +a
npm run dev
```

O todo en una línea:

```bash
node --env-file=.env --import tsx src/index.ts
```

### Verificación de la configuración

1. **Sin env vars** — el proceso debe morir inmediatamente con un mensaje listando las 5 variables que faltan:
   ```bash
   node dist/index.js
   # [freematica-mcp] FATAL: [freematica-mcp] Invalid configuration:
   #   - FREEMATICA_AUTH_TOKEN: Required
   #   - FREEMATICA_AUTH_COMPANY: Required
   #   ...
   ```

2. **Con env vars válidas** — el proceso queda escuchando y `/health` devuelve `{ "status": "ok", "version": "0.1.0", "sessions": 0 }`:
   ```bash
   curl http://localhost:3000/health
   ```

3. **Llamada real al API de Freemática** — inicializa sesión MCP y llama la única tool disponible. Si las credenciales son correctas devolverá `items` + `count`; si no, un error con `code: "invalid_token"` o similar:
   ```bash
   # 1) Inicializar y capturar el Mcp-Session-Id de los headers de respuesta
   curl -i -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}'

   # 2) Llamar la tool (sustituye <SESSION_ID> por el header devuelto)
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -H "Mcp-Session-Id: <SESSION_ID>" \
     -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"freematica_list_materiales_asignados_servicios","arguments":{}}}'
   ```

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

| Método | Path | Descripción |
|---|---|---|
| POST | `/mcp` | JSON-RPC del MCP (envía `initialize` la primera vez) |
| GET | `/mcp` | Stream SSE (requiere `Mcp-Session-Id`) |
| DELETE | `/mcp` | Terminar sesión |
| GET | `/health` | Healthcheck |

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
docker build -t slm-freematica-mcp .
docker run --env-file .env -p 3000:3000 slm-freematica-mcp
```

## Especificaciones y diseño

- Spec: `docs/superpowers/specs/2026-05-18-freematica-mcp-design.md`
- Plan: `docs/superpowers/plans/2026-05-18-freematica-mcp.md`
- API: `apidocs/Freematica API - Complete Collection.postman_collection.json`

## Licencia

MIT — ver `LICENSE`.
