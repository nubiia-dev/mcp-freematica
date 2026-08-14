import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../../src/clients/freematica-client.js';
import { registerTablasAuxiliaresTools } from '../../../src/tools/part/tablas-auxiliares.js';

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
  registerTablasAuxiliaresTools(server, client);
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

describe('registerTablasAuxiliaresTools', () => {
  afterEach(() => nock.cleanAll());

  it('registra los 6 tools de tablas auxiliares', () => {
    const tools = (
      buildServer() as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).toHaveProperty('freematica_list_familias');
    expect(tools).toHaveProperty('freematica_get_familia');
    expect(tools).toHaveProperty('freematica_list_lineas');
    expect(tools).toHaveProperty('freematica_get_linea');
    expect(tools).toHaveProperty('freematica_list_subfamilias');
    expect(tools).toHaveProperty('freematica_get_subfamilia');
  });

  // -------------------------------------------------------------------------
  // Familias
  // -------------------------------------------------------------------------

  describe('freematica_list_familias', () => {
    it('devuelve lista paginada de familias', async () => {
      const fake = [{ COD_FAMILIA: '04', DESC_FAMILIA: 'MATERIAL LIMPIEZA' }];
      nock(BASE_URL)
        .get('/part/v1/familias')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 12));

      const handler = getHandler(buildServer(), 'freematica_list_familias');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(12);
    });

    it('retorna error en fallo de API', async () => {
      nock(BASE_URL)
        .get('/part/v1/familias')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_familias');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_get_familia', () => {
    it('devuelve detalle de familia por idReg', async () => {
      const fake = { COD_FAMILIA: '04', DESC_FAMILIA: 'MATERIAL LIMPIEZA' };
      nock(BASE_URL)
        .get('/part/v1/familias/IDREG_FAM')
        .reply(200, detailEnv(fake));

      const handler = getHandler(buildServer(), 'freematica_get_familia');
      const result = await handler({ id: 'IDREG_FAM' });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('propaga error not_found', async () => {
      nock(BASE_URL)
        .get('/part/v1/familias/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_familia');
      const result = await handler({ id: 'BADID' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // -------------------------------------------------------------------------
  // Líneas
  // -------------------------------------------------------------------------

  describe('freematica_list_lineas', () => {
    it('devuelve lista paginada de líneas', async () => {
      const fake = [{ COD_LIN_ART: '03', DESC_LINEA: 'MAQUINARIA' }];
      nock(BASE_URL)
        .get('/part/v1/lineas')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 8));

      const handler = getHandler(buildServer(), 'freematica_list_lineas');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('retorna error en fallo de API', async () => {
      nock(BASE_URL)
        .get('/part/v1/lineas')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_lineas');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_get_linea', () => {
    it('devuelve detalle de línea por idReg', async () => {
      const fake = { COD_LIN_ART: '03', DESC_LINEA: 'MAQUINARIA' };
      nock(BASE_URL)
        .get('/part/v1/lineas/IDREG_LIN')
        .reply(200, detailEnv(fake));

      const handler = getHandler(buildServer(), 'freematica_get_linea');
      const result = await handler({ id: 'IDREG_LIN' });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('propaga error not_found', async () => {
      nock(BASE_URL)
        .get('/part/v1/lineas/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_linea');
      const result = await handler({ id: 'BADID' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // -------------------------------------------------------------------------
  // Subfamilias
  // -------------------------------------------------------------------------

  describe('freematica_list_subfamilias', () => {
    it('devuelve lista paginada de subfamilias', async () => {
      const fake = [{ COD_SUBFAM: '02', COD_FAMILIA: '04', DESC_SUBFAM: 'DETERGENTES' }];
      nock(BASE_URL)
        .get('/part/v1/subfamilias')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 30));

      const handler = getHandler(buildServer(), 'freematica_list_subfamilias');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(30);
    });

    it('retorna error en fallo de API', async () => {
      nock(BASE_URL)
        .get('/part/v1/subfamilias')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error servidor', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_subfamilias');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_get_subfamilia', () => {
    it('devuelve detalle de subfamilia por idReg', async () => {
      const fake = { COD_SUBFAM: '02', COD_FAMILIA: '04', DESC_SUBFAM: 'DETERGENTES' };
      nock(BASE_URL)
        .get('/part/v1/subfamilias/IDREG_SUB')
        .reply(200, detailEnv(fake));

      const handler = getHandler(buildServer(), 'freematica_get_subfamilia');
      const result = await handler({ id: 'IDREG_SUB' });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('propaga error del API', async () => {
      nock(BASE_URL)
        .get('/part/v1/subfamilias/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Server Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_subfamilia');
      const result = await handler({ id: 'ERR' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });
});
