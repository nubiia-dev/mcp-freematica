import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope } from './helpers.js';

const SERVICE_ID = 'service-pemf-01';
const MATERIAL = { idReg: 'mat-01', description: 'Guantes seguridad', quantity: 10 };

const READ_TOOLS = [
  'freematica_list_pemf_materiales_consumibles',
  'freematica_list_pemf_materiales_imputados',
];

describe('pemf materiales tools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('registro de tools de lectura', () => {
    it('registra las tools de materiales siempre', () => {
      const { server } = buildServer();
      const tools = registeredTools(server);
      for (const name of READ_TOOLS) {
        expect(tools).toHaveProperty(name);
      }
    });
  });

  describe('freematica_list_pemf_materiales_consumibles', () => {
    it('lista materiales consumibles de un servicio', async () => {
      const scope = nock(BASE_URL)
        .get(`/pemf/v2/services/${SERVICE_ID}/materiales-consumibles`)
        .reply(200, listEnvelope([MATERIAL], 5));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_materiales_consumibles');
      const result = await handler({ idReg: SERVICE_ID });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(5);
      expect(parsed.items[0].description).toBe('Guantes seguridad');
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get(`/pemf/v2/services/${SERVICE_ID}/materiales-consumibles`)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_materiales_consumibles');
      const result = await handler({ idReg: SERVICE_ID });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_list_pemf_materiales_imputados', () => {
    it('lista materiales imputados de un servicio', async () => {
      const scope = nock(BASE_URL)
        .get(`/pemf/v2/services/${SERVICE_ID}/materiales-imputados`)
        .reply(200, listEnvelope([{ ...MATERIAL, ftoRef: 'FTO001' }], 3));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_materiales_imputados');
      const result = await handler({ idReg: SERVICE_ID });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(3);
      scope.done();
    });
  });
});
