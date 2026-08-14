import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPgrlCargosClientesTools } from '../../src/tools/pgrl-cargos-clientes.js';

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

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerPgrlCargosClientesTools(server, client);
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

describe('registerPgrlCargosClientesTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers both tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_cargos_clientes');
    expect(tools).toHaveProperty('freematica_get_cargo_cliente');
  });

  it('list_cargos_clientes returns items, count, total, page, items_per_page', async () => {
    const fake = [
      { COD_CARGO: 'DIR', DESC_CARGO: 'Director' },
      { COD_CARGO: 'TEC', DESC_CARGO: 'Técnico' },
    ];
    nock(BASE_URL)
      .get('/pgrl/v2/cargos-clientes')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 10));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_cargos_clientes');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: fake,
      count: 2,
      total: 10,
      page: 1,
      items_per_page: 20,
    });
  });

  it('get_cargo_cliente returns the cargo object for a valid idReg', async () => {
    const fake = { COD_CARGO: 'DIR', DESC_CARGO: 'Director' };
    nock(BASE_URL)
      .get('/pgrl/v2/cargos-clientes/TESTREG')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_cargo_cliente');
    const result = (await handler({ idReg: 'TESTREG' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('get_cargo_cliente returns error not_found when idReg does not exist', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/cargos-clientes/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_cargo_cliente');
    const result = (await handler({ idReg: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});
