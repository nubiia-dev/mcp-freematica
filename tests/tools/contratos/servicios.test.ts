import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import {
  BASE_URL,
  CONTRATO_IDREG,
  SERVICIO_IDREG,
  buildServer,
  getHandler,
  registeredTools,
  listEnvelope,
  detailEnvelope,
} from './helpers.js';

const SERVICIO = {
  CTRTS_EMP: '02',
  CTRTS_DELEG: '08',
  CTRTS_CTRT: '2304',
  CTRTS_COD: '1',
  CTRTS_DES: 'LIMPIEZA',
  idReg: SERVICIO_IDREG,
};

describe('contratos servicios tools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('registro y gate de escritura', () => {
    it('registra lectura siempre y escritura solo con enableWrites', () => {
      const readonly = registeredTools(buildServer().server);
      expect(readonly).toHaveProperty('freematica_list_servicios_contrato');
      expect(readonly).toHaveProperty('freematica_get_servicio_contrato');
      expect(readonly).not.toHaveProperty('freematica_create_servicio_contrato');
      expect(readonly).not.toHaveProperty('freematica_update_servicio_fechas');

      const writable = registeredTools(buildServer({ enableWrites: true }).server);
      expect(writable).toHaveProperty('freematica_create_servicio_contrato');
      expect(writable).toHaveProperty('freematica_update_servicio_fechas');
      expect(writable).toHaveProperty('freematica_create_servicio_historico_precios');
      expect(writable).toHaveProperty('freematica_update_servicio_historico_precios');
      expect(writable).toHaveProperty('freematica_create_servicio_facturacion_txt');
      expect(writable).toHaveProperty('freematica_update_servicio_facturacion');
    });
  });

  describe('freematica_list_servicios_contrato', () => {
    it('lista los servicios del contrato', async () => {
      nock(BASE_URL)
        .get(`/pvss/v1/contratos/${CONTRATO_IDREG}/servicios`)
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([SERVICIO], 5));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_servicios_contrato');
      const result = await handler({ idContrato: CONTRATO_IDREG, page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(5);
      expect(parsed.items[0].CTRTS_DES).toBe('LIMPIEZA');
    });
  });

  describe('freematica_get_servicio_contrato', () => {
    it('devuelve el detalle del servicio por idReg', async () => {
      nock(BASE_URL)
        .get(`/pvss/v2/contratos-servicios/${SERVICIO_IDREG}`)
        .reply(200, detailEnvelope(SERVICIO));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_servicio_contrato');
      const result = await handler({ idReg: SERVICIO_IDREG });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).CTRTS_COD).toBe('1');
    });
  });

  describe('freematica_create_servicio_contrato', () => {
    it('deriva CTRTS_EMP/DELEG/CTRT del idContrato y envía el body', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post(`/pvss/v2/contratos/${CONTRATO_IDREG}/servicios`, (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, detailEnvelope(SERVICIO));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_servicio_contrato');
      const result = await handler({
        idContrato: CONTRATO_IDREG,
        descripcion: 'LIMPIEZA EXTRA',
        tipo: '2',
        fechaAlta: '2026-07-01',
        clase: '201',
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual({
        CTRTS_EMP: '02',
        CTRTS_DELEG: '08',
        CTRTS_CTRT: '2304',
        CTRTS_DES: 'LIMPIEZA EXTRA',
        CTRTS_TIPO: '2',
        CTRTS_FECALTA: '2026-07-01',
        CTRTS_CLASE: '201',
      });
    });

    it('rechaza un idContrato con formato inválido', async () => {
      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_servicio_contrato');
      // Base64 de "invalido" (sin separadores __)
      const result = await handler({ idContrato: 'aW52YWxpZG8=', descripcion: 'X' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).message).toContain('idReg de contrato inválido');
    });
  });

  describe('freematica_update_servicio_fechas', () => {
    it('envía las fechas con las claves derivadas del idServicio', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(`/pvss/v2/contratos/${CONTRATO_IDREG}/servicio/${SERVICIO_IDREG}`, (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, detailEnvelope(SERVICIO));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_servicio_fechas');
      const result = await handler({
        idContrato: CONTRATO_IDREG,
        idServicio: SERVICIO_IDREG,
        fechaFin: '2026-12-31',
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual({
        CTRTS_EMP: '02',
        CTRTS_DELEG: '08',
        CTRTS_CTRT: '2304',
        CTRTS_COD: '1',
        CTRTS_FECFIN: '2026-12-31',
      });
    });

    it('rechaza la llamada sin ninguna fecha', async () => {
      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_servicio_fechas');
      const result = await handler({
        idContrato: CONTRATO_IDREG,
        idServicio: SERVICIO_IDREG,
      });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).message).toContain('fechaAlta y/o fechaFin');
    });
  });

  describe('freematica_create_servicio_historico_precios', () => {
    it('deriva SERVHPR_* y envía los precios', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post(
          `/pvss/v2/contratos/${CONTRATO_IDREG}/servicios-historico-precios/${SERVICIO_IDREG}`,
          (body) => {
            sentBody = body;
            return true;
          },
        )
        .reply(200, detailEnvelope({ SERVHPR_SERV: '1' }));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_servicio_historico_precios');
      const result = await handler({
        idContrato: CONTRATO_IDREG,
        idServicio: SERVICIO_IDREG,
        fecha: '2026-07-01',
        precioHoraGlobal: 18.5,
        importeFijo: 1200,
        noAplicado: false,
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual({
        SERVHPR_EMP: '02',
        SERVHPR_DELEG: '08',
        SERVHPR_CTRT: '2304',
        SERVHPR_SERV: '1',
        SERVHPR_FCH: '2026-07-01',
        SERVHPR_PR_H_GLOBAL: 18.5,
        SERVHPR_IMP_FIJO: 1200,
        SERVHPR_NO_APLICADO: '0',
      });
    });
  });

  describe('freematica_update_servicio_historico_precios', () => {
    it('hace PUT con los campos informados', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(
          `/pvss/v2/contratos/${CONTRATO_IDREG}/servicios-historico-precios/${SERVICIO_IDREG}`,
          (body) => {
            sentBody = body;
            return true;
          },
        )
        .reply(200, detailEnvelope({ SERVHPR_SERV: '1' }));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_servicio_historico_precios');
      const result = await handler({
        idContrato: CONTRATO_IDREG,
        idServicio: SERVICIO_IDREG,
        porcentajeIncremento: 3.5,
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody['SERVHPR_PORC_INCR']).toBe(3.5);
    });
  });

  describe('freematica_create_servicio_facturacion_txt', () => {
    it('envía las 5 claves requeridas + textos', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post(
          `/pvss/v2/contratos/${CONTRATO_IDREG}/servicios-facturacion-txt/${SERVICIO_IDREG}`,
          (body) => {
            sentBody = body;
            return true;
          },
        )
        .reply(200, detailEnvelope({ CTRTFL_LIN: '1' }));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_servicio_facturacion_txt');
      const result = await handler({
        idContrato: CONTRATO_IDREG,
        idServicio: SERVICIO_IDREG,
        linea: '1',
        texto: 'LIMPIEZA MENSUAL NAVE',
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual({
        CTRTFL_EMP: '02',
        CTRTFL_DELEG: '08',
        CTRTFL_CTRT: '2304',
        CTRTFL_SERV: '1',
        CTRTFL_LIN: '1',
        CTRTFL_TXT: 'LIMPIEZA MENSUAL NAVE',
      });
    });
  });

  describe('freematica_update_servicio_facturacion', () => {
    it('mapea campos amigables y acepta camposAdicionales CTRTF_*', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(
          `/pvss/v2/contratos/${CONTRATO_IDREG}/servicios-facturacion/${SERVICIO_IDREG}`,
          (body) => {
            sentBody = body;
            return true;
          },
        )
        .reply(200, detailEnvelope({ CTRTF_SERV: '1' }));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_servicio_facturacion');
      const result = await handler({
        idContrato: CONTRATO_IDREG,
        idServicio: SERVICIO_IDREG,
        precioHora: 19.75,
        ivaIncluido: false,
        camposAdicionales: { CTRTF_PORCFAC: 100 },
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual({
        CTRTF_EMP: '02',
        CTRTF_DELEG: '08',
        CTRTF_CTRT: '2304',
        CTRTF_SERV: '1',
        CTRTF_PRECIOH: 19.75,
        CTRTF_IVA_INC: '0',
        CTRTF_PORCFAC: 100,
      });
    });

    it('rechaza update sin campos de facturación', async () => {
      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_servicio_facturacion');
      const result = await handler({
        idContrato: CONTRATO_IDREG,
        idServicio: SERVICIO_IDREG,
      });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).message).toContain('al menos un campo');
    });
  });
});
