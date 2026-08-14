import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPedvTools } from '../../src/tools/pedv.js';

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
  registerPedvTools(server, client, { enableWrites });
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

describe('registerPedvTools', () => {
  afterEach(() => nock.cleanAll());

  it('gate: registra reads sin enableWrites, oculta writes', () => {
    const { server } = buildServer(false);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_pedv_pedidos');
    expect(tools).toHaveProperty('freematica_list_pedv_pedidos_lineas');
    expect(tools).not.toHaveProperty('freematica_create_pedv_pedido_servir');
    expect(tools).not.toHaveProperty('freematica_update_pedv_servir_pedido_v2');
  });

  describe('freematica_list_pedv_pedidos', () => {
    it('happy path — GET /pedv/v1/pedidos', async () => {
      nock(BASE_URL)
        .get('/pedv/v1/pedidos')
        .query(true)
        .reply(200, { errorCode: '200', errorMessage: '', data: { items: [{ idReg: 'PED1' }], total: 1 } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pedv_pedidos', { page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pedv/v1/pedidos')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pedv_pedidos', { page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_pedv_pedido_servir', () => {
    it('happy path — POST /pedv/v1/pedidos/:idreg/servir', async () => {
      nock(BASE_URL)
        .post('/pedv/v1/pedidos/PED001%3D%3D/servir')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pedv_pedido_servir', {
        idReg: 'PED001==',
        camposAdicionales: {},
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pedv/v1/pedidos/ERR/servir')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pedv_pedido_servir', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_pedv_servir_pedido_v2', () => {
    it('happy path — PUT /pedv/v2/control/servir-pedidos/:idReg', async () => {
      nock(BASE_URL)
        .put('/pedv/v2/control/servir-pedidos/PED001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pedv_servir_pedido_v2', {
        idReg: 'PED001==',
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pedv/v2/control/servir-pedidos/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pedv_servir_pedido_v2', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });
});
