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
