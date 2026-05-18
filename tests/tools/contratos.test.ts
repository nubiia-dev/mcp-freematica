import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerContratosTools } from '../../src/tools/contratos.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const TOOL_NAME = 'freematica_list_materiales_asignados_servicios';

function buildServer(): { server: McpServer; client: FreematicaClient } {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerContratosTools(server, client);
  return { server, client };
}

describe('registerContratosTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers the freematica_list_materiales_asignados_servicios tool', () => {
    const { server } = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty(TOOL_NAME);
  });

  it('handler returns ok() with items + count on success', async () => {
    const fakeData = [{ idreg: 1 }, { idreg: 2 }];
    nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(200, fakeData);

    const { server } = buildServer();
    const tools = (server as unknown as {
      _registeredTools: Record<string, { handler: (args: unknown) => Promise<unknown> }>;
    })._registeredTools;

    const result = (await tools[TOOL_NAME].handler({})) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({ items: fakeData, count: 2 });
  });

  it('handler returns error() on API failure', async () => {
    nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(401);

    const { server } = buildServer();
    const tools = (server as unknown as {
      _registeredTools: Record<string, { handler: (args: unknown) => Promise<unknown> }>;
    })._registeredTools;

    const result = (await tools[TOOL_NAME].handler({})) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('invalid_token');
  });
});
