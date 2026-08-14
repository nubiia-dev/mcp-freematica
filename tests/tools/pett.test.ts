import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPettTools } from '../../src/tools/pett.js';

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
  registerPettTools(server, client, { enableWrites });
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

describe('registerPettTools', () => {
  afterEach(() => nock.cleanAll());

  // -------------------------------------------------------------------------
  // Gate tests
  // -------------------------------------------------------------------------

  it('gate: registra tools de lectura sin enableWrites', () => {
    const { server } = buildServer(false);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_pett_peticiones_serv');
    expect(tools).toHaveProperty('freematica_list_pett_peticiones_serv_perso');
    expect(tools).toHaveProperty('freematica_list_pett_ofertas');
    expect(tools).toHaveProperty('freematica_list_pett_partes_ett_c');
    expect(tools).not.toHaveProperty('freematica_create_pett_peticion_serv');
    expect(tools).not.toHaveProperty('freematica_update_pett_peticion_serv');
  });

  it('gate: registra todas las tools con enableWrites', () => {
    const { server } = buildServer(true);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_create_pett_peticion_serv');
    expect(tools).toHaveProperty('freematica_create_pett_peticion_serv_perso');
    expect(tools).toHaveProperty('freematica_update_pett_peticion_serv');
    expect(tools).toHaveProperty('freematica_update_pett_peticion_serv_perso_estado');
    expect(tools).toHaveProperty('freematica_update_pett_peticion_serv_duplicar');
    expect(tools).toHaveProperty('freematica_create_pett_gestion_partes_ett_c');
    expect(tools).toHaveProperty('freematica_update_pett_proceso_servicio_fin');
    expect(tools).toHaveProperty('freematica_update_pett_proceso_servicio');
    expect(tools).toHaveProperty('freematica_update_pett_proceso_servicio_prorroga');
  });

  // -------------------------------------------------------------------------
  // freematica_list_pett_peticiones_serv
  // -------------------------------------------------------------------------

  describe('freematica_list_pett_peticiones_serv', () => {
    it('happy path — GET /pett/v2/peticiones-serv', async () => {
      nock(BASE_URL)
        .get('/pett/v2/peticiones-serv')
        .query(true)
        .reply(200, { errorCode: '200', errorMessage: '', data: { items: [{ idReg: 'P1' }], total: 1 } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pett_peticiones_serv', { page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pett/v2/peticiones-serv')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pett_peticiones_serv', { page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_pett_ofertas
  // -------------------------------------------------------------------------

  describe('freematica_list_pett_ofertas', () => {
    it('happy path — GET /pett/v2/ofertas', async () => {
      nock(BASE_URL)
        .get('/pett/v2/ofertas')
        .query(true)
        .reply(200, { errorCode: '200', errorMessage: '', data: { items: [], total: 0 } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pett_ofertas', { page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pett/v2/ofertas')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_pett_ofertas', { page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_create_pett_peticion_serv (write)
  // -------------------------------------------------------------------------

  describe('freematica_create_pett_peticion_serv', () => {
    it('happy path — POST /pett/v2/peticiones-serv', async () => {
      nock(BASE_URL)
        .post('/pett/v2/peticiones-serv')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'NEW1' } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pett_peticion_serv', {
        camposAdicionales: { CAMPO: 'valor' },
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.idReg).toBe('NEW1');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pett/v2/peticiones-serv')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pett_peticion_serv', {});

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_pett_peticion_serv_duplicar (no body)
  // -------------------------------------------------------------------------

  describe('freematica_update_pett_peticion_serv_duplicar', () => {
    it('happy path — PUT /pett/v2/peticiones-serv/duplicar/:idreg', async () => {
      nock(BASE_URL)
        .put('/pett/v2/peticiones-serv/duplicar/P001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'P002' } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pett_peticion_serv_duplicar', { idReg: 'P001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pett/v2/peticiones-serv/duplicar/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pett_peticion_serv_duplicar', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_pett_peticion_serv_perso_estado (write)
  // -------------------------------------------------------------------------

  describe('freematica_update_pett_peticion_serv_perso_estado', () => {
    it('happy path — PUT /pett/v2/peticiones-serv/perso/estado/:idreg', async () => {
      nock(BASE_URL)
        .put('/pett/v2/peticiones-serv/perso/estado/S001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pett_peticion_serv_perso_estado', { idReg: 'S001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pett/v2/peticiones-serv/perso/estado/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pett_peticion_serv_perso_estado', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_create_pett_peticion_serv_perso (write)
  // -------------------------------------------------------------------------

  describe('freematica_create_pett_peticion_serv_perso', () => {
    it('happy path — POST /pett/v2/peticiones-serv/perso', async () => {
      nock(BASE_URL)
        .post('/pett/v2/peticiones-serv/perso')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'NEW2' } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pett_peticion_serv_perso', {
        camposAdicionales: { CAMPO: 'valor' },
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.idReg).toBe('NEW2');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pett/v2/peticiones-serv/perso')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pett_peticion_serv_perso', {});

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_create_pett_gestion_partes_ett_c (write)
  // -------------------------------------------------------------------------

  describe('freematica_create_pett_gestion_partes_ett_c', () => {
    it('happy path — POST /pett/v1/gestion_partes_ett_c', async () => {
      nock(BASE_URL)
        .post('/pett/v1/gestion_partes_ett_c')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'G1' } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pett_gestion_partes_ett_c', {
        camposAdicionales: { CAMPO: 'valor' },
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.idReg).toBe('G1');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pett/v1/gestion_partes_ett_c')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_pett_gestion_partes_ett_c', {});

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_pett_proceso_servicio_fin (write)
  // -------------------------------------------------------------------------

  describe('freematica_update_pett_proceso_servicio_fin', () => {
    it('happy path — PUT /pett/v2/procesos_servicio_fin/:idreg', async () => {
      nock(BASE_URL)
        .put('/pett/v2/procesos_servicio_fin/F001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pett_proceso_servicio_fin', { idReg: 'F001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pett/v2/procesos_servicio_fin/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pett_proceso_servicio_fin', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_pett_proceso_servicio (write)
  // -------------------------------------------------------------------------

  describe('freematica_update_pett_proceso_servicio', () => {
    it('happy path — PUT /pett/v2/procesos-servicio/:idreg', async () => {
      nock(BASE_URL)
        .put('/pett/v2/procesos-servicio/P001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pett_proceso_servicio', { idReg: 'P001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pett/v2/procesos-servicio/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pett_proceso_servicio', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_pett_proceso_servicio_prorroga (write)
  // -------------------------------------------------------------------------

  describe('freematica_update_pett_proceso_servicio_prorroga', () => {
    it('happy path — PUT /pett/v2/procesos-servicio-prorrogas/:idreg', async () => {
      nock(BASE_URL)
        .put('/pett/v2/procesos-servicio-prorrogas/PR001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pett_proceso_servicio_prorroga', { idReg: 'PR001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pett/v2/procesos-servicio-prorrogas/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_pett_proceso_servicio_prorroga', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });
});
