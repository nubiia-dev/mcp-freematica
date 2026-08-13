import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const MARCAJE = {
  idReg: 'marcaje-pemf-01',
  trackType: 'ENT',
  serviceTag: 'SVCFIELD01',
  personTag: 'OP001',
};

const READ_TOOLS = [
  'freematica_list_pemf_marcajes',
  'freematica_get_pemf_marcaje',
  'freematica_list_pemf_tracking',
  'freematica_list_pemf_calls',
  'freematica_list_pemf_geoposition',
  'freematica_list_pemf_geoposition_v2',
  'freematica_list_pemf_cna',
];

const WRITE_TOOLS = [
  'freematica_create_pemf_marcaje',
  'freematica_create_pemf_marcaje_fecha_persona',
];

describe('pemf marcajes tools', () => {
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

  describe('freematica_list_pemf_marcajes', () => {
    it('lista marcajes pemf v2 con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v2/marcajes')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([MARCAJE], 42));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_marcajes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(42);
      expect(parsed.items[0].trackType).toBe('ENT');
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/pemf/v2/marcajes')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error interno', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_marcajes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_get_pemf_marcaje', () => {
    it('obtiene detalle de un marcaje pemf por idReg', async () => {
      const scope = nock(BASE_URL)
        .get(`/pemf/v2/marcajes/${MARCAJE.idReg}`)
        .reply(200, listEnvelope([MARCAJE], 1));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pemf_marcaje');
      const result = await handler({ idReg: MARCAJE.idReg });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.trackType).toBe('ENT');
      scope.done();
    });

    it('devuelve error not_found si el item no existe', async () => {
      nock(BASE_URL)
        .get(`/pemf/v2/marcajes/${MARCAJE.idReg}`)
        .reply(200, listEnvelope([], 0));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pemf_marcaje');
      const result = await handler({ idReg: MARCAJE.idReg });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  describe('freematica_list_pemf_tracking', () => {
    it('lista tracking pemf v1', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v1/tracking')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([MARCAJE], 10));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_tracking');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(10);
      scope.done();
    });
  });

  describe('freematica_list_pemf_calls', () => {
    it('lista calls pemf v1', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v1/calls')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([MARCAJE], 5));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_calls');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(5);
      scope.done();
    });
  });

  describe('freematica_list_pemf_geoposition', () => {
    it('lista geoposición pemf v1', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v1/geoposition')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([{ latitude: 41.3851, longitude: 2.1734 }], 3));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_geoposition');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(3);
      scope.done();
    });
  });

  describe('freematica_list_pemf_geoposition_v2', () => {
    it('lista geoposición pemf v2', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v2/geoposition')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([{ latitude: 41.3851 }], 2));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_geoposition_v2');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(2);
      scope.done();
    });
  });

  describe('freematica_list_pemf_cna', () => {
    it('lista CNA pemf v2', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v2/cna')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([{ status: 'active' }], 7));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_cna');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(7);
      scope.done();
    });
  });

  describe('freematica_create_pemf_marcaje', () => {
    it('POST a /pemf/v1/servicio/:idservicio/crear-marcaje con los campos del marcaje', async () => {
      const idServicio = 'SVC001';
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post(`/pemf/v1/servicio/${idServicio}/crear-marcaje`, (body) => {
          sentBody = body as Record<string, unknown>;
          return true;
        })
        .reply(200, okEnvelope(MARCAJE));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pemf_marcaje');
      const result = await handler({
        idServicio,
        trackType: 'ENT',
        serviceTag: 'SVCFIELD01',
        personTag: 'OP001',
        latitude: 41.3851,
        longitude: 2.1734,
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody['trackType']).toBe('ENT');
      expect(sentBody['personTag']).toBe('OP001');
      expect(sentBody['latitude']).toBe(41.3851);
    });
  });

  describe('freematica_create_pemf_marcaje_fecha_persona', () => {
    it('POST a /pemf/v2/marcaje-fechapersona con date y personTag', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/pemf/v2/marcaje-fechapersona', (body) => {
          sentBody = body as Record<string, unknown>;
          return true;
        })
        .reply(200, okEnvelope(MARCAJE));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pemf_marcaje_fecha_persona');
      const result = await handler({
        date: '2026-08-13T08:00:00Z',
        personTag: 'OP001',
        serviceTag: 'SVCFIELD01',
        trackType: 'ENT',
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody['date']).toBe('2026-08-13T08:00:00Z');
      expect(sentBody['personTag']).toBe('OP001');
      expect(sentBody['trackType']).toBe('ENT');
    });
  });
});
