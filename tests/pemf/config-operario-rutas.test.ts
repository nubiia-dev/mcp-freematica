import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, okEnvelope } from './helpers.js';

const CONFIG_GLOBAL = { version: '1.0', enabled: true };
const CONFIG_MODULE = { idConfig: 'MOD_ROUNDS', param1: 'value1' };
const OPERARIO = { idReg: 'op-01', name: 'Juan García', empresa: 'EMP1' };
const RUTA = { idReg: 'ruta-01', empresa: 'EMP1', persona: 'OP001' };
const DESCUBIERTOS = [{ serviceTag: 'SVC001', date: '2026-08-13' }];

const READ_TOOLS = [
  'freematica_get_pemf_config_global',
  'freematica_get_pemf_config',
  'freematica_list_pemf_usuarios_notificaciones',
  'freematica_get_pemf_operario',
  'freematica_list_pemf_descubiertos',
];

const WRITE_TOOLS = [
  'freematica_save_pemf_config',
  'freematica_update_pemf_config',
  'freematica_update_pemf_ruta',
];

describe('pemf config, operario y rutas tools', () => {
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

  describe('freematica_get_pemf_config_global', () => {
    it('obtiene la configuración global', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v1/config')
        .reply(200, okEnvelope(CONFIG_GLOBAL));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pemf_config_global');
      const result = await handler({});

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.enabled).toBe(true);
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/pemf/v1/config')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pemf_config_global');
      const result = await handler({});

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pemf_config', () => {
    it('obtiene configuración de un módulo (v1)', async () => {
      const idConfig = 'MOD_ROUNDS';
      const scope = nock(BASE_URL)
        .get(`/pemf/v1/config/${idConfig}`)
        .reply(200, okEnvelope(CONFIG_MODULE));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pemf_config');
      const result = await handler({ idConfig, version: 'v1' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.idConfig).toBe('MOD_ROUNDS');
      scope.done();
    });

    it('obtiene configuración de un módulo (v2)', async () => {
      const idConfig = 'MOD_ROUNDS';
      const scope = nock(BASE_URL)
        .get(`/pemf/v2/config/${idConfig}`)
        .reply(200, okEnvelope(CONFIG_MODULE));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pemf_config');
      const result = await handler({ idConfig, version: 'v2' });

      expect(result.isError).toBeUndefined();
      scope.done();
    });
  });

  describe('freematica_list_pemf_usuarios_notificaciones', () => {
    it('obtiene lista de usuarios de notificaciones', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v1/usuarios-notificaciones')
        .reply(200, okEnvelope([{ idReg: 'user-01', email: 'admin@example.com' }]));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_usuarios_notificaciones');
      const result = await handler({});

      expect(result.isError).toBeUndefined();
      scope.done();
    });
  });

  describe('freematica_get_pemf_operario', () => {
    it('obtiene datos del operario', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v1/users')
        .reply(200, okEnvelope(OPERARIO));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pemf_operario');
      const result = await handler({});

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.name).toBe('Juan García');
      scope.done();
    });
  });

  describe('freematica_list_pemf_descubiertos', () => {
    it('obtiene descubiertos', async () => {
      const scope = nock(BASE_URL)
        .get('/pemf/v1/descubiertos')
        .reply(200, okEnvelope(DESCUBIERTOS));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pemf_descubiertos');
      const result = await handler({});

      expect(result.isError).toBeUndefined();
      scope.done();
    });
  });

  describe('freematica_save_pemf_config', () => {
    it('POST a /pemf/v1/config/:idConfig', async () => {
      const idConfig = 'MOD_ROUNDS';
      nock(BASE_URL)
        .post(`/pemf/v1/config/${idConfig}`)
        .reply(200, okEnvelope(CONFIG_MODULE));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_save_pemf_config');
      const result = await handler({ idConfig, version: 'v1', camposAdicionales: { PARAM1: 'value1' } });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('freematica_update_pemf_config', () => {
    it('PUT a /pemf/v1/config/:idConfig', async () => {
      const idConfig = 'MOD_ROUNDS';
      nock(BASE_URL)
        .put(`/pemf/v1/config/${idConfig}`)
        .reply(200, okEnvelope(CONFIG_MODULE));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pemf_config');
      const result = await handler({ idConfig, version: 'v1' });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('freematica_update_pemf_ruta', () => {
    it('PUT a /pemf/v2/routes/:idReg con campos de la ruta', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(`/pemf/v2/routes/${RUTA.idReg}`, (body) => {
          sentBody = body as Record<string, unknown>;
          return true;
        })
        .reply(200, okEnvelope(RUTA));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pemf_ruta');
      const result = await handler({
        idReg: RUTA.idReg,
        empresa: 'EMP1',
        persona: 'OP002',
        hhIni: '08:00',
        hhFin: '16:00',
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody['empresa']).toBe('EMP1');
      expect(sentBody['persona']).toBe('OP002');
      expect(sentBody['hhIni']).toBe('08:00');
    });
  });
});
