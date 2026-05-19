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
    `[freematica-mcp] Starting stdio transport v0.3.0 | base=${auth.FREEMATICA_BASE_URL}`,
  );
  const { startStdio } = await import('./transports/stdio.js');
  await startStdio({ client });
}

main().catch((err) => {
  console.error('[freematica-mcp] FATAL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
