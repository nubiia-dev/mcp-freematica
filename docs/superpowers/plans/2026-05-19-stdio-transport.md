# Stdio Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir soporte para stdio transport en el MCP server de Freemática, manteniendo HTTP como modo alternativo seleccionable vía CLI flag `--transport=` o env var `MCP_TRANSPORT`. Default `stdio`.

**Architecture:** Refactor de `src/index.ts` para parsear el transport seleccionado y hacer dynamic import del módulo apropiado. Split de `loadConfig` en `loadAuthConfig` (siempre obligatorio) + `loadHttpConfig` (solo en modo HTTP). Nuevo archivo `src/transports/stdio.ts` con la función `startStdio()`. La factoría `createFreematicaServer()` y las tools no cambian (transport-agnostic).

**Tech Stack:** TypeScript 5.3, Node ≥20, `@modelcontextprotocol/sdk` ^1.27.1, vitest, child_process (para smoke test stdio).

**Spec:** `docs/superpowers/specs/2026-05-19-stdio-transport-design.md`
**Branch:** `feat/stdio-transport` (ya creada, ya contiene el commit de la spec)

---

## File Structure

| Path                             | Cambio    | Responsabilidad                                                                                        |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------------------------ |
| `src/config.ts`                  | Refactor  | Split en `loadAuthConfig` + `loadHttpConfig`; mantener `loadConfig` como wrapper retro-compat          |
| `src/transports/stdio.ts`        | Create    | `startStdio({ client })` — crea McpServer + StdioServerTransport y los conecta                         |
| `src/transports/http.ts`         | No cambia | Sigue exportando `createHttpApp`                                                                       |
| `src/index.ts`                   | Rewrite   | Bootstrap con branching stdio vs http; dynamic imports                                                 |
| `src/server.ts`                  | No cambia | Transport-agnostic                                                                                     |
| `tests/config.test.ts`           | Adapt     | Tests divididos en `describe('loadAuthConfig')` y `describe('loadHttpConfig')` + smoke de `loadConfig` |
| `tests/transports/stdio.test.ts` | Create    | Smoke test E2E que spawna `node dist/index.js` y envía JSON-RPC por stdin                              |
| `.github/workflows/ci.yml`       | Modify    | Reordenar: build antes que test (smoke stdio necesita dist/)                                           |
| `package.json`                   | Modify    | Bump version `0.1.0` → `0.2.0`                                                                         |
| `README.md`                      | Modify    | Sección "Modos de transporte" con tabla + ejemplos Claude Desktop/Nubiia                               |
| `CHANGELOG.md`                   | Create    | Documentar v0.2.0 con breaking change                                                                  |

---

## Task 1: Split `loadConfig` en `loadAuthConfig` + `loadHttpConfig` (TDD)

**Files:**

- Modify: `src/config.ts`
- Modify: `tests/config.test.ts`

- [ ] **Step 1.1: Verificar punto de partida**

```bash
cd /Users/samu/workspace/mcp-freematica
git status
git branch --show-current
npm test
```

Expected: working tree limpio, branch `feat/stdio-transport`, 30/30 tests passing.

- [ ] **Step 1.2: Reescribir `tests/config.test.ts` para cubrir las 2 funciones nuevas**

Reemplazar todo el contenido de `tests/config.test.ts` por:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadAuthConfig, loadHttpConfig, loadConfig } from '../src/config.js';

const REQUIRED_AUTH_VARS = [
  'FREEMATICA_AUTH_TOKEN',
  'FREEMATICA_AUTH_COMPANY',
  'FREEMATICA_AUTH_ORGANIZATION',
  'FREEMATICA_AUTH_APP',
  'FREEMATICA_AUTH_SESSION',
] as const;

function setAllRequired(): void {
  process.env.FREEMATICA_AUTH_TOKEN = 'tok';
  process.env.FREEMATICA_AUTH_COMPANY = 'co';
  process.env.FREEMATICA_AUTH_ORGANIZATION = 'org';
  process.env.FREEMATICA_AUTH_APP = 'app';
  process.env.FREEMATICA_AUTH_SESSION = 'ses';
}

describe('loadAuthConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of REQUIRED_AUTH_VARS) delete process.env[key];
    delete process.env.FREEMATICA_BASE_URL;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads valid auth config from env vars', () => {
    setAllRequired();

    const config = loadAuthConfig();

    expect(config.FREEMATICA_AUTH_TOKEN).toBe('tok');
    expect(config.FREEMATICA_AUTH_COMPANY).toBe('co');
    expect(config.FREEMATICA_AUTH_ORGANIZATION).toBe('org');
    expect(config.FREEMATICA_AUTH_APP).toBe('app');
    expect(config.FREEMATICA_AUTH_SESSION).toBe('ses');
    expect(config.FREEMATICA_BASE_URL).toBe('https://api-p01.clientservicepanel.com/restsat/api');
  });

  it.each(REQUIRED_AUTH_VARS)('throws clear error when %s is missing', (varName) => {
    setAllRequired();
    delete process.env[varName];

    expect(() => loadAuthConfig()).toThrow(new RegExp(varName));
  });

  it('error message includes the "Set the missing/invalid…" sentinel', () => {
    setAllRequired();
    delete process.env.FREEMATICA_AUTH_TOKEN;

    expect(() => loadAuthConfig()).toThrow(
      /Set the missing\/invalid environment variables and restart\./,
    );
  });

  it('accepts a custom FREEMATICA_BASE_URL override', () => {
    setAllRequired();
    process.env.FREEMATICA_BASE_URL = 'https://custom.example.com/api';

    const config = loadAuthConfig();

    expect(config.FREEMATICA_BASE_URL).toBe('https://custom.example.com/api');
  });

  it('rejects invalid FREEMATICA_BASE_URL', () => {
    setAllRequired();
    process.env.FREEMATICA_BASE_URL = 'not-a-url';

    expect(() => loadAuthConfig()).toThrow(/FREEMATICA_BASE_URL/);
  });

  it('does NOT require MCP_PORT or MCP_ALLOWED_ORIGINS', () => {
    setAllRequired();
    delete process.env.MCP_PORT;
    delete process.env.MCP_ALLOWED_ORIGINS;

    expect(() => loadAuthConfig()).not.toThrow();
  });
});

describe('loadHttpConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.MCP_PORT;
    delete process.env.MCP_ALLOWED_ORIGINS;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns defaults when no HTTP env vars set', () => {
    const config = loadHttpConfig();

    expect(config.MCP_PORT).toBe(3000);
    expect(config.MCP_ALLOWED_ORIGINS).toBe('*');
  });

  it('coerces MCP_PORT to number', () => {
    process.env.MCP_PORT = '8080';

    const config = loadHttpConfig();

    expect(config.MCP_PORT).toBe(8080);
    expect(typeof config.MCP_PORT).toBe('number');
  });

  it('rejects MCP_PORT out of range', () => {
    process.env.MCP_PORT = '99999';

    expect(() => loadHttpConfig()).toThrow(/MCP_PORT/);
  });

  it('reads MCP_ALLOWED_ORIGINS override', () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://nubiia.example';

    const config = loadHttpConfig();

    expect(config.MCP_ALLOWED_ORIGINS).toBe('https://nubiia.example');
  });

  it('does NOT require FREEMATICA_AUTH_* vars', () => {
    for (const key of REQUIRED_AUTH_VARS) delete process.env[key];

    expect(() => loadHttpConfig()).not.toThrow();
  });
});

describe('loadConfig (retro-compat wrapper)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of REQUIRED_AUTH_VARS) delete process.env[key];
    delete process.env.FREEMATICA_BASE_URL;
    delete process.env.MCP_PORT;
    delete process.env.MCP_ALLOWED_ORIGINS;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('combines auth + http config', () => {
    setAllRequired();

    const config = loadConfig();

    expect(config.FREEMATICA_AUTH_TOKEN).toBe('tok');
    expect(config.MCP_PORT).toBe(3000);
    expect(config.MCP_ALLOWED_ORIGINS).toBe('*');
  });
});
```

- [ ] **Step 1.3: Verificar tests fallan**

Run: `npm test -- tests/config.test.ts`
Expected: FAIL (`loadAuthConfig` y `loadHttpConfig` no existen aún en `src/config.ts`).

- [ ] **Step 1.4: Reescribir `src/config.ts` con el split**

Reemplazar todo el contenido por:

```ts
import { z } from 'zod';

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
export type Config = AuthConfig & HttpConfig;

function formatZodError(err: z.ZodError): string {
  const issues = err.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  return (
    `[freematica-mcp] Invalid configuration:\n${issues}\n\n` +
    `Set the missing/invalid environment variables and restart.`
  );
}

export function loadAuthConfig(): AuthConfig {
  const result = AuthConfigSchema.safeParse(process.env);
  if (!result.success) throw new Error(formatZodError(result.error));
  return result.data;
}

export function loadHttpConfig(): HttpConfig {
  const result = HttpConfigSchema.safeParse(process.env);
  if (!result.success) throw new Error(formatZodError(result.error));
  return result.data;
}

export function loadConfig(): Config {
  return { ...loadAuthConfig(), ...loadHttpConfig() };
}
```

- [ ] **Step 1.5: Verificar tests pasan**

```bash
npm test -- tests/config.test.ts
npm test           # full suite — los otros tests siguen pasando
npm run typecheck
```

Expected: PASS los 3 describe blocks (suma > 11 tests, los anteriores eran 11). Full suite: ≥30 tests, todos PASS.

- [ ] **Step 1.6: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "refactor: split loadConfig into loadAuthConfig and loadHttpConfig"
```

---

## Task 2: Implementar `src/transports/stdio.ts`

**Files:**

- Create: `src/transports/stdio.ts`

> **Sin test unitario aquí.** El smoke test E2E va en la Task 4 — testea el binario real. Un mock del SDK aquí sería tan trivial que no aportaría valor (el archivo tiene 5 líneas funcionales).

- [ ] **Step 2.1: Crear el archivo**

```ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { createFreematicaServer } from '../server.js';

export interface StartStdioOptions {
  client: FreematicaClient;
}

/**
 * Arranca el MCP server sobre el transport stdio.
 *
 * Mantiene el proceso vivo mientras el transport esté abierto (Claude
 * Desktop / Claude Code cierran stdin cuando terminan, lo que dispara
 * el `onclose` del transport y libera el proceso).
 */
export async function startStdio(opts: StartStdioOptions): Promise<void> {
  const server = createFreematicaServer({ client: opts.client });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

- [ ] **Step 2.2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2.3: Commit**

```bash
git add src/transports/stdio.ts
git commit -m "feat: add stdio transport helper"
```

---

## Task 3: Reescribir `src/index.ts` con dual transport

**Files:**

- Rewrite: `src/index.ts`

- [ ] **Step 3.1: Reemplazar todo el contenido de `src/index.ts`**

```ts
#!/usr/bin/env node
import { loadAuthConfig } from './config.js';
import { FreematicaClient } from './clients/freematica-client.js';

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const TRANSPORT = parseArg('transport') ?? process.env.MCP_TRANSPORT ?? 'stdio';

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

  if (TRANSPORT === 'http') {
    const { loadHttpConfig } = await import('./config.js');
    const { createHttpApp } = await import('./transports/http.js');
    const http = loadHttpConfig();

    const { app, shutdown } = await createHttpApp({
      port: http.MCP_PORT,
      client,
      allowedOrigins: http.MCP_ALLOWED_ORIGINS,
    });

    process.on('SIGTERM', () => {
      void shutdown().then(() => process.exit(0));
    });
    process.on('SIGINT', () => {
      void shutdown().then(() => process.exit(0));
    });

    app.listen(http.MCP_PORT, () => {
      console.error(
        `[freematica-mcp] HTTP transport listening on port ${http.MCP_PORT} | base=${auth.FREEMATICA_BASE_URL}`,
      );
      console.error(`[freematica-mcp] MCP endpoint:    http://localhost:${http.MCP_PORT}/mcp`);
      console.error(`[freematica-mcp] Health endpoint: http://localhost:${http.MCP_PORT}/health`);
    });
    return;
  }

  if (TRANSPORT !== 'stdio') {
    console.error(
      `[freematica-mcp] Unknown transport "${TRANSPORT}". Valid: stdio, http. Defaulting to stdio.`,
    );
  }

  console.error(
    `[freematica-mcp] Starting stdio transport v0.2.0 | base=${auth.FREEMATICA_BASE_URL}`,
  );
  const { startStdio } = await import('./transports/stdio.js');
  await startStdio({ client });
}

main().catch((err) => {
  console.error('[freematica-mcp] FATAL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 3.2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3.3: Build**

```bash
npm run build
```

Expected: PASS. `dist/index.js` contiene la nueva lógica.

- [ ] **Step 3.4: Smoke check manual — modo HTTP sigue funcionando**

```bash
MCP_TRANSPORT=http \
FREEMATICA_AUTH_TOKEN=t \
FREEMATICA_AUTH_COMPANY=c \
FREEMATICA_AUTH_ORGANIZATION=o \
FREEMATICA_AUTH_APP=a \
FREEMATICA_AUTH_SESSION=s \
node dist/index.js &
SERVER_PID=$!
sleep 1
curl -sf http://localhost:3000/health | grep -q '"status":"ok"' && echo "HTTP OK" || echo "HTTP FAIL"
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null
```

Expected: `HTTP OK`. Cualquier otra cosa significa que el modo HTTP se rompió.

- [ ] **Step 3.5: Smoke check manual — modo stdio falla limpiamente sin env vars**

```bash
node dist/index.js 2>&1 | head -10
```

Expected: mensaje claro listando los 5 `FREEMATICA_AUTH_*` requeridos. Exit code 1.

- [ ] **Step 3.6: Smoke check manual — modo stdio arranca con env vars y responde a initialize**

```bash
FREEMATICA_AUTH_TOKEN=t FREEMATICA_AUTH_COMPANY=c \
FREEMATICA_AUTH_ORGANIZATION=o FREEMATICA_AUTH_APP=a \
FREEMATICA_AUTH_SESSION=s \
sh -c 'echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-03-26\",\"capabilities\":{},\"clientInfo\":{\"name\":\"smoke\",\"version\":\"1\"}}}"; sleep 1' | node dist/index.js 2>/dev/null | head -1
```

Expected: una línea JSON con `"jsonrpc":"2.0"` y `"result":{...}` conteniendo `protocolVersion` y `serverInfo`. Si aparece, el modo stdio funciona end-to-end.

- [ ] **Step 3.7: Commit**

```bash
git add src/index.ts
git commit -m "feat: support dual transport (stdio default, http opt-in)"
```

---

## Task 4: Smoke test stdio en vitest

**Files:**

- Create: `tests/transports/stdio.test.ts`

- [ ] **Step 4.1: Crear el test**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST_INDEX = join(process.cwd(), 'dist', 'index.js');

const TEST_ENV = {
  FREEMATICA_AUTH_TOKEN: 'tok',
  FREEMATICA_AUTH_COMPANY: 'co',
  FREEMATICA_AUTH_ORGANIZATION: 'org',
  FREEMATICA_AUTH_APP: 'app',
  FREEMATICA_AUTH_SESSION: 'ses',
  MCP_TRANSPORT: 'stdio',
};

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

function spawnServer(): ChildProcessWithoutNullStreams {
  return spawn('node', [DIST_INDEX], {
    env: { ...process.env, ...TEST_ENV },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function sendRequest(
  proc: ChildProcessWithoutNullStreams,
  request: object,
): Promise<JsonRpcResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Timed out waiting for stdio response'));
    }, 5000);

    let buffer = '';
    const onData = (chunk: Buffer): void => {
      buffer += chunk.toString('utf8');
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx === -1) return;
      const line = buffer.slice(0, newlineIdx).trim();
      if (!line) return;
      clearTimeout(timeout);
      proc.stdout.off('data', onData);
      try {
        resolve(JSON.parse(line) as JsonRpcResponse);
      } catch (err) {
        reject(new Error(`Invalid JSON from server: ${line}`));
      }
    };
    proc.stdout.on('data', onData);

    proc.stdin.write(`${JSON.stringify(request)}\n`);
  });
}

describe('stdio transport (smoke)', () => {
  beforeAll(() => {
    if (!existsSync(DIST_INDEX)) {
      throw new Error(
        `dist/index.js not found at ${DIST_INDEX}. Run \`npm run build\` before this test.`,
      );
    }
  });

  it('responds to initialize handshake', async () => {
    const proc = spawnServer();
    try {
      const response = await sendRequest(proc, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'vitest-smoke', version: '1.0' },
        },
      });

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.error).toBeUndefined();
      const result = response.result as {
        protocolVersion: string;
        serverInfo: { name: string; version: string };
      };
      expect(result.protocolVersion).toBe('2025-03-26');
      expect(result.serverInfo.name).toBe('freematica-mcp');
    } finally {
      proc.kill('SIGTERM');
      await new Promise<void>((resolve) => proc.once('exit', () => resolve()));
    }
  });

  it('exits cleanly when stdin closes', async () => {
    const proc = spawnServer();
    proc.stdin.end();
    const exitCode = await new Promise<number | null>((resolve) => {
      proc.once('exit', (code) => resolve(code));
      setTimeout(() => {
        proc.kill('SIGKILL');
        resolve(-1);
      }, 5000);
    });
    expect(exitCode).not.toBe(-1);
  });
});
```

- [ ] **Step 4.2: Build (el test depende de dist/)**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4.3: Ejecutar el smoke test**

```bash
npm test -- tests/transports/stdio.test.ts
```

Expected: PASS (2 tests).

Si falla el test "responds to initialize handshake" por timeout, verifica:

- ¿El binario realmente arranca? Ejecuta manualmente `node dist/index.js` con los env vars del test (paso 3.6 del plan).
- ¿El SDK escribe la respuesta en stdout con `\n` final? Si el SDK usa otro framing (Content-Length headers, por ejemplo), el parser de `sendRequest` debe adaptarse. Comprueba leyendo logs del SDK en `node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js`.

Si el segundo test falla porque el proceso no termina al cerrar stdin: añadir un `proc.kill('SIGTERM')` antes del wait — pero esto enmascara el bug. Mejor reportarlo como BLOCKED para que el implementador investigue el `onclose` del transport del SDK.

- [ ] **Step 4.4: Verificar suite completa**

```bash
npm test
```

Expected: full suite PASS. Total tests > 30 (los 30 anteriores + 2 nuevos del smoke).

- [ ] **Step 4.5: Commit**

```bash
git add tests/transports/stdio.test.ts
git commit -m "test: add stdio transport smoke test (initialize + stdin close)"
```

---

## Task 5: Reordenar CI workflow (build antes que test)

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 5.1: Editar `.github/workflows/ci.yml`**

Reemplazar el bloque `steps:` por:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'npm'
  - run: npm ci
  - run: npm run lint
  - run: npm run typecheck
  - run: npm run build
  - run: npm test
```

(Cambio: `npm run build` ahora va antes que `npm test`, porque el smoke test stdio necesita `dist/index.js`.)

- [ ] **Step 5.2: Verificar localmente el orden funciona**

```bash
rm -rf dist
npm run lint && npm run typecheck && npm run build && npm test
```

Expected: PASS los 4 en orden.

- [ ] **Step 5.3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: build before test so stdio smoke can spawn dist/index.js"
```

---

## Task 6: Bump version + README + CHANGELOG

**Files:**

- Modify: `package.json` (version)
- Modify: `README.md` (sección "Modos de transporte" + ejemplos)
- Create: `CHANGELOG.md`

- [ ] **Step 6.1: Bump version en `package.json`**

Cambiar:

```json
"version": "0.1.0",
```

por:

```json
"version": "0.2.0",
```

Luego `npm install` para actualizar el lockfile (debe actualizar solo la entrada raíz):

```bash
npm install
```

Expected: 1 paquete actualizado (el propio root), sin otras alteraciones.

- [ ] **Step 6.2: Actualizar `README.md` — sección "Modos de transporte"**

Localiza la sección "## Endpoints HTTP" (alrededor de la línea 50 del README actual). **Inserta antes** una nueva sección "## Modos de transporte". El resultado queda así:

```md
## Modos de transporte

El binario soporta dos transportes seleccionables. La selección sigue este orden de precedencia:

1. CLI flag: `--transport=<modo>`
2. Variable de entorno: `MCP_TRANSPORT=<modo>`
3. Default: `stdio`

| Modo    | Cuándo usar                                  | Comando                                                                 |
| ------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| `stdio` | Claude Desktop, Claude Code, ejecución local | `mcp-freematica` (default) o `mcp-freematica --transport=stdio`         |
| `http`  | Nubiia, deploy como servicio web             | `mcp-freematica --transport=http` o `MCP_TRANSPORT=http mcp-freematica` |

### Configurar en Claude Desktop (stdio)

Edita `~/Library/Application Support/Claude/claude_desktop_config.json`:

\`\`\`json
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
\`\`\`

Reinicia Claude Desktop y la tool `freematica_list_materiales_asignados_servicios` aparecerá disponible.

### Configurar en Claude Code (stdio)

\`\`\`bash
claude mcp add freematica npx -y @nubiia/mcp-freematica \\
-e FREEMATICA_AUTH_TOKEN=... \\
-e FREEMATICA_AUTH_COMPANY=... \\
-e FREEMATICA_AUTH_ORGANIZATION=... \\
-e FREEMATICA_AUTH_APP=... \\
-e FREEMATICA_AUTH_SESSION=...
\`\`\`

### Configurar en Nubiia (HTTP)

Setear `MCP_TRANSPORT=http` en las variables de entorno del proceso. El resto de variables (puerto, origins) son las habituales — ver tabla en "Configuración" más arriba.
```

(Las triples backticks dentro del bloque están escapadas con `\` para que el README las renderice como literales. Al escribir el archivo, el Edit tool debe poner triples backticks reales — no incluir las barras invertidas.)

Importante: además de añadir la nueva sección, **eliminar** del README cualquier instrucción que diga "El servidor arranca por defecto en HTTP" o equivalente. El default ahora es stdio. Buscar y ajustar:

- En la sección "Configuración" (variables de entorno): aclarar que `MCP_PORT` y `MCP_ALLOWED_ORIGINS` aplican solo en modo HTTP.
- En la sección "Despliegue" → "Opción 1 — Instalar como paquete npm": ya menciona que se ejecuta como `mcp-freematica`; añadir `MCP_TRANSPORT=http` al ejemplo si el lector quiere HTTP (por defecto será stdio).
- En la sección "Verificación de la configuración": la verificación con `curl http://localhost:3000/health` solo aplica si el servidor está arrancado en modo HTTP — añadir nota.

- [ ] **Step 6.3: Crear `CHANGELOG.md`**

```md
# Changelog

Todas las versiones notables del paquete `@nubiia/mcp-freematica` se documentan aquí. Sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [0.2.0] — 2026-05-19

### Added

- Soporte para transporte **stdio** (default). Selección vía CLI `--transport=` o env `MCP_TRANSPORT`.
- `src/transports/stdio.ts` con `startStdio({ client })`.
- Smoke test E2E del modo stdio (spawn de `dist/index.js`, JSON-RPC initialize por stdin).
- Sección "Modos de transporte" en el README con ejemplos para Claude Desktop, Claude Code y Nubiia.

### Changed

- `src/config.ts` refactorizado: `loadAuthConfig()` + `loadHttpConfig()` independientes. `loadConfig()` se mantiene como wrapper retro-compat.
- `src/index.ts` reescrito para branching stdio/http con dynamic imports (evita cargar Express en modo stdio).
- CI: `npm run build` se ejecuta antes que `npm test` (el smoke test stdio necesita `dist/`).

### Breaking

- **Default del binario cambió de HTTP a stdio.** Si tu entorno (Nubiia u otro) ejecutaba el binario sin configurar transporte, hay que añadir `MCP_TRANSPORT=http` para mantener el comportamiento anterior.

## [0.1.0] — 2026-05-18

### Added

- Bootstrap inicial del MCP server.
- Tool: `freematica_list_materiales_asignados_servicios` → `GET /pvss/v2/contratos-servicios-material`.
- Transporte HTTP (Streamable) con Express + StreamableHTTPServerTransport.
- `FreematicaClient` (axios + 5 headers `x-auth-*`) + mapeo de errores HTTP a códigos normalizados.
- Configuración vía Zod (5 env vars `FREEMATICA_AUTH_*` obligatorias + 3 opcionales).
- 30 tests (vitest + nock), CI en GitHub Actions, Dockerfile multistage.
- Publicación en GitHub Packages como `@nubiia/mcp-freematica`.
```

- [ ] **Step 6.4: Validar todo**

```bash
npm run lint && npm run typecheck && npm run build && npm test
```

Expected: PASS los 4.

- [ ] **Step 6.5: Commit (todo junto)**

```bash
git add package.json package-lock.json README.md CHANGELOG.md
git commit -m "release: v0.2.0 — add stdio transport support"
```

---

## Task 7: PR + merge + tag v0.2.0 (requiere aprobación humana)

**Files:** ninguno (solo git/gh)

- [ ] **Step 7.1: STOP — presentar resumen al usuario para aprobación de push**

> "Implementación completa en `feat/stdio-transport`. He hecho N commits. Lint, typecheck, build, tests OK localmente. Voy a:
>
> 1. Push de `feat/stdio-transport` a remote.
> 2. PR contra `development`.
> 3. Esperar CI verde.
> 4. Merge squash a `development`.
> 5. PR de `development` → `main`.
> 6. Merge a `main`.
> 7. Tag `v0.2.0` + push (dispara el workflow `publish.yml` que publica en GitHub Packages).
>
> Antes de empezar, confirma:
>
> - ¿Algún cliente ya está corriendo v0.1.0 esperando HTTP? Si sí, recuerda añadirles `MCP_TRANSPORT=http` antes de actualizar a v0.2.0 (breaking change documentado en CHANGELOG).
>
> ¿Apruebas el flujo completo?"

**WAIT for explicit user approval before continuing.**

- [ ] **Step 7.2: Push feature branch**

```bash
git push -u origin feat/stdio-transport
```

- [ ] **Step 7.3: Crear PR contra development**

```bash
gh pr create --base development --head feat/stdio-transport \
  --title "feat: add stdio transport (v0.2.0)" \
  --body "$(cat <<'EOF'
## Resumen

Añade soporte para transporte stdio en el MCP server, manteniendo HTTP como modo opt-in.

## Cambios principales

- `src/config.ts` split en `loadAuthConfig` + `loadHttpConfig` (stdio no exige MCP_PORT).
- Nuevo `src/transports/stdio.ts` con `startStdio({ client })`.
- `src/index.ts` reescrito: branching stdio/http con dynamic imports.
- Smoke test E2E del modo stdio (spawn + JSON-RPC por stdin).
- CI: build antes que test.
- README: sección "Modos de transporte" con ejemplos Claude Desktop / Claude Code / Nubiia.
- CHANGELOG.md.

## Selección de transporte

CLI: `--transport=stdio|http`
Env: `MCP_TRANSPORT=stdio|http`
Default: `stdio`

## Breaking change

Default cambia de HTTP a stdio. Quien ejecute el binario sin configurar transporte (Nubiia incluido) debe añadir `MCP_TRANSPORT=http` antes del upgrade.

## Spec / Plan

- Spec: docs/superpowers/specs/2026-05-19-stdio-transport-design.md
- Plan: docs/superpowers/plans/2026-05-19-stdio-transport.md
EOF
)"
```

- [ ] **Step 7.4: Esperar CI y mergear PR**

```bash
until gh pr view --json statusCheckRollup --jq '.statusCheckRollup[0].status' 2>/dev/null | grep -q COMPLETED; do sleep 5; done
gh pr view --json statusCheckRollup --jq '.statusCheckRollup[0].conclusion'   # debe ser "SUCCESS"
gh pr merge --squash --delete-branch
```

- [ ] **Step 7.5: PR development → main**

```bash
git checkout development && git pull
gh pr create --base main --head development \
  --title "release: v0.2.0 — stdio transport" \
  --body "Lanza v0.2.0 a producción. Detalles en CHANGELOG.md y en el PR a development."
```

- [ ] **Step 7.6: Esperar CI y mergear**

```bash
until gh pr view --json statusCheckRollup --jq '.statusCheckRollup[0].status' 2>/dev/null | grep -q COMPLETED; do sleep 5; done
gh pr merge --merge --delete-branch=false
```

- [ ] **Step 7.7: Tag y push (dispara publish)**

```bash
git checkout main && git pull
git tag v0.2.0
git push origin v0.2.0
```

- [ ] **Step 7.8: Verificar publicación**

```bash
until gh run list --workflow=publish.yml --limit 1 --json status --jq '.[0].status' 2>/dev/null | grep -q completed; do sleep 5; done
gh run list --workflow=publish.yml --limit 1 --json conclusion --jq '.[0].conclusion'   # debe ser "success"
```

Si la conclusión es `success`, `@nubiia/mcp-freematica@0.2.0` ya está disponible en GitHub Packages.

---

## Self-Review (autor del plan)

**Spec coverage:**

| Spec section                   | Cubierto en                                        |
| ------------------------------ | -------------------------------------------------- |
| §2 Goals                       | Tasks 1, 2, 3                                      |
| §3 Non-goals                   | Respetado (no auto-detect, no WebSocket)           |
| §4 Decisiones de diseño        | Tasks 1 (split config), 3 (selección + defaults)   |
| §5 Estructura de archivos      | Distribuida en Tasks 1-6                           |
| §6.1 `src/config.ts`           | Task 1                                             |
| §6.2 `src/transports/stdio.ts` | Task 2                                             |
| §6.3 `src/index.ts`            | Task 3                                             |
| §6.4 `src/transports/http.ts`  | Sin cambios — no requiere task                     |
| §6.5 `src/server.ts` + tools   | Sin cambios — no requiere task                     |
| §7 Data flow stdio             | Verificado en Task 4 (smoke test)                  |
| §8 Manejo de errores           | Tasks 1 (env vars), 3 (unknown transport warn)     |
| §9 Testing                     | Tasks 1 (config), 4 (stdio smoke)                  |
| §10 README                     | Task 6                                             |
| §11 Out of scope               | Respetado (no se implementa)                       |
| §12 Open questions             | Task 7.1 (confirmar con el usuario antes del push) |

**Placeholder scan:** ✅ Sin "TBD" / "TODO" / "fill in details" / "implement later". Notas concretas en Task 4.3 (qué hacer si el SDK usa otro framing) y Task 4.4 (escalar como BLOCKED si el `onclose` no funciona) — son guías reales, no placeholders.

**Type consistency:**

- `AuthConfig` / `HttpConfig` / `Config` declarados en Task 1, usados en Tasks 3, 4.
- `loadAuthConfig` / `loadHttpConfig` / `loadConfig` consistentes en Tasks 1, 3, 4.
- `StartStdioOptions` / `startStdio` declarado en Task 2, usado en Task 3.
- `MCP_TRANSPORT` / `--transport=` aparición consistente en Tasks 3, 4, 5, 6.

**Git workflow:** Cumple las normas globales:

- Branch `feat/stdio-transport` desde `development` (ya hecho).
- Push y PR requieren aprobación humana (Task 7.1).
- Sin co-authored-by ni referencias a Claude/AI.
- Commits siguen formato convencional (`refactor:`, `feat:`, `test:`, `ci:`, `release:`).
