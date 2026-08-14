import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPfreeTools } from '../../src/tools/pfree.js';

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

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerPfreeTools(server, client);
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

describe('registerPfreeTools', () => {
  afterEach(() => nock.cleanAll());

  it('registra las 4 tools de lectura', () => {
    const { server } = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_pfree_ips');
    expect(tools).toHaveProperty('freematica_list_pfree_ips_erp');
    expect(tools).toHaveProperty('freematica_get_pfree_ip');
    expect(tools).toHaveProperty('freematica_get_pfree_ip_erp');
  });

  describe('freematica_list_pfree_ips', () => {
    it('happy path — GET /pfree/v2/ips', async () => {
      nock(BASE_URL)
        .get('/pfree/v2/ips')
        .query(true)
        .reply(200, { errorCode: '200', errorMessage: '', data: { items: [{ idReg: 'IP1' }], total: 1 } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pfree_ips', { page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pfree/v2/ips')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pfree_ips', { page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pfree_ip', () => {
    it('happy path — GET /pfree/v2/ips/:idReg', async () => {
      nock(BASE_URL)
        .get('/pfree/v2/ips/IP001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'IP001==' } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_get_pfree_ip', { idReg: 'IP001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pfree/v2/ips/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_get_pfree_ip', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pfree_ip_erp', () => {
    it('happy path — GET /pfree/v2/ips-erp/:idReg', async () => {
      nock(BASE_URL)
        .get('/pfree/v2/ips-erp/ERP001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'ERP001==' } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_get_pfree_ip_erp', { idReg: 'ERP001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pfree/v2/ips-erp/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_get_pfree_ip_erp', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });
});
