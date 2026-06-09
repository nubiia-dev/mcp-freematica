import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerMasterDataTools } from '../../src/tools/master-data.js';
import { MASTER_DATA_CATALOGS, CATALOG_ENDPOINTS } from '../../src/schemas/master-data.js';

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

/** Builds a fake Freemática list envelope. */
function fakeEnvelope(items: unknown[], total?: number) {
  return {
    errorCode: '200',
    errorMessage: '',
    data: { total: String(total ?? items.length), items, rowHeight: -1 },
  };
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
    nock(BASE_URL).get('/pgrl/v1/paises').reply(200, fakeEnvelope(fakeData));

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

  // ------------------------------------------------------------------ TD-122
  it('handler resolves lineas-negocio to /pgrl/v2/lineas-negocio endpoint', async () => {
    const fakeData = [{ idreg: 1, nombre: 'Línea Seguridad' }];
    nock(BASE_URL).get('/pgrl/v2/lineas-negocio').reply(200, fakeEnvelope(fakeData));

    const { server } = buildServer();
    const handler = getHandler(server);

    const result = (await handler({ catalog: 'lineas-negocio' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.catalog).toBe('lineas-negocio');
    expect(parsed.items).toEqual(fakeData);
    expect(parsed.count).toBe(1);
  });

  it('handler resolves bancos to /pgrl/v2/bancos endpoint', async () => {
    const fakeData = [{ idreg: 1, nombre: 'Banco Santander' }];
    nock(BASE_URL).get('/pgrl/v2/bancos').reply(200, fakeEnvelope(fakeData));

    const { server } = buildServer();
    const handler = getHandler(server);

    const result = (await handler({ catalog: 'bancos' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.catalog).toBe('bancos');
    expect(parsed.count).toBe(1);
  });

  it('handler resolves calendarios to /pgrl/v1/calendarios endpoint', async () => {
    const fakeData = [{ idreg: 1, nombre: 'Calendario General' }];
    nock(BASE_URL).get('/pgrl/v1/calendarios').reply(200, fakeEnvelope(fakeData));

    const { server } = buildServer();
    const handler = getHandler(server);

    const result = (await handler({ catalog: 'calendarios' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.catalog).toBe('calendarios');
    expect(parsed.count).toBe(1);
  });

  it('handler resolves incidencecode to /pvss/v2/incidencecode endpoint', async () => {
    const fakeData = [{ idreg: 1, nombre: 'INC-001' }];
    nock(BASE_URL).get('/pvss/v2/incidencecode').reply(200, fakeEnvelope(fakeData));

    const { server } = buildServer();
    const handler = getHandler(server);

    const result = (await handler({ catalog: 'incidencecode' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.catalog).toBe('incidencecode');
    expect(parsed.count).toBe(1);
  });

  it('handler resolves series to /pgrl/v2/series endpoint', async () => {
    const fakeData = [
      { idreg: 1, nombre: 'A' },
      { idreg: 2, nombre: 'B' },
    ];
    nock(BASE_URL).get('/pgrl/v2/series').reply(200, fakeEnvelope(fakeData));

    const { server } = buildServer();
    const handler = getHandler(server);

    const result = (await handler({ catalog: 'series' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.catalog).toBe('series');
    expect(parsed.items).toEqual(fakeData);
    expect(parsed.count).toBe(2);
    expect(parsed.total).toBe(2);
  });

  it('handler resolves claves-facturacion to /pvss/v2/claves-facturacion endpoint', async () => {
    const fakeData = [{ idreg: 1, nombre: 'CLAVE-01' }];
    nock(BASE_URL).get('/pvss/v2/claves-facturacion').reply(200, fakeEnvelope(fakeData));

    const { server } = buildServer();
    const handler = getHandler(server);

    const result = (await handler({ catalog: 'claves-facturacion' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.catalog).toBe('claves-facturacion');
    expect(parsed.items).toEqual(fakeData);
    expect(parsed.count).toBe(1);
    expect(parsed.total).toBe(1);
  });

  /**
   * Exhaustive check: every catalog in the enum can be called and resolves
   * to the correct endpoint without error.
   * Uses nock to mock the expected URL for each catalog.
   */
  it('every catalog in MASTER_DATA_CATALOGS has a working endpoint mapping', async () => {
    const { server } = buildServer();
    const handler = getHandler(server);

    for (const catalog of MASTER_DATA_CATALOGS) {
      const endpoint = CATALOG_ENDPOINTS[catalog];
      nock(BASE_URL).get(endpoint).reply(200, fakeEnvelope([{ idreg: 1 }]));

      const result = (await handler({ catalog })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError, `catalog=${catalog} returned isError=true`).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.catalog, `catalog=${catalog} echo mismatch`).toBe(catalog);

      nock.cleanAll();
    }
  });
});
