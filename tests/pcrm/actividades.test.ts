import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const ACTIVIDAD = {
  ID_ACTIVIDAD: 101,
  TIPO_ID: 'C',
  ASUNTO: 'Reunión de seguimiento',
  COD_ESTADO: 'A',
  idReg: 'crma-act-01',
};

const READ_TOOLS = [
  'freematica_list_pcrm_actividades',
  'freematica_get_pcrm_actividad',
];

const WRITE_TOOLS = [
  'freematica_create_pcrm_actividad',
  'freematica_update_pcrm_actividad',
];

describe('pcrm actividades tools', () => {
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

  describe('freematica_list_pcrm_actividades', () => {
    it('lista actividades CRM con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/actividades')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([ACTIVIDAD], 55));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_actividades');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(55);
      expect(parsed.items[0].ID_ACTIVIDAD).toBe(101);
      expect(parsed.items[0].ASUNTO).toBe('Reunión de seguimiento');
      scope.done();
    });

    it('devuelve error() en fallo del API (401)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/actividades')
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_actividades');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_get_pcrm_actividad', () => {
    it('devuelve el detalle de una actividad', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/actividades/crma-act-01')
        .reply(200, okEnvelope(ACTIVIDAD));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_actividad');
      const result = await handler({ id: 'crma-act-01' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.ID_ACTIVIDAD).toBe(101);
      scope.done();
    });

    it('devuelve error() si la actividad no existe (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/actividades/unknown')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_actividad');
      const result = await handler({ id: 'unknown' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  describe('freematica_create_pcrm_actividad', () => {
    it('crea una actividad y devuelve el registro', async () => {
      const created = { ...ACTIVIDAD, ID_ACTIVIDAD: 999 };
      const scope = nock(BASE_URL)
        .post('/pcrm/v2/actividades', (body: Record<string, unknown>) => body['ASUNTO'] === 'Nueva cita')
        .reply(200, okEnvelope(created));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pcrm_actividad');
      const result = await handler({ ASUNTO: 'Nueva cita', TIPO_ID: 'C', COD_ESTADO: 'A' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.ID_ACTIVIDAD).toBe(999);
      scope.done();
    });

    it('devuelve error() si el API rechaza la creación (500)', async () => {
      nock(BASE_URL)
        .post('/pcrm/v2/actividades')
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pcrm_actividad');
      const result = await handler({ ASUNTO: 'Test' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_list_pcrm_actividades — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/actividades').query(true).replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_actividades');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pcrm_actividad — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/actividades/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_actividad');
      const result = await handler({ id: 'net-err' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_pcrm_actividad — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).post('/pcrm/v2/actividades').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pcrm_actividad');
      const result = await handler({ ASUNTO: 'Test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_pcrm_actividad', () => {
    it('actualiza una actividad y devuelve el registro (fetch+merge)', async () => {
      const updated = { ...ACTIVIDAD, COD_ESTADO: 'F' };
      // fetch+merge: GET current → PUT merged body
      const scopeGet = nock(BASE_URL)
        .get('/pcrm/v2/actividades/crma-act-01')
        .reply(200, okEnvelope(ACTIVIDAD));
      const scopePut = nock(BASE_URL)
        .put('/pcrm/v2/actividades/crma-act-01', (body: Record<string, unknown>) =>
          body['COD_ESTADO'] === 'F' && body['ASUNTO'] === 'Reunión de seguimiento',
        )
        .reply(200, okEnvelope(updated));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_actividad');
      const result = await handler({ idReg: 'crma-act-01', COD_ESTADO: 'F' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.COD_ESTADO).toBe('F');
      scopeGet.done();
      scopePut.done();
    });

    it('devuelve error() si el registro no existe en el GET previo (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/actividades/no-existe')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_actividad');
      const result = await handler({ idReg: 'no-existe', COD_ESTADO: 'F' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });

    it('devuelve error() ante un error de red en el GET previo (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/actividades/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_actividad');
      const result = await handler({ idReg: 'net-err', COD_ESTADO: 'F' });

      expect(result.isError).toBe(true);
    });
  });
});
