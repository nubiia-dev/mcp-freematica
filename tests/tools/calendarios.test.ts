import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerCalendariosTools } from '../../src/tools/calendarios.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_CAL_TOOL = 'freematica_list_calendarios';
const LIST_PER_TOOL = 'freematica_list_calendario_periodos';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerCalendariosTools(server, client);
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

describe('registerCalendariosTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers both calendarios tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_CAL_TOOL);
    expect(tools).toHaveProperty(LIST_PER_TOOL);
  });

  // -------------------------------------------------------------------------
  // freematica_list_calendarios
  // -------------------------------------------------------------------------

  describe('freematica_list_calendarios', () => {
    it('returns paginated list with default pagination', async () => {
      const fake = [{ idReg: 'cal001', NOMBRE: 'Calendario 2025' }];
      nock(BASE_URL)
        .get('/pgrl/v1/calendarios')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 5));

      const server = buildServer();
      const handler = getHandler(server, LIST_CAL_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(5);
      expect(parsed.page).toBe(1);
      expect(parsed.items_per_page).toBe(20);
    });

    it('returns second page correctly', async () => {
      const fake = [{ idReg: 'cal003', NOMBRE: 'Calendario 2023' }];
      nock(BASE_URL)
        .get('/pgrl/v1/calendarios')
        .query({ items: '2', page: '2' })
        .reply(200, listEnv(fake, 5));

      const server = buildServer();
      const handler = getHandler(server, LIST_CAL_TOOL);
      const result = (await handler({ page: 2, items: 2 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.page).toBe(2);
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pgrl/v1/calendarios')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_CAL_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });

    it('returns error invalid_token on 401', async () => {
      nock(BASE_URL)
        .get('/pgrl/v1/calendarios')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_CAL_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('invalid_token');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_calendario_periodos
  // -------------------------------------------------------------------------

  describe('freematica_list_calendario_periodos', () => {
    it('returns periodos for a valid idCalendario', async () => {
      const fake = [
        { FECHA_INICIO: '2025-01-01', FECHA_FIN: '2025-12-31', TIPO: 'LABORAL' },
      ];
      nock(BASE_URL)
        .get('/pgrl/v1/calendarios/cal001/periodos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 12));

      const server = buildServer();
      const handler = getHandler(server, LIST_PER_TOOL);
      const result = (await handler({ idCalendario: 'cal001', page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(12);
      expect(parsed.page).toBe(1);
    });

    it('url-encodes idCalendario correctly', async () => {
      const fake = [{ FECHA_INICIO: '2025-01-01' }];
      nock(BASE_URL)
        .get('/pgrl/v1/calendarios/cal%2B001%3D%3D/periodos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_PER_TOOL);
      const result = (await handler({ idCalendario: 'cal+001==', page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error not_found when calendar does not exist', async () => {
      nock(BASE_URL)
        .get('/pgrl/v1/calendarios/NOCALENDAR/periodos')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_PER_TOOL);
      const result = (await handler({ idCalendario: 'NOCALENDAR', page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pgrl/v1/calendarios/cal001/periodos')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_PER_TOOL);
      const result = (await handler({ idCalendario: 'cal001', page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });
});
