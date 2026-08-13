import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const CASO = {
  NUM_CASO: 501,
  ASUNTO: 'Fallo en sistema de alarma',
  COD_ESTADO: 'A',
  COD_CLIENTE: 'CLI002',
  idReg: 'crmc-caso-01',
};

const TIPO_CASO = {
  COD_TIPO: 'TC01',
  DESCRIPCION: 'Avería técnica',
  idReg: 'tipo-caso-01',
};

const SUBTIPO_CASO = {
  COD_SUBTIPO: 'SC01',
  DESCRIPCION: 'Avería eléctrica',
  idReg: 'subtipo-caso-01',
};

const READ_TOOLS = [
  'freematica_list_pcrm_casos',
  'freematica_get_pcrm_caso',
  'freematica_list_pcrm_tipos_casos',
  'freematica_get_pcrm_tipo_caso',
  'freematica_list_pcrm_subtipos_casos',
  'freematica_get_pcrm_subtipo_caso',
];

const WRITE_TOOLS = [
  'freematica_create_pcrm_caso',
  'freematica_update_pcrm_caso',
];

describe('pcrm casos tools', () => {
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

  describe('freematica_list_pcrm_casos', () => {
    it('lista casos CRM con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/casos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([CASO], 100));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_casos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(100);
      expect(parsed.items[0].NUM_CASO).toBe(501);
      scope.done();
    });

    it('devuelve error() en fallo del API (401)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/casos')
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_casos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_get_pcrm_caso', () => {
    it('devuelve el detalle de un caso', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/casos/crmc-caso-01')
        .reply(200, okEnvelope(CASO));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_caso');
      const result = await handler({ id: 'crmc-caso-01' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.NUM_CASO).toBe(501);
      scope.done();
    });

    it('devuelve error() si el caso no existe (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/casos/unknown')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_caso');
      const result = await handler({ id: 'unknown' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  describe('freematica_list_pcrm_tipos_casos', () => {
    it('lista tipos de caso con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/tipos-casos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([TIPO_CASO], 5));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_tipos_casos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(5);
      expect(parsed.items[0].COD_TIPO).toBe('TC01');
      scope.done();
    });

    it('devuelve error() en fallo del API (500)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/tipos-casos')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_tipos_casos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_get_pcrm_tipo_caso', () => {
    it('devuelve el detalle de un tipo de caso', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/tipos-casos/tipo-caso-01')
        .reply(200, okEnvelope(TIPO_CASO));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_tipo_caso');
      const result = await handler({ id: 'tipo-caso-01' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.COD_TIPO).toBe('TC01');
      scope.done();
    });

    it('devuelve error() si el tipo no existe (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/tipos-casos/x')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_tipo_caso');
      const result = await handler({ id: 'x' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_list_pcrm_subtipos_casos', () => {
    it('lista subtipos de caso con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/subtipos-casos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([SUBTIPO_CASO], 8));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_subtipos_casos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(8);
      expect(parsed.items[0].COD_SUBTIPO).toBe('SC01');
      scope.done();
    });

    it('devuelve error() en fallo del API (401)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/subtipos-casos')
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_subtipos_casos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_get_pcrm_subtipo_caso', () => {
    it('devuelve el detalle de un subtipo de caso', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/subtipos-casos/subtipo-caso-01')
        .reply(200, okEnvelope(SUBTIPO_CASO));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_subtipo_caso');
      const result = await handler({ id: 'subtipo-caso-01' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.COD_SUBTIPO).toBe('SC01');
      scope.done();
    });

    it('devuelve error() si el subtipo no existe (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/subtipos-casos/x')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_subtipo_caso');
      const result = await handler({ id: 'x' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_list_pcrm_casos — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/casos').query(true).replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_casos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pcrm_caso — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/casos/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_caso');
      const result = await handler({ id: 'net-err' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_list_pcrm_tipos_casos — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/tipos-casos').query(true).replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_tipos_casos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pcrm_tipo_caso — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/tipos-casos/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_tipo_caso');
      const result = await handler({ id: 'net-err' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_list_pcrm_subtipos_casos — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/subtipos-casos').query(true).replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_subtipos_casos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pcrm_subtipo_caso — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/subtipos-casos/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_subtipo_caso');
      const result = await handler({ id: 'net-err' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_pcrm_caso', () => {
    it('crea un caso CRM y devuelve el registro', async () => {
      const created = { ...CASO, NUM_CASO: 999 };
      const scope = nock(BASE_URL)
        .post('/pcrm/v2/casos', (body: Record<string, unknown>) => body['ASUNTO'] === 'Nuevo caso')
        .reply(200, okEnvelope(created));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pcrm_caso');
      const result = await handler({ ASUNTO: 'Nuevo caso', COD_ESTADO: 'A', COD_CLIENTE: 'CLI003' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.NUM_CASO).toBe(999);
      scope.done();
    });

    it('devuelve error() si el API rechaza (500)', async () => {
      nock(BASE_URL)
        .post('/pcrm/v2/casos')
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pcrm_caso');
      const result = await handler({ ASUNTO: 'Test' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_update_pcrm_caso', () => {
    it('actualiza un caso y devuelve el registro', async () => {
      const updated = { ...CASO, COD_ESTADO: 'F', RESOLUCION: 'Problema resuelto' };
      const scope = nock(BASE_URL)
        .put('/pcrm/v2/casos/crmc-caso-01', (body: Record<string, unknown>) => body['COD_ESTADO'] === 'F')
        .reply(200, okEnvelope(updated));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_caso');
      const result = await handler({ idReg: 'crmc-caso-01', COD_ESTADO: 'F', RESOLUCION: 'Problema resuelto' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.COD_ESTADO).toBe('F');
      scope.done();
    });

    it('devuelve error() si el caso no existe (404)', async () => {
      nock(BASE_URL)
        .put('/pcrm/v2/casos/no-existe')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_caso');
      const result = await handler({ idReg: 'no-existe', COD_ESTADO: 'F' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });

    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).put('/pcrm/v2/casos/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_caso');
      const result = await handler({ idReg: 'net-err', COD_ESTADO: 'F' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_pcrm_caso — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).post('/pcrm/v2/casos').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pcrm_caso');
      const result = await handler({ ASUNTO: 'Test' });

      expect(result.isError).toBe(true);
    });
  });
});
