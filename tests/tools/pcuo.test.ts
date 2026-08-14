import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPcuoTools } from '../../src/tools/pcuo.js';

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
  registerPcuoTools(server, client, { enableWrites });
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

describe('registerPcuoTools', () => {
  afterEach(() => nock.cleanAll());

  it('gate: reads visibles sin enableWrites, writes ocultos', () => {
    const { server } = buildServer(false);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_pcuo_beneficiarios');
    expect(tools).toHaveProperty('freematica_get_pcuo_beneficiario');
    expect(tools).toHaveProperty('freematica_list_pcuo_partes');
    expect(tools).toHaveProperty('freematica_get_pcuo_parte');
    expect(tools).not.toHaveProperty('freematica_create_pcuo_beneficiario');
    expect(tools).not.toHaveProperty('freematica_update_pcuo_beneficiario');
    expect(tools).not.toHaveProperty('freematica_create_pcuo_parte');
    expect(tools).not.toHaveProperty('freematica_update_pcuo_parte');
  });

  it('gate: registra writes con enableWrites', () => {
    const { server } = buildServer(true);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_create_pcuo_beneficiario');
    expect(tools).toHaveProperty('freematica_update_pcuo_beneficiario');
    expect(tools).toHaveProperty('freematica_create_pcuo_parte');
    expect(tools).toHaveProperty('freematica_update_pcuo_parte');
  });

  describe('freematica_list_pcuo_beneficiarios', () => {
    it('happy path — GET /pcuo/v2/beneficiarios', async () => {
      nock(BASE_URL)
        .get('/pcuo/v2/beneficiarios')
        .query(true)
        .reply(200, { errorCode: '200', errorMessage: '', data: { items: [{ idReg: 'B1' }], total: 1 } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pcuo_beneficiarios', { page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pcuo/v2/beneficiarios')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pcuo_beneficiarios', { page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pcuo_beneficiario', () => {
    it('happy path — GET /pcuo/v2/beneficiarios/:idReg', async () => {
      nock(BASE_URL)
        .get('/pcuo/v2/beneficiarios/B001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'B001==' } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_get_pcuo_beneficiario', { idReg: 'B001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pcuo/v2/beneficiarios/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_get_pcuo_beneficiario', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_pcuo_beneficiario', () => {
    it('happy path — POST /pcuo/v2/beneficiarios', async () => {
      nock(BASE_URL)
        .post('/pcuo/v2/beneficiarios')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'NEW_B' } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pcuo_beneficiario', {
        camposAdicionales: { NOMBRE: 'Test' },
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pcuo/v2/beneficiarios')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pcuo_beneficiario', {});

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_pcuo_parte', () => {
    it('happy path — POST /pcuo/v2/partes', async () => {
      nock(BASE_URL)
        .post('/pcuo/v2/partes')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'NEW_P' } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pcuo_parte', {});

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pcuo/v2/partes')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pcuo_parte', {});

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_pcuo_beneficiario', () => {
    it('happy path — GET+PUT /pcuo/v2/beneficiarios/:idReg (fetch+merge)', async () => {
      nock(BASE_URL)
        .get('/pcuo/v2/beneficiarios/B001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'B001==' } });
      nock(BASE_URL)
        .put('/pcuo/v2/beneficiarios/B001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pcuo_beneficiario', { idReg: 'B001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pcuo/v2/beneficiarios/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pcuo_beneficiario', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_pcuo_parte', () => {
    it('happy path — GET+PUT /pcuo/v2/partes/:idReg (fetch+merge)', async () => {
      nock(BASE_URL)
        .get('/pcuo/v2/partes/PT001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'PT001==' } });
      nock(BASE_URL)
        .put('/pcuo/v2/partes/PT001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pcuo_parte', { idReg: 'PT001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pcuo/v2/partes/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pcuo_parte', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });
});
