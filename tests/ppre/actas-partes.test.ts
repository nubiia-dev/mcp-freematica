import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const CABECERA_ACTA = {
  idReg: 'cabecera-acta-01',
  ACT_NUMERO: 1001,
  ACT_FECHA: '2026-08-01',
  ACT_ESTADO: 'P',
};

const LINEA_ACTA = {
  idReg: 'linea-acta-01',
  LIN_NUMERO: 1,
  LIN_DESCRIPCION: 'Revisión ascensor',
};

const READ_TOOLS = [
  'freematica_list_ppre_cabecera_actas_partes',
  'freematica_list_ppre_lineas_actas_partes',
];

const WRITE_TOOLS = [
  'freematica_update_ppre_lineas_actas_partes',
];

describe('ppre actas-partes tools', () => {
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

  describe('freematica_list_ppre_cabecera_actas_partes', () => {
    it('lista cabeceras de actas de partes con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v2/partes/cabecera-actas-partes')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([CABECERA_ACTA], 3));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_cabecera_actas_partes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(3);
      expect(parsed.items[0].ACT_NUMERO).toBe(1001);
      scope.done();
    });

    it('devuelve error() en fallo del API (401)', async () => {
      nock(BASE_URL)
        .get('/ppre/v2/partes/cabecera-actas-partes')
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_cabecera_actas_partes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_list_ppre_lineas_actas_partes', () => {
    it('lista líneas de actas de partes con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v2/partes/lineas-actas-partes')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([LINEA_ACTA], 7));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_lineas_actas_partes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(7);
      expect(parsed.items[0].LIN_DESCRIPCION).toBe('Revisión ascensor');
      scope.done();
    });

    it('devuelve error() en fallo del API (500)', async () => {
      nock(BASE_URL)
        .get('/ppre/v2/partes/lineas-actas-partes')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_lineas_actas_partes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_update_ppre_lineas_actas_partes', () => {
    it('PUT a /ppre/v2/partes/importar-lineas-actas-partes/:idReg con camposAdicionales', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(`/ppre/v2/partes/importar-lineas-actas-partes/${LINEA_ACTA.idReg}`, (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, okEnvelope(LINEA_ACTA));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_ppre_lineas_actas_partes');
      const result = await handler({
        idReg: LINEA_ACTA.idReg,
        camposAdicionales: { LIN_ESTADO: 'C', LIN_OBSERVACIONES: 'Completado' },
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody['LIN_ESTADO']).toBe('C');
      expect(sentBody['LIN_OBSERVACIONES']).toBe('Completado');
    });

    it('propaga errores del API como error()', async () => {
      nock(BASE_URL)
        .put(`/ppre/v2/partes/importar-lineas-actas-partes/${LINEA_ACTA.idReg}`)
        .reply(200, { errorCode: '403', errorMessage: 'Forbidden', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_ppre_lineas_actas_partes');
      const result = await handler({ idReg: LINEA_ACTA.idReg });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('forbidden');
    });
  });
});
