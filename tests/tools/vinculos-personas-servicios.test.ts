import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerVinculosPersonasServiciosTools } from '../../src/tools/vinculos-personas-servicios.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_vinculos_personas_servicios';
const GET_TOOL = 'freematica_get_vinculo_persona_servicio';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerVinculosPersonasServiciosTools(server, client);
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

function listEnv<T>(items: T[], total: number) {
  return {
    errorCode: '200',
    errorMessage: '',
    data: { total: String(total), items, rowHeight: -1 },
  };
}

function detailEnv<T>(item: T) {
  return { errorCode: '200', errorMessage: '', data: item };
}

describe('registerVinculosPersonasServiciosTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers both tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
    expect(tools).toHaveProperty(GET_TOOL);
  });

  // -------------------------------------------------------------------------
  // freematica_list_vinculos_personas_servicios
  // -------------------------------------------------------------------------

  describe('freematica_list_vinculos_personas_servicios', () => {
    it('returns paginated results with basic pagination', async () => {
      const fake = [{ CAMPO: 'valor1' }];
      nock(BASE_URL)
        .get('/pvss/v2/vinculos-personas-servicios')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 50));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(50);
      expect(parsed.page).toBe(1);
      expect(parsed.items_per_page).toBe(20);
    });

    it('sends order param when provided', async () => {
      const fake = [{ CAMPO: 'valor2' }];
      nock(BASE_URL)
        .get('/pvss/v2/vinculos-personas-servicios')
        .query({ items: '20', page: '1', order: 'CAMPO asc' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, order: 'CAMPO asc' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/vinculos-personas-servicios')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Boom', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_get_vinculo_persona_servicio
  // -------------------------------------------------------------------------

  describe('freematica_get_vinculo_persona_servicio', () => {
    it('returns the item for a valid idReg', async () => {
      const fake = { CAMPO: 'valor' };
      nock(BASE_URL)
        .get('/pvss/v2/vinculos-personas-servicios/VPS001%3D%3D')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, GET_TOOL);
      const result = (await handler({ idReg: 'VPS001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns error not_found when idReg does not exist', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/vinculos-personas-servicios/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, GET_TOOL);
      const result = (await handler({ idReg: 'BADID' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/vinculos-personas-servicios/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const server = buildServer();
      const handler = getHandler(server, GET_TOOL);
      const result = (await handler({ idReg: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });
});
