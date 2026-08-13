import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const NOTA = {
  TEXTO: 'Nota de seguimiento del cliente',
  FECHA: '2026-01-15',
  USUARIO: 'admin',
  idReg: 'nota-crm-01',
};

const READ_TOOLS = [
  'freematica_list_pcrm_notas',
  'freematica_get_pcrm_nota',
];

const WRITE_TOOLS = [
  'freematica_create_pcrm_nota',
];

describe('pcrm notas tools', () => {
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

  describe('freematica_list_pcrm_notas', () => {
    it('lista notas CRM con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/notas')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([NOTA], 15));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_notas');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(15);
      expect(parsed.items[0].TEXTO).toBe('Nota de seguimiento del cliente');
      scope.done();
    });

    it('devuelve error() en fallo del API (401)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/notas')
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_notas');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_get_pcrm_nota', () => {
    it('devuelve el detalle de una nota', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/notas/nota-crm-01')
        .reply(200, okEnvelope(NOTA));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_nota');
      const result = await handler({ id: 'nota-crm-01' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.USUARIO).toBe('admin');
      scope.done();
    });

    it('devuelve error() si la nota no existe (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/notas/unknown')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_nota');
      const result = await handler({ id: 'unknown' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  describe('freematica_list_pcrm_notas — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/notas').query(true).replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_notas');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pcrm_nota — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/notas/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_nota');
      const result = await handler({ id: 'net-err' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_pcrm_nota', () => {
    it('crea una nota CRM y devuelve el registro', async () => {
      const created = { ...NOTA, idReg: 'nota-crm-99' };
      const scope = nock(BASE_URL)
        .post('/pcrm/v2/notas', (body: Record<string, unknown>) => body['TEXTO'] === 'Nueva nota')
        .reply(200, okEnvelope(created));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pcrm_nota');
      const result = await handler({ camposNativos: { TEXTO: 'Nueva nota', USUARIO: 'admin' } });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.idReg).toBe('nota-crm-99');
      scope.done();
    });

    it('devuelve error() si el API rechaza la creación (500)', async () => {
      nock(BASE_URL)
        .post('/pcrm/v2/notas')
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pcrm_nota');
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });

    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).post('/pcrm/v2/notas').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pcrm_nota');
      const result = await handler({});

      expect(result.isError).toBe(true);
    });
  });
});
