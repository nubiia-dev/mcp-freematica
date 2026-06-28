# Stdio Transport — Design Spec

- **Date:** 2026-05-19
- **Author:** Samuel Fraga
- **Status:** Approved, ready for implementation
- **Repo:** `nubiia-dev/mcp-freematica`
- **Target version:** `0.2.0`
- **Supersedes:** Sección §13 (out of scope: "Stdio transport — no aplica para Nubiia") de `2026-05-18-freematica-mcp-design.md`.

---

## 1. Context

La v0.1.0 del MCP server solo soporta transporte Streamable HTTP, optimizado para que Nubiia conecte remotamente. Ahora queremos soportar también **stdio** para que el mismo paquete sirva para uso local (Claude Desktop, Claude Code) sin necesidad de levantar un servidor HTTP.

El patrón a replicar es el de `mcp-nevent`: un único binario que elige transporte según un flag CLI o variable de entorno, con stdio por defecto (convención estándar del ecosistema MCP).

## 2. Goals

- Mismo binario `mcp-freematica` (y mismo paquete `@nubiia/mcp-freematica`) ejecuta en stdio o HTTP según selección.
- Default `stdio` cuando no se pasa flag (alinea con Claude Desktop/Claude Code).
- Nubiia sigue funcionando exactamente igual con `MCP_TRANSPORT=http` en el entorno del proceso.
- Cero cambios en la factoría `createFreematicaServer()` ni en las tools (transport-agnostic, ya lo está).

## 3. Non-goals

- Cambiar la forma de la única tool actual (`freematica_list_materiales_asignados_servicios`).
- Añadir tools nuevas.
- OAuth, multi-tenant, per-session JWT — siguen out of scope.
- Auto-detection de transport (si stdin es TTY → stdio; si no → http). Demasiada magia, fuente de bugs.

## 4. Decisiones de diseño

| Decisión                          | Elección                                                                                                               | Justificación                                                                                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mecanismo de selección            | CLI flag `--transport=<stdio\|http>` **Y** env var `MCP_TRANSPORT`                                                     | Mismo patrón que `mcp-nevent`. CLI flag útil en terminal humana; env var útil para deploy programático (Nubiia). Si están ambos, gana el CLI flag.                         |
| Default cuando no hay selección   | `stdio`                                                                                                                | Convención estándar del ecosistema MCP (Claude Desktop, Claude Code, mcp-nevent default).                                                                                  |
| Default cuando hay valor inválido | Warn + fallback a `stdio`                                                                                              | Mismo patrón nevent (`Unknown transport "...". Defaulting to stdio.`). No fail-hard para no romper despliegues por una errata.                                             |
| Logging en modo stdio             | Solo `console.error` (stderr)                                                                                          | stdout está reservado para JSON-RPC. Un `console.log` accidental corrompería el protocolo.                                                                                 |
| Validación de env vars            | Split: `loadAuthConfig()` (auth + base URL, requerido en ambos modos) y `loadHttpConfig()` (port + origins, solo HTTP) | Stdio no debe exigir `MCP_PORT` ni `MCP_ALLOWED_ORIGINS`. Validar solo lo que aplica a cada modo.                                                                          |
| Carga del módulo HTTP             | Dynamic import en modo HTTP                                                                                            | Stdio no necesita cargar Express, axios-rate-limit, cors, randomUUID, etc. Reduce cold-start del modo stdio (~50ms estimado). Patrón copiado de `mcp-nevent/src/index.ts`. |
| Versión                           | `0.2.0` (minor bump)                                                                                                   | Funcionalidad nueva, retro-compatible si Nubiia añade `MCP_TRANSPORT=http`.                                                                                                |
| Breaking change                   | Documentado en CHANGELOG y README                                                                                      | Quien ya esté ejecutando v0.1.0 con `node dist/index.js` (sin flag) recibía HTTP; con v0.2.0 recibirá stdio. Mitigación: setear `MCP_TRANSPORT=http`.                      |

## 5. Estructura de archivos

Comparado con v0.1.0 (no se elimina nada, se añaden 2 archivos y se reescriben 2):

```
src/
├── index.ts                          # REESCRITO — bootstrap con branching stdio vs http
├── config.ts                         # REFACTOR — split loadConfig → loadAuthConfig + loadHttpConfig
├── server.ts                         # sin cambios
├── server-instructions.ts            # sin cambios
├── transports/
│   ├── stdio.ts                      # NUEVO — startStdio({ client })
│   └── http.ts                       # sin cambios funcionales
├── clients/                          # sin cambios
├── tools/                            # sin cambios
├── schemas/                          # sin cambios
└── types/                            # sin cambios

tests/
├── config.test.ts                    # ADAPTADO — cubre las 2 funciones nuevas
├── transports/
│   └── stdio.test.ts                 # NUEVO — smoke test del modo stdio
└── (resto sin cambios)
```

## 6. Componentes

### 6.1 `src/config.ts` (refactor)

Split en 2 funciones independientes, ambas con su propio Zod schema. `loadConfig()` se mantiene como wrapper para retro-compatibilidad y para que tests existentes sigan pasando.

```ts
const AuthConfigSchema = z.object({
  FREEMATICA_BASE_URL: z
    .string()
    .url()
    .default('https://api-p01.clientservicepanel.com/restsat/api'),
  FREEMATICA_AUTH_TOKEN: z.string().min(1),
  FREEMATICA_AUTH_COMPANY: z.string().min(1),
  FREEMATICA_AUTH_ORGANIZATION: z.string().min(1),
  FREEMATICA_AUTH_APP: z.string().min(1),
  FREEMATICA_AUTH_SESSION: z.string().min(1),
});

const HttpConfigSchema = z.object({
  MCP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MCP_ALLOWED_ORIGINS: z.string().default('*'),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type HttpConfig = z.infer<typeof HttpConfigSchema>;
export type Config = AuthConfig & HttpConfig; // retro-compat

export function loadAuthConfig(): AuthConfig {
  /* parse + format errors */
}
export function loadHttpConfig(): HttpConfig {
  /* parse + format errors */
}
export function loadConfig(): Config {
  return { ...loadAuthConfig(), ...loadHttpConfig() };
}
```

### 6.2 `src/transports/stdio.ts` (nuevo)

```ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createFreematicaServer } from '../server.js';
import type { FreematicaClient } from '../clients/freematica-client.js';

export interface StartStdioOptions {
  client: FreematicaClient;
}

export async function startStdio(opts: StartStdioOptions): Promise<void> {
  const server = createFreematicaServer({ client: opts.client });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // El proceso queda vivo mientras el transport esté abierto.
}
```

### 6.3 `src/index.ts` (reescrito)

```ts
#!/usr/bin/env node
import { loadAuthConfig } from './config.js';
import { FreematicaClient } from './clients/freematica-client.js';

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const transportArg = parseArg('transport') ?? process.env.MCP_TRANSPORT ?? 'stdio';

async function main(): Promise<void> {
  const auth = loadAuthConfig();
  const client = new FreematicaClient({
    baseUrl: auth.FREEMATICA_BASE_URL,
    authHeaders: {
      'x-auth-token': auth.FREEMATICA_AUTH_TOKEN,
      'x-auth-company': auth.FREEMATICA_AUTH_COMPANY,
      'x-auth-organization': auth.FREEMATICA_AUTH_ORGANIZATION,
      'x-auth-app': auth.FREEMATICA_AUTH_APP,
      'x-auth-session': auth.FREEMATICA_AUTH_SESSION,
    },
  });

  if (transportArg === 'http') {
    const { loadHttpConfig } = await import('./config.js');
    const { createHttpApp } = await import('./transports/http.js');
    const http = loadHttpConfig();

    const { app, shutdown } = await createHttpApp({
      port: http.MCP_PORT,
      client,
      allowedOrigins: http.MCP_ALLOWED_ORIGINS,
    });

    process.on('SIGTERM', () => void shutdown().then(() => process.exit(0)));
    process.on('SIGINT', () => void shutdown().then(() => process.exit(0)));

    app.listen(http.MCP_PORT, () => {
      console.error(`[freematica-mcp] HTTP transport listening on :${http.MCP_PORT}`);
    });
    return;
  }

  if (transportArg !== 'stdio') {
    console.error(`[freematica-mcp] Unknown transport "${transportArg}". Defaulting to stdio.`);
  }

  console.error('[freematica-mcp] Starting stdio transport v0.2.0');
  const { startStdio } = await import('./transports/stdio.js');
  await startStdio({ client });
}

main().catch((err) => {
  console.error('[freematica-mcp] FATAL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
```

### 6.4 `src/transports/http.ts`

Sin cambios funcionales. Sigue exportando `createHttpApp(config)`.

### 6.5 `src/server.ts` + tools + clients

Sin cambios — todo es transport-agnostic.

## 7. Data flow (modo stdio)

1. Claude Desktop / Claude Code arranca el binario `mcp-freematica` (o `node dist/index.js`) con el `FREEMATICA_AUTH_*` configurado.
2. `index.ts` detecta default `stdio`.
3. Carga `FreematicaClient` y conecta a `StdioServerTransport`.
4. El cliente MCP envía `initialize` por stdin → server responde por stdout.
5. Llamada `tools/call` para `freematica_list_materiales_asignados_servicios` → handler llama al API de Freemática → respuesta por stdout.
6. Cliente cierra stdin → transport `onclose` → proceso termina.

## 8. Manejo de errores

- **Falta una env var `FREEMATICA_AUTH_*`** → muere antes de aceptar mensajes con mensaje claro en stderr. Mismo comportamiento que v0.1.0.
- **stdio + log accidental en stdout** → prohibido. Todos los logs informativos van por `console.error` (stderr). Si una librería de terceros loggea en stdout, hay que mockearlo (no aplica hoy; auditar si aparece).
- **Transport desconocido** → warn + fallback a stdio. No fail.
- **Modo HTTP sin `MCP_PORT`** → usa default `3000` (Zod).
- **Errores de tools** → ya manejados por `helpers.error()`, transport-agnostic.

## 9. Testing

### 9.1 Unit tests adaptados

- `tests/config.test.ts` se reorganiza en 3 bloques:
  - `describe('loadAuthConfig')` con los tests actuales sobre las 5 vars + base URL (modificar referencias `loadConfig` → `loadAuthConfig`).
  - `describe('loadHttpConfig')` con los tests de `MCP_PORT` (coerce, range, default) y `MCP_ALLOWED_ORIGINS` (default).
  - `describe('loadConfig')` con 1 test smoke que verifica que combina ambos.
- Tests existentes para `BaseClient`, `FreematicaClient`, `helpers`, `contratos`, `server` no se tocan.

### 9.2 Smoke test stdio nuevo

`tests/transports/stdio.test.ts` — spawna `node dist/index.js` con env vars, envía mensajes JSON-RPC por stdin, parsea respuesta de stdout:

```ts
import { spawn } from 'node:child_process';
import { describe, it, expect } from 'vitest';

describe('stdio transport smoke', () => {
  it('responds to initialize via stdio', async () => {
    const proc = spawn('node', ['dist/index.js'], {
      env: {
        ...process.env,
        FREEMATICA_AUTH_TOKEN: 't',
        FREEMATICA_AUTH_COMPANY: 'c',
        FREEMATICA_AUTH_ORGANIZATION: 'o',
        FREEMATICA_AUTH_APP: 'a',
        FREEMATICA_AUTH_SESSION: 's',
        MCP_TRANSPORT: 'stdio',
      },
    });
    // send initialize, await response, verify protocolVersion / serverInfo
    // close proc.stdin → expect proc to exit
  });
});
```

Requiere `npm run build` antes (testea el binario real, no fuente TS). Se ejecuta en CI tras el step de build.

### 9.3 HTTP coverage

Sin tocar — siguen los 30 tests actuales.

### 9.4 CI

`.github/workflows/ci.yml` ya ejecuta `lint → typecheck → test → build`. El smoke test stdio necesita correr **después** del build. Reorden:

```yaml
- run: npm run lint
- run: npm run typecheck
- run: npm run build
- run: npm test # incluye stdio smoke (que asume dist/ ya existe)
```

## 10. README

Nueva sección "Modos de transporte" (sustituye / amplía "Endpoints HTTP"):

```md
## Modos de transporte

El binario soporta dos transportes seleccionables vía `--transport=<modo>` (CLI) o `MCP_TRANSPORT=<modo>` (env var). Default: `stdio`.

| Modo    | Cuándo usar                            | Comando                                                                 |
| ------- | -------------------------------------- | ----------------------------------------------------------------------- |
| `stdio` | Claude Desktop, Claude Code, uso local | `mcp-freematica` (default) o `mcp-freematica --transport=stdio`         |
| `http`  | Nubiia, deploy como servicio web       | `mcp-freematica --transport=http` o `MCP_TRANSPORT=http mcp-freematica` |
```

Más ejemplos concretos:

```md
### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`:

{
"mcpServers": {
"freematica": {
"command": "npx",
"args": ["-y", "@nubiia/mcp-freematica"],
"env": {
"FREEMATICA_AUTH_TOKEN": "...",
"FREEMATICA_AUTH_COMPANY": "...",
"FREEMATICA_AUTH_ORGANIZATION": "...",
"FREEMATICA_AUTH_APP": "...",
"FREEMATICA_AUTH_SESSION": "..."
}
}
}
}

### Nubiia (HTTP)

Setear `MCP_TRANSPORT=http` en las env vars del proceso. Resto igual.
```

## 11. Out of scope (futuro)

- Auto-detect basado en `process.stdin.isTTY`. Magia, fuente de bugs.
- WebSocket transport. SDK lo soporta pero no es uso real en MCP hoy.
- Soporte para múltiples sesiones concurrentes en stdio (no aplica: stdio es 1:1 por definición).

## 12. Open questions

1. **¿Nubiia ya está ejecutando v0.1.0 en producción?** Si sí, el deploy de v0.2.0 requiere setear `MCP_TRANSPORT=http` antes para evitar que arranque stdio y dé timeout. Si aún no se ha desplegado nada, no hay breaking real.
2. **¿Algún cliente local ya tiene configurado v0.1.0 esperando HTTP?** Si sí, debe migrar a `MCP_TRANSPORT=http` o `--transport=http`.
3. **¿El smoke test stdio necesita correr en CI?** Recomendado sí (atrapa regresiones del protocolo), pero alarga el job ~5-10s. Decidir.
