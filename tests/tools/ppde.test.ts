import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPpdeTools } from '../../src/tools/ppde.js';

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
  registerPpdeTools(server, client, { enableWrites });
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

describe('registerPpdeTools', () => {
  afterEach(() => nock.cleanAll());

  it('gate: reads sin enableWrites, writes ocultos', () => {
    const { server } = buildServer(false);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_ppde_configuracion_acceso_usuario');
    expect(tools).toHaveProperty('freematica_get_ppde_configuracion_acceso_usuario');
    expect(tools).toHaveProperty('freematica_list_ppde_personal_doc');
    expect(tools).toHaveProperty('freematica_get_ppde_personal_doc');
    expect(tools).toHaveProperty('freematica_list_ppde_solicitud_vacaciones');
    expect(tools).toHaveProperty('freematica_get_ppde_solicitud_vacacion');
    expect(tools).not.toHaveProperty('freematica_update_ppde_solicitud_vacacion');
    expect(tools).not.toHaveProperty('freematica_create_ppde_recordatorio_firma');
  });

  it('gate: writes con enableWrites', () => {
    const { server } = buildServer(true);
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_update_ppde_solicitud_vacacion');
    expect(tools).toHaveProperty('freematica_create_ppde_recordatorio_firma');
  });

  describe('freematica_list_ppde_solicitud_vacaciones', () => {
    it('happy path — GET /ppde/v2/solicitud-vacaciones', async () => {
      nock(BASE_URL)
        .get('/ppde/v2/solicitud-vacaciones')
        .query(true)
        .reply(200, { errorCode: '200', errorMessage: '', data: { items: [{ idReg: 'VAC1' }], total: 1 } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_ppde_solicitud_vacaciones', { page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/ppde/v2/solicitud-vacaciones')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_list_ppde_solicitud_vacaciones', { page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_ppde_solicitud_vacacion', () => {
    it('happy path — GET /ppde/v2/solicitud-vacaciones/:idreg', async () => {
      nock(BASE_URL)
        .get('/ppde/v2/solicitud-vacaciones/VAC001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { idReg: 'VAC001==' } });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_get_ppde_solicitud_vacacion', { idReg: 'VAC001==' });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/ppde/v2/solicitud-vacaciones/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const result = await callTool(server, 'freematica_get_ppde_solicitud_vacacion', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_ppde_solicitud_vacacion', () => {
    it('happy path — PUT /ppde/v2/solicitud-vacaciones/:idreg', async () => {
      nock(BASE_URL)
        .put('/ppde/v2/solicitud-vacaciones/VAC001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_ppde_solicitud_vacacion', {
        idReg: 'VAC001==',
        camposAdicionales: { ESTADO: 'A' },
      });

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/ppde/v2/solicitud-vacaciones/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_update_ppde_solicitud_vacacion', { idReg: 'ERR' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_ppde_recordatorio_firma', () => {
    it('happy path — POST /ppde/v2/recordatorio_firma', async () => {
      nock(BASE_URL)
        .post('/ppde/v2/recordatorio_firma')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_ppde_recordatorio_firma', {});

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/ppde/v2/recordatorio_firma')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer(true);
      const result = await callTool(server, 'freematica_create_ppde_recordatorio_firma', {});

      expect(result.isError).toBe(true);
    });
  });
});
