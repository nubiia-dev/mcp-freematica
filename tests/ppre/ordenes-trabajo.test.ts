import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const ORDEN = {
  AVI_CODEMP: '02',
  AVI_DELEG: '08',
  AVI_COD_CLIENTE: 'CLI001',
  idReg: 'b3JkZW5UcmFiYWpv',
};

const READ_TOOLS = [
  'freematica_list_ppre_ordenes_trabajo',
  'freematica_get_ppre_orden_trabajo',
];

const WRITE_TOOLS = [
  'freematica_create_ppre_orden_trabajo',
  'freematica_update_ppre_orden_trabajo',
];

describe('ppre ordenes-trabajo tools', () => {
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

  describe('freematica_list_ppre_ordenes_trabajo', () => {
    it('lista órdenes de trabajo con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v1/ordenes-trabajo')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([ORDEN], 15));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_ordenes_trabajo');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(15);
      expect(parsed.items[0].AVI_COD_CLIENTE).toBe('CLI001');
      scope.done();
    });

    it('devuelve error() en fallo del API (500)', async () => {
      nock(BASE_URL)
        .get('/ppre/v1/ordenes-trabajo')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Server Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_ordenes_trabajo');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_create_ppre_orden_trabajo', () => {
    it('envía body AVI_* y devuelve el registro creado', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/ppre/v1/ordenes-trabajo', (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, okEnvelope(ORDEN));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_ppre_orden_trabajo');
      const result = await handler({
        AVI_CODEMP: '02',
        AVI_DELEG: '08',
        AVI_COD_CLIENTE: 'CLI001',
        AVI_TEXTO_TRAB_SOLICITADO: 'Revisión anual',
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody['AVI_CODEMP']).toBe('02');
      expect(sentBody['AVI_TEXTO_TRAB_SOLICITADO']).toBe('Revisión anual');
    });
  });

  describe('freematica_update_ppre_orden_trabajo', () => {
    it('hace PUT al idReg con los campos informados', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(`/ppre/v1/ordenes-trabajo/${ORDEN.idReg}`, (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, okEnvelope(ORDEN));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_ppre_orden_trabajo');
      const result = await handler({ idReg: ORDEN.idReg, AVI_TEXTO_TRAB_REALIZADO: 'Trabajo completado' });

      expect(result.isError).toBeUndefined();
      expect(sentBody['AVI_TEXTO_TRAB_REALIZADO']).toBe('Trabajo completado');
    });

    it('NO incluye campos POST-only en el body del PUT', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(`/ppre/v1/ordenes-trabajo/${ORDEN.idReg}`, (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, okEnvelope(ORDEN));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_ppre_orden_trabajo');
      await handler({
        idReg: ORDEN.idReg,
        AVI_TEXTO_TRAB_REALIZADO: 'Completado',
        // camposAdicionales con campos POST-only — deben quedar excluidos
        camposAdicionales: {
          PPC_STATUS_COMENTARIOS: 'no-debe-ir',
          AVI_TIPO_INSTALACION: 'no-debe-ir',
          AVI_TIPO_PROCESO: 'no-debe-ir',
          AVI_MANTENEDOR: 'M001',
        },
      });

      expect(sentBody['PPC_STATUS_COMENTARIOS']).toBeUndefined();
      expect(sentBody['AVI_TIPO_INSTALACION']).toBeUndefined();
      expect(sentBody['AVI_TIPO_PROCESO']).toBeUndefined();
      expect(sentBody['AVI_MANTENEDOR']).toBe('M001');
    });

    it('propaga errores del API como error()', async () => {
      nock(BASE_URL)
        .put(`/ppre/v1/ordenes-trabajo/${ORDEN.idReg}`)
        .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_ppre_orden_trabajo');
      const result = await handler({ idReg: ORDEN.idReg });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });
});
