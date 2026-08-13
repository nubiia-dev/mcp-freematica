import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope } from './helpers.js';

const PARTE = {
  PPC_CODEMP: '02',
  PPC_DELEG: '08',
  idReg: 'cGFydGVNYW50',
};

const ALL_TOOLS = [
  'freematica_list_ppre_partes',
  'freematica_get_ppre_parte',
  'freematica_get_ppre_parte_componentes_ficha_tecnica',
  'freematica_list_ppre_parte_ultimas_intervenciones',
  'freematica_list_ppre_partes_orden_trabajo',
  'freematica_list_ppre_partes_fin_mantenedor',
];

describe('ppre partes tools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('registro (solo lectura, siempre)', () => {
    it('registra todas las tools de partes siempre', () => {
      const { server } = buildServer();
      const tools = registeredTools(server);
      for (const name of ALL_TOOLS) {
        expect(tools).toHaveProperty(name);
      }
    });

    it('también registra con enableWrites=true', () => {
      const { server } = buildServer({ enableWrites: true });
      const tools = registeredTools(server);
      for (const name of ALL_TOOLS) {
        expect(tools).toHaveProperty(name);
      }
    });
  });

  describe('freematica_list_ppre_partes', () => {
    it('lista partes con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v1/partes')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([PARTE], 7));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_partes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(7);
      expect(parsed.items[0].PPC_CODEMP).toBe('02');
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/ppre/v1/partes')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_partes');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_list_ppre_partes_orden_trabajo', () => {
    it('lista partes de orden de trabajo', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v2/partes/partes-orden-trabajo')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([PARTE], 3));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_partes_orden_trabajo');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(3);
      scope.done();
    });
  });

  describe('freematica_get_ppre_parte', () => {
    it('obtiene el detalle de un parte por idReg', async () => {
      const scope = nock(BASE_URL)
        .get(`/ppre/v1/partes/${PARTE.idReg}`)
        .reply(200, listEnvelope([PARTE], 1));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_ppre_parte');
      const result = await handler({ id: PARTE.idReg });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.PPC_CODEMP).toBe('02');
      scope.done();
    });

    it('devuelve error() cuando el API responde con error', async () => {
      nock(BASE_URL)
        .get(`/ppre/v1/partes/${PARTE.idReg}`)
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_ppre_parte');
      const result = await handler({ id: PARTE.idReg });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  describe('freematica_get_ppre_parte_componentes_ficha_tecnica', () => {
    it('obtiene los componentes de ficha técnica de un parte', async () => {
      const componentes = [{ COMP_DESCRIPCION: 'Sensor puerta', idReg: 'comp01' }];
      const scope = nock(BASE_URL)
        .get(`/ppre/v1/partes/${PARTE.idReg}/componentes-ficha-tecnica`)
        .reply(200, { errorCode: '200', errorMessage: '', data: componentes });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_ppre_parte_componentes_ficha_tecnica');
      const result = await handler({ id: PARTE.idReg });

      expect(result.isError).toBeUndefined();
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get(`/ppre/v1/partes/${PARTE.idReg}/componentes-ficha-tecnica`)
        .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_ppre_parte_componentes_ficha_tecnica');
      const result = await handler({ id: PARTE.idReg });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_list_ppre_parte_ultimas_intervenciones', () => {
    it('lista las últimas intervenciones de un parte', async () => {
      const intervencion = { INT_FECHA: '2026-07-01', INT_DESCRIPCION: 'Revisión semestral', idReg: 'int01' };
      const scope = nock(BASE_URL)
        .get(`/ppre/v1/partes/${PARTE.idReg}/ultimas-intervenciones`)
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([intervencion], 2));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_parte_ultimas_intervenciones');
      const result = await handler({ id: PARTE.idReg, page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(2);
      expect(parsed.items[0].INT_DESCRIPCION).toBe('Revisión semestral');
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get(`/ppre/v1/partes/${PARTE.idReg}/ultimas-intervenciones`)
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_parte_ultimas_intervenciones');
      const result = await handler({ id: PARTE.idReg, page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_list_ppre_partes_fin_mantenedor', () => {
    it('lista partes fin de mantenedor con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v2/partes/partes-fin-mantenedor')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([PARTE], 5));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_partes_fin_mantenedor');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(5);
      scope.done();
    });

    it('devuelve error() en fallo del API', async () => {
      nock(BASE_URL)
        .get('/ppre/v2/partes/partes-fin-mantenedor')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_partes_fin_mantenedor');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });
});
