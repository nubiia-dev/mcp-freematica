import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const RONDA = { idReg: 'ronda-pemf-01', name: 'Ronda Nocturna', serviceTag: 'SVC001' };
const POINT = { idReg: 'point-pemf-01', name: 'Punto A', latitude: 41.3851, longitude: 2.1734 };

const READ_TOOLS = [
  'freematica_list_pemf_rondas',
  'freematica_list_pemf_rondas_v2',
  'freematica_list_pemf_ronda_points',
  'freematica_list_pemf_ronda_points_v2',
];

const WRITE_TOOLS = ['freematica_create_pemf_ronda'];

describe('pemf rondas tools', () => {
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

  describe('freematica_list_pemf_rondas', () => {
    it('lista rondas v1 con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v1/rounds')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([RONDA], 15));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_rondas');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(15);
      expect(parsed.items[0].name).toBe('Ronda Nocturna');
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/pemf/v1/rounds')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_rondas');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_list_pemf_rondas_v2', () => {
    it('lista rondas v2 con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v2/rounds')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([RONDA], 12));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_rondas_v2');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(12);
      scope.done();
    });
  });

  describe('freematica_list_pemf_ronda_points', () => {
    it('lista puntos de una ronda v1', async () => {
      const scope = nock(BASE_URL)
        .get(`/pemf/v1/rounds/${RONDA.idReg}/points`)
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([POINT], 4));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_ronda_points');
      const result = await handler({ idRonda: RONDA.idReg, page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(4);
      expect(parsed.items[0].name).toBe('Punto A');
      scope.done();
    });
  });

  describe('freematica_list_pemf_ronda_points_v2', () => {
    it('lista puntos de una ronda v2', async () => {
      const scope = nock(BASE_URL)
        .get(`/pemf/v2/rounds/${RONDA.idReg}/points`)
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([POINT], 3));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_ronda_points_v2');
      const result = await handler({ idRonda: RONDA.idReg, page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(3);
      scope.done();
    });
  });

  describe('freematica_create_pemf_ronda', () => {
    it('POST a /pemf/v1/rounds con los campos de la ronda', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/pemf/v1/rounds', (body) => {
          sentBody = body as Record<string, unknown>;
          return true;
        })
        .reply(200, okEnvelope(RONDA));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pemf_ronda');
      const result = await handler({ name: 'Ronda Nocturna', serviceTag: 'SVC001' });

      expect(result.isError).toBeUndefined();
      expect(sentBody['name']).toBe('Ronda Nocturna');
      expect(sentBody['serviceTag']).toBe('SVC001');
    });
  });
});
