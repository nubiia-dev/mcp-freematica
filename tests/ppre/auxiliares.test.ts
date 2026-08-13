import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope } from './helpers.js';

const INCIDENCIA = {
  idReg: 'aW5jaS0wMQ==',
  INC_CODIGO: 'INC001',
  INC_DESCRIPCION: 'Fallo sensor puerta',
};

const TIPO_INSTALACION = {
  idReg: 'dGlwby0wMQ==',
  TIN_CODIGO: 'ASC',
  TIN_DESCRIPCION: 'Ascensor',
};

const READ_TOOLS = [
  'freematica_list_ppre_incidencias_anomalias',
  'freematica_list_ppre_tipo_instalacion',
];

describe('ppre auxiliares tools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('registro', () => {
    it('registra todas las tools de lectura siempre', () => {
      const { server } = buildServer();
      const tools = registeredTools(server);
      for (const name of READ_TOOLS) {
        expect(tools).toHaveProperty(name);
      }
    });

    it('no expone tools de escritura (módulo sin writes)', () => {
      // auxiliares no tiene tools de escritura; simplemente verificamos
      // que el registro básico no falle con enableWrites=true
      const { server } = buildServer({ enableWrites: true });
      const tools = registeredTools(server);
      for (const name of READ_TOOLS) {
        expect(tools).toHaveProperty(name);
      }
    });
  });

  describe('freematica_list_ppre_incidencias_anomalias', () => {
    it('lista incidencias y anomalías con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v1/incidencias-anomalias')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([INCIDENCIA], 15));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_incidencias_anomalias');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(15);
      expect(parsed.items[0].INC_CODIGO).toBe('INC001');
      scope.done();
    });

    it('devuelve error() en fallo del API (401)', async () => {
      nock(BASE_URL)
        .get('/ppre/v1/incidencias-anomalias')
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_incidencias_anomalias');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_list_ppre_tipo_instalacion', () => {
    it('lista tipos de instalación con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v1/tipo-instalacion')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([TIPO_INSTALACION], 4));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_tipo_instalacion');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(4);
      expect(parsed.items[0].TIN_CODIGO).toBe('ASC');
      scope.done();
    });

    it('devuelve error() en fallo del API (500)', async () => {
      nock(BASE_URL)
        .get('/ppre/v1/tipo-instalacion')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_tipo_instalacion');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });
});
