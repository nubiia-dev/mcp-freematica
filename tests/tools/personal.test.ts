import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPersonalTools } from '../../src/tools/personal.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_personal';
const GET_TOOL = 'freematica_get_persona';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerPersonalTools(server, client);
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

describe('registerPersonalTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers both personal tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
    expect(tools).toHaveProperty(GET_TOOL);
  });

  // -------------------------------------------------------------------------
  // freematica_list_personal
  // -------------------------------------------------------------------------

  describe('freematica_list_personal', () => {
    it('returns paginated results with no filters', async () => {
      const fake = [{ VSSPER_COD: 'P001', VSSPER_NOM: 'Juan' }];
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 200));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(200);
      expect(parsed.page).toBe(1);
      expect(parsed.items_per_page).toBe(20);
    });

    it('sends empresa and delegacion as FIQL rquery', async () => {
      const fake = [{ VSSPER_EMP: '1', VSSPER_DELEG: 'MAD' }];
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1', rquery: 'VSSPER_EMP==1;VSSPER_DELEG==MAD' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, empresa: '1', delegacion: 'MAD' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('translates activo=true to VSSPER_ACTIVO==S in FIQL', async () => {
      const fake = [{ VSSPER_ACTIVO: 'S', VSSPER_COD: 'P002' }];
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1', rquery: 'VSSPER_ACTIVO==S' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, activo: true })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('translates activo=false to VSSPER_ACTIVO==N in FIQL', async () => {
      const fake = [{ VSSPER_ACTIVO: 'N', VSSPER_COD: 'P003' }];
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1', rquery: 'VSSPER_ACTIVO==N' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, activo: false })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('sends nombre and apellido as FIQL fields', async () => {
      const fake = [{ VSSPER_NOM: 'Juan', VSSPER_APELL1: 'Garcia' }];
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1', rquery: 'VSSPER_NOM==Juan;VSSPER_APELL1==Garcia' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, nombre: 'Juan', apellido: 'Garcia' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('sends nif as FIQL field', async () => {
      const fake = [{ VSSPER_NIF: '12345678A' }];
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1', rquery: 'VSSPER_NIF==12345678A' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, nif: '12345678A' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal')
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

    it('returns error invalid_token on 401', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
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
  // freematica_get_persona
  // -------------------------------------------------------------------------

  describe('freematica_get_persona', () => {
    it('returns the persona for a valid idReg', async () => {
      const fake = { VSSPER_COD: 'P001', VSSPER_NOM: 'Ana', VSSPER_APELL1: 'Lopez' };
      nock(BASE_URL).get('/pers/v2/personal/PERS001%3D%3D').reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, GET_TOOL);
      const result = (await handler({ id: 'PERS001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns error not_found when idReg does not exist', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, GET_TOOL);
      const result = (await handler({ id: 'BADID' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const server = buildServer();
      const handler = getHandler(server, GET_TOOL);
      const result = (await handler({ id: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });
});
