import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const CONTRATO = {
  CON_CODEMP: '02',
  CON_DELEG: '08',
  CON_NUMCONT: 1234,
  CON_CODCLI: 'CLI001',
  idReg: 'ppre-contrato-01',
};

const READ_TOOLS = [
  'freematica_list_ppre_contratos',
  'freematica_list_ppre_contratos_v2',
  'freematica_get_ppre_contrato_v1',
  'freematica_get_ppre_contrato_v2',
  'freematica_list_ppre_contratos_instalacion',
  'freematica_list_ppre_tipos_contrato',
];

const WRITE_TOOLS = ['freematica_create_ppre_contrato'];

describe('ppre contratos tools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('registro y gate de escritura', () => {
    it('registra las tools de lectura siempre', () => {
      const { server } = buildServer();
      const tools = registeredTools(server);
      for (const name of READ_TOOLS) {
        expect(tools).toHaveProperty(name);
      }
    });

    it('NO registra tools de escritura sin enableWrites', () => {
      const { server } = buildServer();
      const tools = registeredTools(server);
      for (const name of WRITE_TOOLS) {
        expect(tools).not.toHaveProperty(name);
      }
    });

    it('registra tools de escritura con enableWrites=true', () => {
      const { server } = buildServer({ enableWrites: true });
      const tools = registeredTools(server);
      for (const name of WRITE_TOOLS) {
        expect(tools).toHaveProperty(name);
      }
    });
  });

  describe('freematica_list_ppre_contratos', () => {
    it('lista contratos ppre v1 con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v1/contratos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([CONTRATO], 42));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_contratos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(42);
      expect(parsed.items[0].CON_NUMCONT).toBe(1234);
      scope.done();
    });

    it('devuelve error() en fallo del API (401)', async () => {
      nock(BASE_URL)
        .get('/ppre/v1/contratos')
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_contratos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_list_ppre_tipos_contrato', () => {
    it('devuelve el catálogo de tipos de contrato', async () => {
      const catalog = [{ codigo: 'T1', descripcion: 'Tipo 1' }];
      const scope = nock(BASE_URL)
        .get('/ppre/v2/tipos-contrato')
        .reply(200, okEnvelope(catalog));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_tipos_contrato');
      const result = await handler({});

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].codigo).toBe('T1');
      scope.done();
    });

    it('devuelve error() en fallo del API (500)', async () => {
      nock(BASE_URL)
        .get('/ppre/v2/tipos-contrato')
        .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_tipos_contrato');
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_list_ppre_contratos_v2', () => {
    it('lista contratos ppre v2 con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v2/contratos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([CONTRATO], 10));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_contratos_v2');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(10);
      expect(parsed.items[0].CON_NUMCONT).toBe(1234);
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/ppre/v2/contratos')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_contratos_v2');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_get_ppre_contrato_v1', () => {
    it('obtiene detalle de contrato v1 por idReg', async () => {
      const scope = nock(BASE_URL)
        .get(`/ppre/v1/contratos/${CONTRATO.idReg}`)
        .reply(200, listEnvelope([CONTRATO], 1));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_ppre_contrato_v1');
      const result = await handler({ id: CONTRATO.idReg });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.CON_CODCLI).toBe('CLI001');
      scope.done();
    });

    it('devuelve error() cuando el API retorna error', async () => {
      nock(BASE_URL)
        .get(`/ppre/v1/contratos/${CONTRATO.idReg}`)
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_ppre_contrato_v1');
      const result = await handler({ id: CONTRATO.idReg });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  describe('freematica_get_ppre_contrato_v2', () => {
    it('obtiene detalle de contrato v2 por idReg', async () => {
      const scope = nock(BASE_URL)
        .get(`/ppre/v2/contratos/${CONTRATO.idReg}`)
        .reply(200, listEnvelope([CONTRATO], 1));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_ppre_contrato_v2');
      const result = await handler({ id: CONTRATO.idReg });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.CON_NUMCONT).toBe(1234);
      scope.done();
    });

    it('devuelve error() cuando el API retorna error', async () => {
      nock(BASE_URL)
        .get(`/ppre/v2/contratos/${CONTRATO.idReg}`)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_ppre_contrato_v2');
      const result = await handler({ id: CONTRATO.idReg });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_list_ppre_contratos_instalacion', () => {
    it('lista contratos de instalación con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v1/contratosInstalacion')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([CONTRATO], 8));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_contratos_instalacion');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(8);
      expect(parsed.items[0].CON_CODCLI).toBe('CLI001');
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/ppre/v1/contratosInstalacion')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_contratos_instalacion');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_create_ppre_contrato', () => {
    it('envía body CON_* y devuelve el registro creado', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/ppre/v2/contratos', (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, okEnvelope({ ...CONTRATO, CON_NUMCONT: 9999 }));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_ppre_contrato');
      const result = await handler({
        CON_CODEMP: '02',
        CON_DELEG: '08',
        CON_CODCLI: 'CLI001',
        CON_OBSERVACIONES: 'Test contrato ppre',
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody['CON_CODEMP']).toBe('02');
      expect(sentBody['CON_DELEG']).toBe('08');
      expect(sentBody['CON_CODCLI']).toBe('CLI001');
      expect(sentBody['CON_OBSERVACIONES']).toBe('Test contrato ppre');
      expect(JSON.parse(result.content[0].text).CON_NUMCONT).toBe(9999);
    });

    it('propaga errores del API como error()', async () => {
      nock(BASE_URL)
        .post('/ppre/v2/contratos')
        .reply(200, { errorCode: '403', errorMessage: 'Forbidden', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_ppre_contrato');
      const result = await handler({ CON_CODEMP: '02' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('forbidden');
    });
  });
});
