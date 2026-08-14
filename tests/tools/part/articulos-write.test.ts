import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../../src/clients/freematica-client.js';
import { registerArticulosTools } from '../../../src/tools/articulos.js';

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
  registerArticulosTools(server, client, { enableWrites });
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

describe('registerArticulosTools — write + costes', () => {
  afterEach(() => nock.cleanAll());

  // -------------------------------------------------------------------------
  // Gate: write tools only available when enableWrites=true
  // -------------------------------------------------------------------------

  it('gate: sin enableWrites no registra create/update pero sí costes', () => {
    const tools = (
      buildServer(false) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).toHaveProperty('freematica_list_articulos');
    expect(tools).toHaveProperty('freematica_list_articulos_costes');
    expect(tools).toHaveProperty('freematica_get_articulo_coste');
    expect(tools).not.toHaveProperty('freematica_create_articulo');
    expect(tools).not.toHaveProperty('freematica_update_articulo');
  });

  it('con enableWrites registra todos los tools del módulo', () => {
    const tools = (
      buildServer(true) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).toHaveProperty('freematica_create_articulo');
    expect(tools).toHaveProperty('freematica_update_articulo');
  });

  // -------------------------------------------------------------------------
  // freematica_list_articulos_costes
  // -------------------------------------------------------------------------

  describe('freematica_list_articulos_costes', () => {
    it('devuelve lista paginada de costes', async () => {
      const fake = [{ COD_ARTICULO: 'A1', PRECIO_MEDIO: 5.5 }];
      nock(BASE_URL)
        .get('/part/v2/articulos-costes')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 100));

      const handler = getHandler(buildServer(false), 'freematica_list_articulos_costes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(100);
    });

    it('retorna error en fallo de API', async () => {
      nock(BASE_URL)
        .get('/part/v2/articulos-costes')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(false), 'freematica_list_articulos_costes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_get_articulo_coste
  // -------------------------------------------------------------------------

  describe('freematica_get_articulo_coste', () => {
    it('devuelve el detalle de costes por idReg', async () => {
      const fake = { COD_ARTICULO: 'A1', PRECIO_MEDIO: 5.5, COD_ALMACEN: '01' };
      nock(BASE_URL)
        .get('/part/v2/articulos-costes/IDREG1')
        .reply(200, detailEnv(fake));

      const handler = getHandler(buildServer(false), 'freematica_get_articulo_coste');
      const result = await handler({ id: 'IDREG1' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('propaga error not_found', async () => {
      nock(BASE_URL)
        .get('/part/v2/articulos-costes/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const handler = getHandler(buildServer(false), 'freematica_get_articulo_coste');
      const result = await handler({ id: 'BADID' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_create_articulo
  // -------------------------------------------------------------------------

  describe('freematica_create_articulo', () => {
    it('envía el body y devuelve el artículo creado', async () => {
      const fields = { COD_ARTICULO: 'NUEVO01', DESC_ART: 'Artículo nuevo', COD_FAMILIA: '04' };
      const created = { idReg: 'IDREG_NEW', ...fields };

      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/part/v2/articulos', (body) => { sentBody = body; return true; })
        .reply(200, detailEnv(created));

      const handler = getHandler(buildServer(true), 'freematica_create_articulo');
      const result = await handler({ fields });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual(fields);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.idReg).toBe('IDREG_NEW');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_update_articulo
  // -------------------------------------------------------------------------

  describe('freematica_update_articulo', () => {
    const IDREG = 'IDREG_ART1';

    it('hace fetch + merge y envía el objeto completo', async () => {
      const current = {
        idReg: IDREG,
        COD_ARTICULO: 'A1',
        DESC_ART: 'Descripción original',
        COD_FAMILIA: '04',
      };
      // GET /part/v1/articulos/{idreg} devuelve lista con un item
      nock(BASE_URL)
        .get(`/part/v1/articulos/${encodeURIComponent(IDREG)}`)
        .reply(200, {
          errorCode: '200',
          errorMessage: '',
          data: { total: '1', items: [current], rowHeight: -1 },
        });

      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(`/part/v2/articulos/${encodeURIComponent(IDREG)}`, (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, {
          errorCode: '200',
          errorMessage: '',
          data: { ...current, DESC_ART: 'Descripción actualizada' },
        });

      const handler = getHandler(buildServer(true), 'freematica_update_articulo');
      const result = await handler({ idReg: IDREG, fields: { DESC_ART: 'Descripción actualizada' } });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toMatchObject({ idReg: IDREG, COD_ARTICULO: 'A1', DESC_ART: 'Descripción actualizada' });
    });

    it('rechaza llamada sin campos a actualizar', async () => {
      const handler = getHandler(buildServer(true), 'freematica_update_articulo');
      const result = await handler({ idReg: IDREG, fields: {} });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).message).toContain('al menos un campo');
    });

    it('propaga not_found si el artículo no existe', async () => {
      nock(BASE_URL)
        .get(`/part/v1/articulos/${encodeURIComponent(IDREG)}`)
        .reply(200, { errorCode: '404', errorMessage: 'No existe', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_articulo');
      const result = await handler({ idReg: IDREG, fields: { DESC_ART: 'X' } });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });
});
