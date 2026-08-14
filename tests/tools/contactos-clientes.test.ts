import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerContactosClientesTools } from '../../src/tools/contactos-clientes.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_contactos_clientes';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerContactosClientesTools(server, client);
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

describe('registerContactosClientesTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers list tool', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
  });

  it('list_contactos_clientes returns paginated list', async () => {
    const fake = [{ idReg: 'X', NOMBRE: 'Juan' }];
    nock(BASE_URL)
      .get('/pgrl/v2/contactos-clientes')
      .query({ items: '10', page: '1' })
      .reply(200, listEnv(fake, 500));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({ page: 1, items: 10 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: fake,
      count: 1,
      total: 500,
      page: 1,
      items_per_page: 10,
    });
  });

  it('returns error on API failure', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/contactos-clientes')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('list_contactos_clientes_v1 returns items from v1 endpoint', async () => {
    const fake = [{ CC_NOM_APELL: 'Juan García' }];
    nock(BASE_URL)
      .get('/pgrl/v1/contactos-clientes')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_contactos_clientes_v1');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_contactos_clientes_v1 returns error on failure', async () => {
    nock(BASE_URL)
      .get('/pgrl/v1/contactos-clientes')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_contactos_clientes_v1');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('get_contacto_cliente returns the contacto object', async () => {
    const fake = { CC_NOM_APELL: 'Juan García', CC_EMAIL1: 'juan@test.com' };

    const detailEnv = <T>(item: T) => ({ errorCode: '200', errorMessage: '', data: item });
    nock(BASE_URL)
      .get('/pgrl/v1/contactos-clientes/CCID')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_contacto_cliente');
    const result = (await handler({ idReg: 'CCID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('get_contacto_cliente returns error not_found', async () => {
    nock(BASE_URL)
      .get('/pgrl/v1/contactos-clientes/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_contacto_cliente');
    const result = (await handler({ idReg: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});
