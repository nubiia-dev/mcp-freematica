import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../../src/clients/freematica-client.js';
import { registerStocksTools } from '../../../src/tools/part/stocks.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

type Handler = (args: unknown) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}>;

function buildServer(): McpServer {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerStocksTools(server, client);
  return server;
}

function getHandler(server: McpServer, name: string): Handler {
  const tools = (
    server as unknown as {
      _registeredTools: Record<string, { handler?: Handler; callback?: Handler }>;
    }
  )._registeredTools;
  const handler = tools[name]?.handler ?? tools[name]?.callback;
  if (!handler) throw new Error(`handler no registrado: ${name}`);
  return handler;
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

describe('registerStocksTools', () => {
  afterEach(() => nock.cleanAll());

  it('registra los dos tools de stocks', () => {
    const tools = (
      buildServer() as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).toHaveProperty('freematica_list_stocks');
    expect(tools).toHaveProperty('freematica_get_stock');
  });

  describe('freematica_list_stocks', () => {
    it('devuelve lista paginada de stocks', async () => {
      const fake = [{ COD_ARTICULO: 'A1', COD_ALMACEN: '01', EXIST_1: 150 }];
      nock(BASE_URL)
        .get('/part/v1/stocks')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 500));

      const handler = getHandler(buildServer(), 'freematica_list_stocks');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(500);
    });

    it('retorna error en fallo de API', async () => {
      nock(BASE_URL)
        .get('/part/v1/stocks')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_stocks');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_get_stock', () => {
    it('devuelve el detalle de stock por idReg', async () => {
      const fake = { COD_ARTICULO: 'A1', COD_ALMACEN: '01', EXIST_1: 150, EXIST_2: 0 };
      nock(BASE_URL)
        .get('/part/v1/stocks/IDREG1')
        .reply(200, detailEnv(fake));

      const handler = getHandler(buildServer(), 'freematica_get_stock');
      const result = await handler({ id: 'IDREG1' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('propaga error not_found', async () => {
      nock(BASE_URL)
        .get('/part/v1/stocks/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_stock');
      const result = await handler({ id: 'BADID' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });

    it('propaga error de red (no-FreematicaError)', async () => {
      nock(BASE_URL)
        .get('/part/v1/stocks/NETFAIL')
        .replyWithError('ECONNREFUSED');

      const handler = getHandler(buildServer(), 'freematica_get_stock');
      const result = await handler({ id: 'NETFAIL' });

      expect(result.isError).toBe(true);
    });
  });
});
