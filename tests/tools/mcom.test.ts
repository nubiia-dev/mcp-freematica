import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerMcomTools } from '../../src/tools/mcom.js';

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
  registerMcomTools(server, client, { enableWrites });
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

describe('registerMcomTools', () => {
  afterEach(() => nock.cleanAll());

  it('gate: reads sin enableWrites, writes ocultos', () => {
    const { server } = buildServer(false);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_mcom_usuarios');
    expect(tools).toHaveProperty('freematica_get_mcom_usuario');
    expect(tools).not.toHaveProperty('freematica_create_mcom_usuario');
    expect(tools).not.toHaveProperty('freematica_update_mcom_usuario');
  });

  it('gate: writes con enableWrites', () => {
    const { server } = buildServer(true);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_create_mcom_usuario');
    expect(tools).toHaveProperty('freematica_update_mcom_usuario');
  });

  describe('freematica_list_mcom_usuarios', () => {
    it('happy path — GET /mcom/v2/usuarios', async () => {
      nock(BASE_URL)
        .get('/mcom/v2/usuarios')
        .query(true)
        .reply(200, { errorCode: '200', errorMessage: '', data: { items: [{ idReg: 'U1' }], total: 1 } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_mcom_usuarios', { page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/mcom/v2/usuarios')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_mcom_usuarios', { page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_mcom_usuario', () => {
    it('happy path — GET /mcom/v2/usuarios/:idReg', async () => {
      nock(BASE_URL)
        .get('/mcom/v2/usuarios/U001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'U001==' } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_get_mcom_usuario', { idReg: 'U001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/mcom/v2/usuarios/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_get_mcom_usuario', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_mcom_usuario', () => {
    it('happy path — POST /mcom/v2/usuarios', async () => {
      nock(BASE_URL)
        .post('/mcom/v2/usuarios')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'NEW_U' } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_mcom_usuario', {
        camposAdicionales: { LOGIN: 'test@example.com' },
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/mcom/v2/usuarios')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_mcom_usuario', {});

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_mcom_usuario', () => {
    it('happy path — GET+PUT /mcom/v2/usuarios/:idReg (fetch+merge)', async () => {
      nock(BASE_URL)
        .get('/mcom/v2/usuarios/U001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'U001==' } });
      nock(BASE_URL)
        .put('/mcom/v2/usuarios/U001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_mcom_usuario', { idReg: 'U001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/mcom/v2/usuarios/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_mcom_usuario', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });
});
