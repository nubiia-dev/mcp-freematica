import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPvenEscriturasTools } from '../../src/tools/pven-escrituras.js';

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
  registerPvenEscriturasTools(server, client, { enableWrites });
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

describe('registerPvenEscriturasTools', () => {
  afterEach(() => nock.cleanAll());

  // -------------------------------------------------------------------------
  // Gate tests
  // -------------------------------------------------------------------------

  it('gate: no registra tools sin enableWrites', () => {
    const tools = (buildServer(false) as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).not.toHaveProperty('freematica_create_albaran_venta');
    expect(tools).not.toHaveProperty('freematica_update_albaran_fch_traspaso_ext');
    expect(tools).not.toHaveProperty('freematica_create_factura_estado');
    expect(tools).not.toHaveProperty('freematica_update_factura_electronica_v1');
    expect(tools).not.toHaveProperty('freematica_update_factura_electronica_v2');
    expect(tools).not.toHaveProperty('freematica_update_factura_leido');
  });

  it('registra todas las tools con enableWrites', () => {
    const tools = (buildServer(true) as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_create_albaran_venta');
    expect(tools).toHaveProperty('freematica_update_albaran_fch_traspaso_ext');
    expect(tools).toHaveProperty('freematica_create_factura_estado');
    expect(tools).toHaveProperty('freematica_update_factura_electronica_v1');
    expect(tools).toHaveProperty('freematica_update_factura_electronica_v2');
    expect(tools).toHaveProperty('freematica_update_factura_leido');
  });

  // -------------------------------------------------------------------------
  // freematica_create_albaran_venta
  // -------------------------------------------------------------------------

  describe('freematica_create_albaran_venta', () => {
    it('happy path — POST /pven/v2/albaranes-ventas', async () => {
      const fakeData = { ALVC_NUMDOC: '123' };
      nock(BASE_URL)
        .post('/pven/v2/albaranes-ventas')
        .reply(200, { errorCode: '200', errorMessage: '', data: fakeData });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_create_albaran_venta', {
        camposAlbaran: { ALVC_CODEMP: '0001', ALVC_DELEG: 'MAD' },
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.ALVC_NUMDOC).toBe('123');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pven/v2/albaranes-ventas')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_create_albaran_venta', {
        camposAlbaran: {},
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_albaran_fch_traspaso_ext
  // -------------------------------------------------------------------------

  describe('freematica_update_albaran_fch_traspaso_ext', () => {
    it('happy path — PUT /pven/v2/albaranes-ventas-fechatraspasoext/:idReg', async () => {
      nock(BASE_URL)
        .put('/pven/v2/albaranes-ventas-fechatraspasoext/ALB001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_albaran_fch_traspaso_ext', {
        idReg: 'ALB001==',
        camposAlbaran: { ALVC_FCH_TRASPASO_EXT: '2026-08-01' },
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pven/v2/albaranes-ventas-fechatraspasoext/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_albaran_fch_traspaso_ext', {
        idReg: 'ERR',
      });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_create_factura_estado
  // -------------------------------------------------------------------------

  describe('freematica_create_factura_estado', () => {
    it('happy path — POST /pven/v1/facturas/estados', async () => {
      nock(BASE_URL)
        .post('/pven/v1/facturas/estados')
        .reply(200, { errorCode: '200', errorMessage: '', data: { FE_ID: 'EST001' } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_create_factura_estado', {
        camposFact: { FE_ESTADO: 'ENVIADA' },
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.FE_ID).toBe('EST001');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pven/v1/facturas/estados')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_create_factura_estado', {
        camposFact: {},
      });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_factura_electronica_v1
  // -------------------------------------------------------------------------

  describe('freematica_update_factura_electronica_v1', () => {
    it('happy path — PUT /pven/v1/facturas/:idReg', async () => {
      nock(BASE_URL)
        .put('/pven/v1/facturas/FAC001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_factura_electronica_v1', {
        idReg: 'FAC001==',
        FACED_ESTADO: 'ACEPTADA',
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pven/v1/facturas/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_factura_electronica_v1', {
        idReg: 'ERR',
      });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_factura_electronica_v2
  // -------------------------------------------------------------------------

  describe('freematica_update_factura_electronica_v2', () => {
    it('happy path — PUT /pven/v2/facturas/:idReg', async () => {
      nock(BASE_URL)
        .put('/pven/v2/facturas/FAC002%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_factura_electronica_v2', {
        idReg: 'FAC002==',
        FACED_TIPO: 'F',
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pven/v2/facturas/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_factura_electronica_v2', {
        idReg: 'ERR',
      });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_factura_leido
  // -------------------------------------------------------------------------

  describe('freematica_update_factura_leido', () => {
    it('happy path — PUT /pven/v1/facturas/:idReg/leido', async () => {
      nock(BASE_URL)
        .put('/pven/v1/facturas/FAC003%3D%3D/leido')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_factura_leido', {
        idReg: 'FAC003==',
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pven/v1/facturas/ERR/leido')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_factura_leido', {
        idReg: 'ERR',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });
});
