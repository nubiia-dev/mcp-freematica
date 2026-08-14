import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPkaiTools } from '../../src/tools/pkai.js';

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
  registerPkaiTools(server, client, { enableWrites });
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

describe('registerPkaiTools', () => {
  afterEach(() => nock.cleanAll());

  it('gate: registra tools de lectura sin enableWrites', () => {
    const { server } = buildServer(false);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_pkai_historicos_v1');
    expect(tools).toHaveProperty('freematica_list_pkai_historicos_v2');
    expect(tools).toHaveProperty('freematica_list_pkai_tipos_marcajes');
    expect(tools).not.toHaveProperty('freematica_create_pkai_marcaje');
  });

  it('gate: registra tools de escritura con enableWrites', () => {
    const { server } = buildServer(true);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_create_pkai_marcaje');
  });

  describe('freematica_list_pkai_historicos_v1', () => {
    it('happy path — GET /pkai/v1/historicos', async () => {
      nock(BASE_URL)
        .get('/pkai/v1/historicos')
        .query(true)
        .reply(200, { errorCode: '200', errorMessage: '', data: { items: [{ idReg: 'H1' }], total: 1 } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pkai_historicos_v1', { page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pkai/v1/historicos')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pkai_historicos_v1', { page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_list_pkai_historicos_v2', () => {
    it('happy path — GET /pkai/v2/historicos', async () => {
      nock(BASE_URL)
        .get('/pkai/v2/historicos')
        .query(true)
        .reply(200, { errorCode: '200', errorMessage: '', data: { items: [], total: 0 } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pkai_historicos_v2', { page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pkai/v2/historicos')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pkai_historicos_v2', { page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_pkai_marcaje', () => {
    it('happy path — POST /pkai/v1/marcajes', async () => {
      nock(BASE_URL)
        .post('/pkai/v1/marcajes')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'M1' } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pkai_marcaje', {
        camposAdicionales: { TIPO: 'E' },
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pkai/v1/marcajes')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pkai_marcaje', {});

      expect(result.isError).toBe(true);
    });
  });
});
