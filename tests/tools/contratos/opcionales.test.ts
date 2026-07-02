import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import {
  BASE_URL,
  buildServer,
  getHandler,
  registeredTools,
  listEnvelope,
  detailEnvelope,
} from './helpers.js';

const OPCIONAL_IDREG = 'T1BDXzEyMw==';

const OPCIONAL = {
  CON2_CODEMP: '02',
  CON2_DELEG: '08',
  CON2_TIPOCONT: 'MANT',
  CON2_NUMCONT: 2304,
  CON2_FCHCONT: '2023-06-19',
  idReg: OPCIONAL_IDREG,
};

describe('contratos opcionales tools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('registro y gate de escritura', () => {
    it('registra lectura siempre y escritura solo con enableWrites', () => {
      const readonly = registeredTools(buildServer().server);
      expect(readonly).toHaveProperty('freematica_list_contratos_opcionales');
      expect(readonly).toHaveProperty('freematica_get_contrato_opcionales');
      expect(readonly).not.toHaveProperty('freematica_create_contrato_opcionales');
      expect(readonly).not.toHaveProperty('freematica_update_contrato_opcionales');

      const writable = registeredTools(buildServer({ enableWrites: true }).server);
      expect(writable).toHaveProperty('freematica_create_contrato_opcionales');
      expect(writable).toHaveProperty('freematica_update_contrato_opcionales');
    });
  });

  describe('freematica_list_contratos_opcionales', () => {
    it('lista paginada', async () => {
      nock(BASE_URL)
        .get('/ppre/v2/contratos/opcionales')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([OPCIONAL], 1));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_contratos_opcionales');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).items[0].CON2_NUMCONT).toBe(2304);
    });
  });

  describe('freematica_get_contrato_opcionales', () => {
    it('devuelve el detalle por idReg', async () => {
      nock(BASE_URL)
        .get(`/ppre/v2/contratos/opcionales/${encodeURIComponent(OPCIONAL_IDREG)}`)
        .reply(200, detailEnvelope(OPCIONAL));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_contrato_opcionales');
      const result = await handler({ idReg: OPCIONAL_IDREG });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).CON2_TIPOCONT).toBe('MANT');
    });
  });

  describe('freematica_create_contrato_opcionales', () => {
    it('envía el body con requeridos + camposAdicionales CON2_*', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/ppre/v2/contratos/opcionales', (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, detailEnvelope(OPCIONAL));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_contrato_opcionales');
      const result = await handler({
        empresa: '02',
        delegacion: '08',
        tipoContrato: 'MANT',
        numContrato: 2304,
        fechaContrato: '2023-06-19',
        observaciones1: 'ALTA DESDE MCP',
        camposAdicionales: { CON2_OPC_NUM1: 42, CON2_OPC_ALFA1: 'X' },
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual({
        CON2_CODEMP: '02',
        CON2_DELEG: '08',
        CON2_TIPOCONT: 'MANT',
        CON2_NUMCONT: 2304,
        CON2_FCHCONT: '2023-06-19',
        CON2_OBSERV1: 'ALTA DESDE MCP',
        CON2_OPC_NUM1: 42,
        CON2_OPC_ALFA1: 'X',
      });
    });
  });

  describe('freematica_update_contrato_opcionales', () => {
    it('hace PUT solo con los campos informados', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(`/ppre/v2/contratos/opcionales/${encodeURIComponent(OPCIONAL_IDREG)}`, (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, detailEnvelope(OPCIONAL));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_contrato_opcionales');
      const result = await handler({
        idReg: OPCIONAL_IDREG,
        observaciones2: 'ACTUALIZADO',
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual({ CON2_OBSERV2: 'ACTUALIZADO' });
    });

    it('rechaza update sin campos', async () => {
      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_contrato_opcionales');
      const result = await handler({ idReg: OPCIONAL_IDREG });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).message).toContain('al menos un campo');
    });
  });
});
