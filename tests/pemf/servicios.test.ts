import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const SERVICE = { idReg: 'service-pemf-01', name: 'Servicio Edificio A', status: 'active' };

const READ_TOOLS = [
  'freematica_list_pemf_services',
  'freematica_get_pemf_service',
  'freematica_list_pemf_service_alarms',
  'freematica_list_pemf_service_issues',
  'freematica_list_pemf_service_rounds',
  'freematica_list_pemf_service_jobs',
  'freematica_list_pemf_identificadores_servicio',
  'freematica_list_pemf_rutas',
];

describe('pemf servicios tools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('registro de tools de lectura', () => {
    it('registra todas las tools de servicios', () => {
      const { server } = buildServer();
      const tools = registeredTools(server);
      for (const name of READ_TOOLS) {
        expect(tools).toHaveProperty(name);
      }
    });
  });

  describe('freematica_list_pemf_services', () => {
    it('lista servicios con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v1/services')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([SERVICE], 30));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_services');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(30);
      expect(parsed.items[0].name).toBe('Servicio Edificio A');
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/pemf/v1/services')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_services');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pemf_service', () => {
    it('obtiene detalle de un servicio por idService', async () => {
      const scope = nock(BASE_URL)
        .get(`/pemf/v1/services/${SERVICE.idReg}`)
        .reply(200, okEnvelope(SERVICE));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pemf_service');
      const result = await handler({ idService: SERVICE.idReg });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.name).toBe('Servicio Edificio A');
      scope.done();
    });
  });

  describe('freematica_list_pemf_service_alarms', () => {
    it('lista alarmas de un servicio', async () => {
      const scope = nock(BASE_URL)
        .get(`/pemf/v1/services/${SERVICE.idReg}/alarms`)
        .reply(200, okEnvelope([{ type: 'ALARM', timestamp: '2026-08-13T02:00:00Z' }]));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_service_alarms');
      const result = await handler({ idService: SERVICE.idReg });

      expect(result.isError).toBeUndefined();
      scope.done();
    });
  });

  describe('freematica_list_pemf_service_issues', () => {
    it('lista incidencias de un servicio', async () => {
      const scope = nock(BASE_URL)
        .get(`/pemf/v1/services/${SERVICE.idReg}/issues`)
        .reply(200, okEnvelope([]));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_service_issues');
      const result = await handler({ idService: SERVICE.idReg });

      expect(result.isError).toBeUndefined();
      scope.done();
    });
  });

  describe('freematica_list_pemf_service_rounds', () => {
    it('lista rondas de un servicio', async () => {
      const scope = nock(BASE_URL)
        .get(`/pemf/v1/services/${SERVICE.idReg}/rounds`)
        .reply(200, okEnvelope([]));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_service_rounds');
      const result = await handler({ idService: SERVICE.idReg });

      expect(result.isError).toBeUndefined();
      scope.done();
    });
  });

  describe('freematica_list_pemf_service_jobs', () => {
    it('lista trabajos de un servicio', async () => {
      const scope = nock(BASE_URL)
        .get(`/pemf/v1/services/${SERVICE.idReg}/jobs`)
        .reply(200, okEnvelope([]));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_service_jobs');
      const result = await handler({ idService: SERVICE.idReg });

      expect(result.isError).toBeUndefined();
      scope.done();
    });
  });

  describe('freematica_list_pemf_identificadores_servicio', () => {
    it('lista identificadores de servicio con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v2/identificadores-servicio')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([{ tag: 'QR001', serviceTag: 'SVC001' }], 10));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_identificadores_servicio');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(10);
      scope.done();
    });
  });

  describe('freematica_list_pemf_rutas', () => {
    it('lista rutas con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v2/routes')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([{ idReg: 'ruta-01', empresa: 'EMP1' }], 20));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_rutas');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(20);
      scope.done();
    });
  });
});
