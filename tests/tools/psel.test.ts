import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPselTools } from '../../src/tools/psel.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer(enableWrites = false) {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerPselTools(server, client, { enableWrites });
  return { server, client };
}

function getHandler(server: McpServer, name: string) {
  const tools = (server as unknown as { _registeredTools: Record<string, ToolEntry> })._registeredTools;
  const t = tools[name];
  if (!t) throw new Error(`Tool not registered: ${name}`);
  const fn = t.handler ?? t.callback;
  if (!fn) throw new Error(`No handler for: ${name}`);
  return fn;
}

type ToolResult = { content: { type: string; text: string }[]; isError?: boolean };

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const handler = getHandler(server, name);
  return (await handler(args)) as ToolResult;
}

describe('registerPselTools', () => {
  afterEach(() => nock.cleanAll());

  it('gate: no registra tools sin enableWrites', () => {
    const { server } = buildServer(false);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).not.toHaveProperty('freematica_create_psel_candidato');
  });

  it('gate: registra tool con enableWrites', () => {
    const { server } = buildServer(true);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_create_psel_candidato');
  });

  describe('freematica_create_psel_candidato', () => {
    it('happy path — POST /psel/v2/control/candidatos', async () => {
      nock(BASE_URL)
        .post('/psel/v2/control/candidatos')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'CAND1' } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_psel_candidato', {
        camposAdicionales: { NOMBRE: 'Test Candidato' },
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.idReg).toBe('CAND1');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/psel/v2/control/candidatos')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_psel_candidato', {});

      expect(result.isError).toBe(true);
    });
  });
});
