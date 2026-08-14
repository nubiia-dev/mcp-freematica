import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPvssEscriturasTools } from '../../src/tools/pvss-escrituras.js';

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
  registerPvssEscriturasTools(server, client, { enableWrites });
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

describe('registerPvssEscriturasTools', () => {
  afterEach(() => nock.cleanAll());

  // -------------------------------------------------------------------------
  // Gate tests
  // -------------------------------------------------------------------------

  it('gate: no registra tools sin enableWrites', () => {
    const tools = (buildServer(false) as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).not.toHaveProperty('freematica_update_cuadrante');
    expect(tools).not.toHaveProperty('freematica_create_campo_estadistico');
    expect(tools).not.toHaveProperty('freematica_update_campo_estadistico');
    expect(tools).not.toHaveProperty('freematica_create_informe_control');
    expect(tools).not.toHaveProperty('freematica_update_servicio_fch_fin');
  });

  it('registra todas las tools con enableWrites', () => {
    const tools = (buildServer(true) as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_update_cuadrante');
    expect(tools).toHaveProperty('freematica_create_campo_estadistico');
    expect(tools).toHaveProperty('freematica_update_campo_estadistico');
    expect(tools).toHaveProperty('freematica_create_informe_control');
    expect(tools).toHaveProperty('freematica_update_servicio_fch_fin');
  });

  // -------------------------------------------------------------------------
  // freematica_update_cuadrante
  // -------------------------------------------------------------------------

  describe('freematica_update_cuadrante', () => {
    it('happy path — PUT /pvss/v2/cuadrante/:idReg', async () => {
      nock(BASE_URL)
        .put('/pvss/v2/cuadrante/CU001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_cuadrante', {
        idReg: 'CU001==',
        camposAdicionales: { CAMPO_X: 'valor' },
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pvss/v2/cuadrante/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_cuadrante', {
        idReg: 'ERR',
      });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_create_campo_estadistico
  // -------------------------------------------------------------------------

  describe('freematica_create_campo_estadistico', () => {
    it('happy path — POST /pvss/v2/campos-estadisticos', async () => {
      nock(BASE_URL)
        .post('/pvss/v2/campos-estadisticos')
        .reply(200, { errorCode: '200', errorMessage: '', data: { CAMPO_ID: 'CE001' } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_create_campo_estadistico', {
        camposAdicionales: { CE_NOMBRE: 'Campo Test' },
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.CAMPO_ID).toBe('CE001');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pvss/v2/campos-estadisticos')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_create_campo_estadistico', {});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_campo_estadistico
  // -------------------------------------------------------------------------

  describe('freematica_update_campo_estadistico', () => {
    it('happy path — PUT /pvss/v2/campos-estadisticos/:idReg', async () => {
      nock(BASE_URL)
        .put('/pvss/v2/campos-estadisticos/CE001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_campo_estadistico', {
        idReg: 'CE001==',
        camposAdicionales: { CE_VALOR: 42 },
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pvss/v2/campos-estadisticos/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_campo_estadistico', {
        idReg: 'ERR',
      });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_create_informe_control
  // -------------------------------------------------------------------------

  describe('freematica_create_informe_control', () => {
    it('happy path — POST /pvss/v2/informes-control', async () => {
      nock(BASE_URL)
        .post('/pvss/v2/informes-control')
        .reply(200, { errorCode: '200', errorMessage: '', data: { IC_ID: 'IC001' } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_create_informe_control', {
        camposAdicionales: { IC_TIPO: 'PRESENCIA' },
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.IC_ID).toBe('IC001');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pvss/v2/informes-control')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_create_informe_control', {});

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_servicio_fch_fin
  // -------------------------------------------------------------------------

  describe('freematica_update_servicio_fch_fin', () => {
    it('happy path — PUT /pvss/v2/servicios-fch-fin/:idReg', async () => {
      nock(BASE_URL)
        .put('/pvss/v2/servicios-fch-fin/SV001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_servicio_fch_fin', {
        idReg: 'SV001==',
        CTRTS_FCH_FIN: '2026-12-31',
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pvss/v2/servicios-fch-fin/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const result = await callTool(server, 'freematica_update_servicio_fch_fin', {
        idReg: 'ERR',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });
});
