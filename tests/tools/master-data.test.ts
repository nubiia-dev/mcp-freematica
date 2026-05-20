import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerMasterDataTools } from '../../src/tools/master-data.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const TOOL_NAME = 'freematica_get_master_data';

function buildServer(): { server: McpServer; client: FreematicaClient } {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerMasterDataTools(server, client);
  return { server, client };
}

interface ToolHandler {
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
}

function getHandler(server: McpServer): (args: Record<string, unknown>) => Promise<unknown> {
  const tools = (server as unknown as { _registeredTools: Record<string, ToolHandler> })
    ._registeredTools;
  const tool = tools[TOOL_NAME];
  if (!tool) throw new Error(`Tool not registered: ${TOOL_NAME}`);
  const fn = tool.handler ?? tool.callback;
  if (!fn) throw new Error(`Tool has no handler/callback: ${TOOL_NAME}`);
  return fn;
}

describe('registerMasterDataTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers the freematica_get_master_data tool', () => {
    const { server } = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty(TOOL_NAME);
  });

  it('handler returns ok() with catalog, items, count on success', async () => {
    const fakeData = [
      { idreg: 1, nombre: 'España' },
      { idreg: 2, nombre: 'Francia' },
    ];
    nock(BASE_URL).get('/pgrl/v1/paises').reply(200, {
      errorCode: '200',
      errorMessage: '',
      data: { total: '2', items: fakeData, rowHeight: -1 },
    });

    const { server } = buildServer();
    const handler = getHandler(server);

    const result = (await handler({ catalog: 'paises' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({ catalog: 'paises', items: fakeData, count: 2, total: 2 });
  });

  it('handler returns error() on API failure', async () => {
    nock(BASE_URL).get('/pgrl/v1/paises').reply(200, {
      errorCode: '401',
      errorMessage: 'Unauthorized',
      data: null,
    });

    const { server } = buildServer();
    const handler = getHandler(server);

    const result = (await handler({ catalog: 'paises' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('invalid_token');
  });
});
