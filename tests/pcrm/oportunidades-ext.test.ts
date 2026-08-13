import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const OPORTUNIDAD = {
  ID_OPORTUNIDAD: 200,
  NOMBRE: 'Contrato anual de vigilancia',
  COD_EMPRESA: '02',
  COD_CLI: 'CLI005',
  VALOR: 15000,
  idReg: 'opor-ext-01',
};

const TIPO_OPOR = {
  COD_TIPO: 'TO01',
  DESCRIPCION: 'Vigilancia',
  idReg: 'tipo-opor-01',
};

const DATOS_AMPLIADOS = {
  COVR_COD_EMPRESA: '02',
  COVR_ID_OPORTUNIDAD: 200,
  COVR_AGRUP: 'AGR01',
  COVR_TIPO_RESP: 2,
  COVR_VALORES_RESPUESTA: 'Respuesta en texto',
};

const READ_TOOLS = [
  'freematica_get_oportunidad_negocio_v1',
  'freematica_list_tipos_oportunidad_negocio',
  'freematica_get_tipo_oportunidad_negocio',
];

const WRITE_TOOLS = [
  'freematica_create_oportunidad_negocio_v1',
  'freematica_create_oportunidad_negocio',
  'freematica_update_oportunidad_negocio_v1',
  'freematica_update_oportunidad_negocio',
  'freematica_update_oportunidad_negocio_datos_ampliados',
];

describe('pcrm oportunidades extendido tools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('registro y gate de escritura', () => {
    it('registra las tools de lectura extendidas siempre', () => {
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

  describe('freematica_get_oportunidad_negocio_v1', () => {
    it('devuelve el detalle v1 de una oportunidad', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v1/oportunidades-negocio/opor-ext-01')
        .reply(200, okEnvelope(OPORTUNIDAD));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_oportunidad_negocio_v1');
      const result = await handler({ id: 'opor-ext-01' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.ID_OPORTUNIDAD).toBe(200);
      expect(parsed.NOMBRE).toBe('Contrato anual de vigilancia');
      scope.done();
    });

    it('devuelve error() si la oportunidad no existe (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v1/oportunidades-negocio/x')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_oportunidad_negocio_v1');
      const result = await handler({ id: 'x' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  describe('freematica_list_tipos_oportunidad_negocio', () => {
    it('lista tipos de oportunidad con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/tipos-oportunidad-negocio')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([TIPO_OPOR], 6));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_tipos_oportunidad_negocio');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(6);
      expect(parsed.items[0].COD_TIPO).toBe('TO01');
      scope.done();
    });

    it('devuelve error() en fallo del API (401)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/tipos-oportunidad-negocio')
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_tipos_oportunidad_negocio');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_list_tipos_oportunidad_negocio — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/tipos-oportunidad-negocio').query(true).replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_tipos_oportunidad_negocio');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_tipo_oportunidad_negocio', () => {
    it('devuelve el detalle de un tipo de oportunidad', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/tipos-oportunidad-negocio/tipo-opor-01')
        .reply(200, okEnvelope(TIPO_OPOR));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_tipo_oportunidad_negocio');
      const result = await handler({ id: 'tipo-opor-01' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.COD_TIPO).toBe('TO01');
      scope.done();
    });

    it('devuelve error() si el tipo no existe (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/tipos-oportunidad-negocio/x')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_tipo_oportunidad_negocio');
      const result = await handler({ id: 'x' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_oportunidad_negocio_v1', () => {
    it('crea una oportunidad v1 y devuelve el registro', async () => {
      const created = { ...OPORTUNIDAD, ID_OPORTUNIDAD: 999 };
      const scope = nock(BASE_URL)
        .post('/pcrm/v1/oportunidades-negocio', (body: Record<string, unknown>) => body['NOMBRE'] === 'Nueva oportunidad')
        .reply(200, okEnvelope(created));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_oportunidad_negocio_v1');
      const result = await handler({ NOMBRE: 'Nueva oportunidad', COD_EMPRESA: '02', VALOR: 5000 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.ID_OPORTUNIDAD).toBe(999);
      scope.done();
    });

    it('devuelve error() si el API rechaza (500)', async () => {
      nock(BASE_URL)
        .post('/pcrm/v1/oportunidades-negocio')
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_oportunidad_negocio_v1');
      const result = await handler({ NOMBRE: 'Test' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_create_oportunidad_negocio', () => {
    it('crea una oportunidad v2 y devuelve el registro', async () => {
      const created = { ...OPORTUNIDAD, ID_OPORTUNIDAD: 888 };
      const scope = nock(BASE_URL)
        .post('/pcrm/v2/oportunidades-negocio', (body: Record<string, unknown>) => body['NOMBRE'] === 'Oportunidad v2')
        .reply(200, okEnvelope(created));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_oportunidad_negocio');
      const result = await handler({ NOMBRE: 'Oportunidad v2', COD_EMPRESA: '02', VALOR: 8000 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.ID_OPORTUNIDAD).toBe(888);
      scope.done();
    });

    it('devuelve error() si el API rechaza (500)', async () => {
      nock(BASE_URL)
        .post('/pcrm/v2/oportunidades-negocio')
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_oportunidad_negocio');
      const result = await handler({ NOMBRE: 'Test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_oportunidad_negocio_v1', () => {
    it('actualiza una oportunidad v1 y devuelve el registro (fetch+merge)', async () => {
      const updated = { ...OPORTUNIDAD, COD_ESTADO_OPOR: 'G' };
      // fetch+merge: GET current (v1) → PUT merged body
      const scopeGet = nock(BASE_URL)
        .get('/pcrm/v1/oportunidades-negocio/opor-ext-01')
        .reply(200, okEnvelope(OPORTUNIDAD));
      const scopePut = nock(BASE_URL)
        .put('/pcrm/v1/oportunidades-negocio/opor-ext-01', (body: Record<string, unknown>) =>
          body['COD_ESTADO_OPOR'] === 'G' && body['NOMBRE'] === 'Contrato anual de vigilancia',
        )
        .reply(200, okEnvelope(updated));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_oportunidad_negocio_v1');
      const result = await handler({ idReg: 'opor-ext-01', COD_ESTADO_OPOR: 'G' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.COD_ESTADO_OPOR).toBe('G');
      scopeGet.done();
      scopePut.done();
    });

    it('devuelve error() si la oportunidad no existe en el GET previo (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v1/oportunidades-negocio/no-existe')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_oportunidad_negocio_v1');
      const result = await handler({ idReg: 'no-existe', COD_ESTADO_OPOR: 'G' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });

    it('devuelve error() ante un error de red en el GET previo (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v1/oportunidades-negocio/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_oportunidad_negocio_v1');
      const result = await handler({ idReg: 'net-err', COD_ESTADO_OPOR: 'G' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_oportunidad_negocio', () => {
    it('actualiza una oportunidad v2 y devuelve el registro (fetch+merge)', async () => {
      const updated = { ...OPORTUNIDAD, PROBABILIDAD: 80 };
      // fetch+merge: GET current (v2) → PUT merged body
      const scopeGet = nock(BASE_URL)
        .get('/pcrm/v2/oportunidades-negocio/opor-ext-01')
        .reply(200, okEnvelope(OPORTUNIDAD));
      const scopePut = nock(BASE_URL)
        .put('/pcrm/v2/oportunidades-negocio/opor-ext-01', (body: Record<string, unknown>) =>
          body['PROBABILIDAD'] === 80 && body['NOMBRE'] === 'Contrato anual de vigilancia',
        )
        .reply(200, okEnvelope(updated));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_oportunidad_negocio');
      const result = await handler({ idReg: 'opor-ext-01', PROBABILIDAD: 80 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.PROBABILIDAD).toBe(80);
      scopeGet.done();
      scopePut.done();
    });

    it('devuelve error() si la oportunidad no existe en el GET previo (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/oportunidades-negocio/no-existe')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_oportunidad_negocio');
      const result = await handler({ idReg: 'no-existe', PROBABILIDAD: 50 });

      expect(result.isError).toBe(true);
    });

    it('devuelve error() ante un error de red en el GET previo (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/oportunidades-negocio/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_oportunidad_negocio');
      const result = await handler({ idReg: 'net-err', PROBABILIDAD: 50 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_oportunidad_negocio_v1 — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).post('/pcrm/v1/oportunidades-negocio').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_oportunidad_negocio_v1');
      const result = await handler({ NOMBRE: 'Test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_oportunidad_negocio — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).post('/pcrm/v2/oportunidades-negocio').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_oportunidad_negocio');
      const result = await handler({ NOMBRE: 'Test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_oportunidad_negocio_datos_ampliados', () => {
    it('actualiza los datos ampliados de una oportunidad', async () => {
      const scope = nock(BASE_URL)
        .put(
          '/pcrm/v2/oportunidades-negocio/opor-ext-01/datos-ampliados',
          (body: Record<string, unknown>) => body['COVR_TIPO_RESP'] === 2,
        )
        .reply(200, okEnvelope(DATOS_AMPLIADOS));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_oportunidad_negocio_datos_ampliados');
      const result = await handler({
        idReg: 'opor-ext-01',
        COVR_COD_EMPRESA: '02',
        COVR_ID_OPORTUNIDAD: 200,
        COVR_AGRUP: 'AGR01',
        COVR_TIPO_RESP: 2,
        COVR_VALORES_RESPUESTA: 'Respuesta en texto',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.COVR_TIPO_RESP).toBe(2);
      scope.done();
    });

    it('devuelve error() si la oportunidad no existe (404)', async () => {
      nock(BASE_URL)
        .put('/pcrm/v2/oportunidades-negocio/no-existe/datos-ampliados')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_oportunidad_negocio_datos_ampliados');
      const result = await handler({ idReg: 'no-existe', COVR_TIPO_RESP: 2 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });

    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).put('/pcrm/v2/oportunidades-negocio/net-err/datos-ampliados').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_oportunidad_negocio_datos_ampliados');
      const result = await handler({ idReg: 'net-err', COVR_TIPO_RESP: 2 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_oportunidad_negocio_v1 — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v1/oportunidades-negocio/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_oportunidad_negocio_v1');
      const result = await handler({ id: 'net-err' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_tipo_oportunidad_negocio — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/tipos-oportunidad-negocio/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_tipo_oportunidad_negocio');
      const result = await handler({ id: 'net-err' });

      expect(result.isError).toBe(true);
    });
  });
});
