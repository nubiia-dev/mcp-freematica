import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../../src/clients/freematica-client.js';
import { registerArticulosLoteTools } from '../../../src/tools/part/articulos-lote.js';

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

function buildServer(enableWrites: boolean): McpServer {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerArticulosLoteTools(server, client, { enableWrites });
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

describe('registerArticulosLoteTools', () => {
  afterEach(() => nock.cleanAll());

  it('registra los tools de lectura y sin write tools si enableWrites=false', () => {
    const tools = (
      buildServer(false) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).toHaveProperty('freematica_list_articulos_serie_lote');
    expect(tools).toHaveProperty('freematica_get_articulo_serie_lote');
    expect(tools).not.toHaveProperty('freematica_create_articulo_serie_lote');
  });

  it('registra create con enableWrites=true', () => {
    const tools = (
      buildServer(true) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).toHaveProperty('freematica_create_articulo_serie_lote');
  });

  describe('freematica_list_articulos_serie_lote', () => {
    it('devuelve lista paginada', async () => {
      const fake = [{ SER_COD_ARTICULO: 'A1', SER_SERIE_LOTE: 'SL001' }];
      nock(BASE_URL)
        .get('/part/v2/articulos-serie-lote')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 50));

      const handler = getHandler(buildServer(false), 'freematica_list_articulos_serie_lote');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(50);
    });

    it('retorna error en fallo de API', async () => {
      nock(BASE_URL)
        .get('/part/v2/articulos-serie-lote')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(false), 'freematica_list_articulos_serie_lote');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_articulo_serie_lote', () => {
    it('devuelve detalle por idReg', async () => {
      const fake = { SER_COD_ARTICULO: 'A1', SER_SERIE_LOTE: 'SL001', SER_MESES_GARANTIA: 12 };
      nock(BASE_URL)
        .get('/part/v2/articulos-serie-lote/IDREG1')
        .reply(200, detailEnv(fake));

      const handler = getHandler(buildServer(false), 'freematica_get_articulo_serie_lote');
      const result = await handler({ id: 'IDREG1' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });
  });

  describe('freematica_create_articulo_serie_lote', () => {
    it('envía el body y devuelve el registro creado', async () => {
      const fields = {
        SER_COD_GRUPO_ART: 1,
        SER_COD_ARTICULO: 'A1',
        SER_SERIE_LOTE: 'SL-2025-001',
        SER_FCH_COMPRA: '2025-12-11T14:03:55.984Z',
        SER_MESES_GARANTIA: 24,
      };
      const created = { idReg: 'NEW_ID', ...fields };

      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/part/v2/articulos-serie-lote', (body) => { sentBody = body; return true; })
        .reply(200, detailEnv(created));

      const handler = getHandler(buildServer(true), 'freematica_create_articulo_serie_lote');
      const result = await handler({ fields });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual(fields);
    });
  });
});
