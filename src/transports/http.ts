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
    config.allowedOrigins === '*'
      ? true
      : config.allowedOrigins.split(',').map((s) => s.trim());

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
    res.json({ status: 'ok', version: '0.2.0', sessions: sessions.size });
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
  const pruneInterval = setInterval(() => {
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
  }, 5 * 60 * 1000);

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
