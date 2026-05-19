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
