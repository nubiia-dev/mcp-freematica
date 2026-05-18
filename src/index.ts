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
