import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPcmpEscriturasTools } from '../../src/tools/pcmp-escrituras.js';

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
  registerPcmpEscriturasTools(server, client, { enableWrites });
  return server;
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

describe('registerPcmpEscriturasTools', () => {
  afterEach(() => nock.cleanAll());

  // -------------------------------------------------------------------------
  // Gate tests
  // -------------------------------------------------------------------------

  it('registra list_propuestas_compra sin enableWrites (lectura siempre disponible)', () => {
    const tools = (buildServer(false) as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_propuestas_compra');
  });

  it('gate: no registra tools de escritura sin enableWrites', () => {
    const tools = (buildServer(false) as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).not.toHaveProperty('freematica_update_factura_compra');
    expect(tools).not.toHaveProperty('freematica_update_pedido_fechas');
    expect(tools).not.toHaveProperty('freematica_recibir_pedido');
    expect(tools).not.toHaveProperty('freematica_create_propuesta_compra');
  });

  it('registra todas las tools con enableWrites', () => {
    const tools = (buildServer(true) as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_propuestas_compra');
    expect(tools).toHaveProperty('freematica_update_factura_compra');
    expect(tools).toHaveProperty('freematica_update_pedido_fechas');
    expect(tools).toHaveProperty('freematica_recibir_pedido');
    expect(tools).toHaveProperty('freematica_create_propuesta_compra');
  });

  // -------------------------------------------------------------------------
  // freematica_list_propuestas_compra
  // -------------------------------------------------------------------------

  describe('freematica_list_propuestas_compra', () => {
    it('happy path — GET /pcmp/v1/propuestas', async () => {
      nock(BASE_URL)
        .get('/pcmp/v1/propuestas')
        .query(true)
        .reply(200, {
          errorCode: '200',
          errorMessage: '',
          data: { items: [{ idReg: 'PP001' }], count: 1, total: 1 },
        });

      const server = buildServer(false);
      const result = await callTool(server, 'freematica_list_propuestas_compra', {
        page: 1,
        items: 20,
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].idReg).toBe('PP001');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pcmp/v1/propuestas')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(false);
      const result = await callTool(server, 'freematica_list_propuestas_compra', {});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_factura_compra
  // -------------------------------------------------------------------------

  describe('freematica_update_factura_compra', () => {
    it('happy path — PUT /pcmp/v2/facturas-compras/:idReg', async () => {
      nock(BASE_URL)
        .put('/pcmp/v2/facturas-compras/FCC001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_factura_compra', {
        idReg: 'FCC001==',
        FCC_CODEMP: '0001',
        FCC_SERIEFRA: 'A',
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pcmp/v2/facturas-compras/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_factura_compra', {
        idReg: 'ERR',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_pedido_fechas
  // -------------------------------------------------------------------------

  describe('freematica_update_pedido_fechas', () => {
    it('happy path — PUT /pcmp/v2/pedidos-fechas/:idReg', async () => {
      nock(BASE_URL)
        .put('/pcmp/v2/pedidos-fechas/PED001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_pedido_fechas', {
        idReg: 'PED001==',
        ALCC_FCHENTREGA: '2026-09-01',
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pcmp/v2/pedidos-fechas/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_pedido_fechas', {
        idReg: 'ERR',
      });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_recibir_pedido
  // -------------------------------------------------------------------------

  describe('freematica_recibir_pedido', () => {
    it('happy path — PUT /pcmp/v2/control/recibir-pedidos/:idReg', async () => {
      nock(BASE_URL)
        .put('/pcmp/v2/control/recibir-pedidos/PED002%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_recibir_pedido', {
        idReg: 'PED002==',
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pcmp/v2/control/recibir-pedidos/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_recibir_pedido', {
        idReg: 'ERR',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_create_propuesta_compra
  // -------------------------------------------------------------------------

  describe('freematica_create_propuesta_compra', () => {
    it('happy path — POST /pcmp/v1/propuestas', async () => {
      nock(BASE_URL)
        .post('/pcmp/v1/propuestas')
        .reply(200, { errorCode: '200', errorMessage: '', data: { PPCC_NUMPROP: 42 } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_create_propuesta_compra', {
        PPCC_CODEMP: '0001',
        PPCC_DELEG: 'MAD',
        PPCC_FCHPROP: '2026-08-14',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.PPCC_NUMPROP).toBe(42);
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pcmp/v1/propuestas')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_create_propuesta_compra', {});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });
});
