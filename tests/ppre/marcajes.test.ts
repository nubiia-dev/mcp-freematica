import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const MARCAJE = {
  trackType: 'ENT',
  serviceTag: 'SVC001',
  idReg: 'marcaje01',
};

const READ_TOOLS = [
  'freematica_list_ppre_marcajes',
  'freematica_list_ppre_marcajes_v2',
];

const WRITE_TOOLS = [
  'freematica_create_ppre_marcaje',
  'freematica_update_ppre_marcaje_v1',
  'freematica_update_ppre_marcaje_v2',
];

describe('ppre marcajes tools', () => {
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

  describe('freematica_list_ppre_marcajes', () => {
    it('lista marcajes v1 con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v1/marcajes')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([MARCAJE], 50));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_marcajes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(50);
      expect(parsed.items[0].trackType).toBe('ENT');
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/ppre/v1/marcajes')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_marcajes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_list_ppre_marcajes_v2', () => {
    it('lista marcajes v2 con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v2/marcajes')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([MARCAJE], 25));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_marcajes_v2');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(25);
      expect(parsed.items[0].trackType).toBe('ENT');
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/ppre/v2/marcajes')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_marcajes_v2');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_create_ppre_marcaje', () => {
    it('POST a /ppre/v1/guardar con los campos del marcaje', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/ppre/v1/guardar', (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, okEnvelope(MARCAJE));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_ppre_marcaje');
      const result = await handler({
        trackType: 'ENT',
        serviceTag: 'SVC001',
        date: '2026-08-01T08:00:00Z',
        latitude: 41.3851,
        longitude: 2.1734,
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody['trackType']).toBe('ENT');
      expect(sentBody['serviceTag']).toBe('SVC001');
      expect(sentBody['latitude']).toBe(41.3851);
    });
  });

  describe('freematica_update_ppre_marcaje_v1', () => {
    it('PUT a /ppre/v1/actualizar/:idReg', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(`/ppre/v1/actualizar/${MARCAJE.idReg}`, (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, okEnvelope(MARCAJE));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_ppre_marcaje_v1');
      const result = await handler({ idReg: MARCAJE.idReg, trackType: 'SAL' });

      expect(result.isError).toBeUndefined();
      expect(sentBody['trackType']).toBe('SAL');
    });
  });

  describe('freematica_update_ppre_marcaje_v2', () => {
    it('PUT a /ppre/v2/actualizar/:idReg', async () => {
      nock(BASE_URL)
        .put(`/ppre/v2/actualizar/${MARCAJE.idReg}`)
        .reply(200, okEnvelope(MARCAJE));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_ppre_marcaje_v2');
      const result = await handler({ idReg: MARCAJE.idReg, trackType: 'SAL' });

      expect(result.isError).toBeUndefined();
    });
  });
});
