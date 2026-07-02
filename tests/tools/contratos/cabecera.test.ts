import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import {
  BASE_URL,
  CONTRATO_IDREG,
  buildServer,
  getHandler,
  registeredTools,
  listEnvelope,
  detailEnvelope,
} from './helpers.js';

const CONTRATO = {
  CTRT_EMP: '02',
  CTRT_DELEG: '08',
  CTRT_COD: '2304',
  CTRT_DES: 'LIMPIEZA NAVE SEUR SUBIRATS',
  idReg: CONTRATO_IDREG,
};

describe('contratos cabecera tools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('registro y gate de escritura', () => {
    it('registra las tools de lectura siempre', () => {
      const { server } = buildServer();
      const tools = registeredTools(server);
      expect(tools).toHaveProperty('freematica_list_contratos');
      expect(tools).toHaveProperty('freematica_get_contrato');
    });

    it('NO registra tools de escritura sin enableWrites', () => {
      const { server } = buildServer();
      const tools = registeredTools(server);
      expect(tools).not.toHaveProperty('freematica_create_contrato');
      expect(tools).not.toHaveProperty('freematica_update_contrato');
    });

    it('registra tools de escritura con enableWrites=true', () => {
      const { server } = buildServer({ enableWrites: true });
      const tools = registeredTools(server);
      expect(tools).toHaveProperty('freematica_create_contrato');
      expect(tools).toHaveProperty('freematica_update_contrato');
    });

    it('nunca registra tools de borrado', () => {
      const { server } = buildServer({ enableWrites: true });
      const names = Object.keys(registeredTools(server));
      expect(names.filter((n) => n.includes('delete'))).toEqual([]);
    });
  });

  describe('freematica_list_contratos', () => {
    it('lista con params nativos codEmpresa/codDelegacion', async () => {
      const scope = nock(BASE_URL)
        .get('/pvss/v1/contratos')
        .query({ items: '20', page: '1', codEmpresa: '02', codDelegacion: '08' })
        .reply(200, listEnvelope([CONTRATO], 1543));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_contratos');
      const result = await handler({ page: 1, items: 20, empresa: '02', delegacion: '08' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1543);
      expect(parsed.items[0].CTRT_COD).toBe('2304');
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/contratos')
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_contratos');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_get_contrato', () => {
    it('encuentra el contrato paginando y filtrando en cliente', async () => {
      const otros = Array.from({ length: 200 }, (_, i) => ({
        CTRT_EMP: '02',
        CTRT_DELEG: '08',
        CTRT_COD: String(1000 + i),
      }));
      nock(BASE_URL)
        .get('/pvss/v1/contratos')
        .query({ codEmpresa: '02', page: '1', items: '200' })
        .reply(200, listEnvelope(otros, 201));
      nock(BASE_URL)
        .get('/pvss/v1/contratos')
        .query({ codEmpresa: '02', page: '2', items: '200' })
        .reply(200, listEnvelope([CONTRATO], 201));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_contrato');
      const result = await handler({ empresa: '02', codContrato: '2304' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.CTRT_DES).toBe('LIMPIEZA NAVE SEUR SUBIRATS');
      expect(parsed.idReg).toBe(CONTRATO_IDREG);
    });

    it('devuelve not_found si el contrato no existe', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/contratos')
        .query(true)
        .reply(200, listEnvelope([{ CTRT_EMP: '02', CTRT_COD: '1001' }], 1));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_contrato');
      const result = await handler({ empresa: '02', codContrato: '9999' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  describe('freematica_create_contrato', () => {
    it('envía el body VoContratos con los campos mapeados', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/pvss/v2/contratos', (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, detailEnvelope({ ...CONTRATO, CTRT_COD: '9001' }));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_contrato');
      const result = await handler({
        delegacion: '08',
        descripcion: 'CONTRATO TEST',
        fecha: '2026-07-01',
        codCliente: '1174',
        abierto: true,
        poblacion: 'BARCELONA',
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual({
        CTRT_DELEG: '08',
        CTRT_DES: 'CONTRATO TEST',
        CTRT_FECHA: '2026-07-01',
        CTRT_COD_CLI: '1174',
        CTRT_ABIERTO: '1',
        CTRT_POB: 'BARCELONA',
      });
      expect(JSON.parse(result.content[0].text).CTRT_COD).toBe('9001');
    });

    it('propaga errores del API como error()', async () => {
      nock(BASE_URL)
        .post('/pvss/v2/contratos')
        .reply(200, { errorCode: '403', errorMessage: 'Forbidden', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_contrato');
      const result = await handler({
        delegacion: '08',
        descripcion: 'X',
        fecha: '2026-07-01',
        codCliente: '1',
      });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('forbidden');
    });
  });

  describe('freematica_update_contrato', () => {
    it('hace PUT al idReg con solo los campos informados', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(`/pvss/v2/contratos/${CONTRATO_IDREG}`, (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, detailEnvelope(CONTRATO));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_contrato');
      const result = await handler({ idReg: CONTRATO_IDREG, descripcion: 'NUEVA DESC' });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual({ CTRT_DES: 'NUEVA DESC' });
    });

    it('rechaza update sin campos a actualizar', async () => {
      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_contrato');
      const result = await handler({ idReg: CONTRATO_IDREG });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).message).toContain('al menos un campo');
    });
  });
});
