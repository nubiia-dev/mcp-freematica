import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPgrlCalendariosFestivosTools } from '../../src/tools/pgrl-calendarios-festivos.js';

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
  registerPgrlCalendariosFestivosTools(server, client, { enableWrites });
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

function getTools(server: McpServer) {
  return (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
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

describe('registerPgrlCalendariosFestivosTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers read tools when enableWrites is false', () => {
    const { server } = buildServer(false);
    const tools = getTools(server);
    expect(tools).toHaveProperty('freematica_list_calen_festivos');
    expect(tools).toHaveProperty('freematica_get_calen_festivo');
  });

  it('does NOT register write tools when enableWrites is false', () => {
    const { server } = buildServer(false);
    const tools = getTools(server);
    expect(tools).not.toHaveProperty('freematica_create_calen_festivo');
    expect(tools).not.toHaveProperty('freematica_update_calen_festivo');
    expect(tools).not.toHaveProperty('freematica_update_calen_festivo_det');
  });

  it('registers write tools when enableWrites is true', () => {
    const { server } = buildServer(true);
    const tools = getTools(server);
    expect(tools).toHaveProperty('freematica_create_calen_festivo');
    expect(tools).toHaveProperty('freematica_update_calen_festivo');
    expect(tools).toHaveProperty('freematica_update_calen_festivo_det');
  });

  it('list_calen_festivos returns items, count, total, page, items_per_page', async () => {
    const fake = [
      { COD_CALEN_FESTIVOS: 'CF001', DESCRIPCION: 'Festivos España' },
    ];
    nock(BASE_URL)
      .get('/pgrl/v2/calen-festivos')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 5));

    const { server } = buildServer();
    const handler = getHandler(server, 'freematica_list_calen_festivos');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
    expect(parsed.total).toBe(5);
  });

  it('get_calen_festivo returns the calendar object', async () => {
    const fake = { COD_CALEN_FESTIVOS: 'CF001', DESCRIPCION: 'Festivos España' };
    nock(BASE_URL)
      .get('/pgrl/v2/calen-festivos/MYID')
      .reply(200, detailEnv(fake));

    const { server } = buildServer();
    const handler = getHandler(server, 'freematica_get_calen_festivo');
    const result = (await handler({ idReg: 'MYID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('create_calen_festivo posts fields and returns created object', async () => {
    const fields = { COD_CALEN_FESTIVOS: 'CF002', DESCRIPCION: 'Festivos Cat' };
    nock(BASE_URL)
      .post('/pgrl/v2/calen-festivos', fields)
      .reply(200, detailEnv(fields));

    const { server } = buildServer(true);
    const handler = getHandler(server, 'freematica_create_calen_festivo');
    const result = (await handler({ fields })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fields);
  });

  it('update_calen_festivo fetches then merges and puts', async () => {
    const current = { COD_CALEN_FESTIVOS: 'CF001', DESCRIPCION: 'Old', idReg: 'MYID' };
    const fields = { DESCRIPCION: 'New' };
    const merged = { ...current, ...fields };

    nock(BASE_URL)
      .get('/pgrl/v2/calen-festivos/MYID')
      .reply(200, detailEnv(current));
    nock(BASE_URL)
      .put('/pgrl/v2/calen-festivos/MYID', merged)
      .reply(200, detailEnv(merged));

    const { server } = buildServer(true);
    const handler = getHandler(server, 'freematica_update_calen_festivo');
    const result = (await handler({ idReg: 'MYID', fields })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.DESCRIPCION).toBe('New');
  });

  it('get_calen_festivo returns error not_found when idReg does not exist', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/calen-festivos/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const { server } = buildServer();
    const handler = getHandler(server, 'freematica_get_calen_festivo');
    const result = (await handler({ idReg: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});
