import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerOportunidadesNegocioTools } from '../../src/tools/oportunidades-negocio.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_oportunidades_negocio';
const GET_TOOL = 'freematica_get_oportunidad_negocio';
const AMP_TOOL = 'freematica_get_oportunidad_negocio_datos_ampliados';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerOportunidadesNegocioTools(server, client);
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

describe('registerOportunidadesNegocioTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers all three tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
    expect(tools).toHaveProperty(GET_TOOL);
    expect(tools).toHaveProperty(AMP_TOOL);
  });

  it('list returns paginated oportunidades', async () => {
    const fake = [{ ID_OPORTUNIDAD: 2.0, NOMBRE: 'VIVENIO' }];
    nock(BASE_URL)
      .get('/pcrm/v2/oportunidades-negocio')
      .query({ items: '5', page: '1' })
      .reply(200, listEnv(fake, 25));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({ page: 1, items: 5 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: fake,
      count: 1,
      total: 25,
      page: 1,
      items_per_page: 5,
    });
  });

  it('get returns the oportunidad detail', async () => {
    const fake = { ID_OPORTUNIDAD: 2.0, NOMBRE: 'VIVENIO', VALOR: 1000 };
    nock(BASE_URL)
      .get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'MDJfXzI=' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('datos-ampliados returns extended data when available', async () => {
    const fake = { EXTRA: 'INFO', OTRO_CAMPO: 42 };
    nock(BASE_URL)
      .get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D/datos-ampliados')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, AMP_TOOL);
    const result = (await handler({ id: 'MDJfXzI=' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('datos-ampliados returns not_found when oportunidad has no extended data', async () => {
    nock(BASE_URL)
      .get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D/datos-ampliados')
      .reply(200, { errorCode: '404', errorMessage: 'No data', data: null });

    const server = buildServer();
    const handler = getHandler(server, AMP_TOOL);
    const result = (await handler({ id: 'MDJfXzI=' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});
