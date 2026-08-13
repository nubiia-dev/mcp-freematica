import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const DEVICE = {
  idReg: 'device-pemf-01',
  name: 'Dispositivo Test',
  type: 'mobile',
  status: 'active',
};

const READ_TOOLS = [
  'freematica_list_pemf_devices',
  'freematica_get_pemf_device',
];

const WRITE_TOOLS = [
  'freematica_create_pemf_device',
  'freematica_update_pemf_device',
];

describe('pemf dispositivos tools', () => {
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

  describe('freematica_list_pemf_devices', () => {
    it('lista dispositivos con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v1/devices')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([DEVICE], 8));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_devices');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(8);
      expect(parsed.items[0].name).toBe('Dispositivo Test');
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/pemf/v1/devices')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_devices');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_get_pemf_device', () => {
    it('obtiene detalle de un dispositivo por idDevice', async () => {
      const scope = nock(BASE_URL)
        .get(`/pemf/v1/devices/${DEVICE.idReg}`)
        .reply(200, okEnvelope(DEVICE));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pemf_device');
      const result = await handler({ idDevice: DEVICE.idReg });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.name).toBe('Dispositivo Test');
      scope.done();
    });

    it('devuelve error not_found cuando el API responde 404', async () => {
      nock(BASE_URL)
        .get(`/pemf/v1/devices/${DEVICE.idReg}`)
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pemf_device');
      const result = await handler({ idDevice: DEVICE.idReg });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  describe('freematica_create_pemf_device', () => {
    it('POST a /pemf/v1/devices con los campos del dispositivo', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/pemf/v1/devices', (body) => {
          sentBody = body as Record<string, unknown>;
          return true;
        })
        .reply(200, okEnvelope(DEVICE));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_pemf_device');
      const result = await handler({ name: 'Dispositivo Test', type: 'mobile' });

      expect(result.isError).toBeUndefined();
      expect(sentBody['name']).toBe('Dispositivo Test');
      expect(sentBody['type']).toBe('mobile');
    });
  });

  describe('freematica_update_pemf_device', () => {
    it('PUT a /pemf/v1/devices/:idDevice', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(`/pemf/v1/devices/${DEVICE.idReg}`, (body) => {
          sentBody = body as Record<string, unknown>;
          return true;
        })
        .reply(200, okEnvelope(DEVICE));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pemf_device');
      const result = await handler({ idDevice: DEVICE.idReg, status: 'inactive' });

      expect(result.isError).toBeUndefined();
      expect(sentBody['status']).toBe('inactive');
    });
  });
});
