import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerClientesTools } from '../../src/tools/clientes.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_clientes';
const GET_TOOL = 'freematica_get_cliente';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerClientesTools(server, client);
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

describe('registerClientesTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers both tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
    expect(tools).toHaveProperty(GET_TOOL);
  });

  it('list_clientes returns items, count, total, page, items_per_page', async () => {
    const fake = [{ COD_CLI: '1' }, { COD_CLI: '2' }];
    nock(BASE_URL)
      .get('/pgrl/v2/clientes')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 2007));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: fake,
      count: 2,
      total: 2007,
      page: 1,
      items_per_page: 20,
    });
  });

  it('get_cliente returns the cliente object for a valid idReg', async () => {
    const fake = { COD_CLI: '1000', NOMBRE_CLI: 'ACME' };
    nock(BASE_URL).get('/pgrl/v2/clientes/MV9fMTAwMA%3D%3D').reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'MV9fMTAwMA==' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('get_cliente returns error not_found when id does not exist', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/clientes/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});
