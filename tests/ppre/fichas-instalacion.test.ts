import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const FICHA = {
  idReg: 'fichaInstalacion01',
  FIC_CODEMP: '02',
  FIC_CODCLI: 'CLI001',
  FIC_DESCRIPCION: 'Ficha ascensor edificio A',
};

const COMPONENTE = {
  idReg: 'comp01',
  COMP_DESCRIPCION: 'Motor tracción',
  COMP_MARCA: 'Schindler',
};

const FICHA_TECNICA_DATA = {
  FT_CODEMP: '02',
  FT_DESCRIPCION: 'Ficha técnica ascensor',
};

const READ_TOOLS = [
  'freematica_list_ppre_fichas_instalacion',
  'freematica_get_ppre_ficha_tecnica',
  'freematica_list_ppre_componentes_ficha_tecnica',
];

const WRITE_TOOLS = [
  'freematica_create_ppre_ficha_instalacion_material',
  'freematica_update_ppre_ficha_instalacion',
];

describe('ppre fichas-instalacion tools', () => {
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

  describe('freematica_list_ppre_fichas_instalacion', () => {
    it('lista fichas de instalación con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/ppre/v1/fichas-instalacion')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([FICHA], 10));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_fichas_instalacion');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(10);
      expect(parsed.items[0].FIC_DESCRIPCION).toBe('Ficha ascensor edificio A');
      scope.done();
    });

    it('lista fichas de instalación con idReg en el path', async () => {
      const scope = nock(BASE_URL)
        .get(`/ppre/v1/fichas-instalacion/${FICHA.idReg}`)
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([FICHA], 1));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_fichas_instalacion');
      const result = await handler({ page: 1, items: 20, idReg: FICHA.idReg });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items[0].idReg).toBe(FICHA.idReg);
      scope.done();
    });

    it('devuelve error() en fallo del API (401)', async () => {
      nock(BASE_URL)
        .get('/ppre/v1/fichas-instalacion')
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_fichas_instalacion');
      const result = await handler({ page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_get_ppre_ficha_tecnica', () => {
    it('obtiene la ficha técnica por idReg', async () => {
      const scope = nock(BASE_URL)
        .get(`/ppre/v1/ficha-tecnica/${FICHA.idReg}`)
        .reply(200, okEnvelope(FICHA_TECNICA_DATA));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_ppre_ficha_tecnica');
      const result = await handler({ id: FICHA.idReg });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.FT_DESCRIPCION).toBe('Ficha técnica ascensor');
      scope.done();
    });

    it('devuelve error() en fallo del API (404)', async () => {
      nock(BASE_URL)
        .get(`/ppre/v1/ficha-tecnica/${FICHA.idReg}`)
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_ppre_ficha_tecnica');
      const result = await handler({ id: FICHA.idReg });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  describe('freematica_list_ppre_componentes_ficha_tecnica', () => {
    it('lista componentes de una ficha técnica', async () => {
      const scope = nock(BASE_URL)
        .get(`/ppre/v1/fichas-tecnicas/${FICHA.idReg}/componentes`)
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([COMPONENTE], 5));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_componentes_ficha_tecnica');
      const result = await handler({ id: FICHA.idReg, page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(5);
      expect(parsed.items[0].COMP_DESCRIPCION).toBe('Motor tracción');
      scope.done();
    });

    it('devuelve error() en fallo del API (500)', async () => {
      nock(BASE_URL)
        .get(`/ppre/v1/fichas-tecnicas/${FICHA.idReg}/componentes`)
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_ppre_componentes_ficha_tecnica');
      const result = await handler({ id: FICHA.idReg, page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_create_ppre_ficha_instalacion_material', () => {
    it('POST a /ppre/v1/fichas-instalacion-material con camposAdicionales', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/ppre/v1/fichas-instalacion-material', (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, okEnvelope({ ...FICHA, MAT_REFERENCIA: 'REF001' }));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_ppre_ficha_instalacion_material');
      const result = await handler({
        camposAdicionales: { MAT_REFERENCIA: 'REF001', MAT_CANTIDAD: 2 },
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody['MAT_REFERENCIA']).toBe('REF001');
      expect(sentBody['MAT_CANTIDAD']).toBe(2);
    });

    it('propaga errores del API como error()', async () => {
      nock(BASE_URL)
        .post('/ppre/v1/fichas-instalacion-material')
        .reply(200, { errorCode: '403', errorMessage: 'Forbidden', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_create_ppre_ficha_instalacion_material');
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('forbidden');
    });
  });

  describe('freematica_update_ppre_ficha_instalacion', () => {
    it('PUT a /ppre/v1/fichas-instalacion/:idReg con camposAdicionales', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .put(`/ppre/v1/fichas-instalacion/${FICHA.idReg}`, (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, okEnvelope(FICHA));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_ppre_ficha_instalacion');
      const result = await handler({
        idReg: FICHA.idReg,
        camposAdicionales: { FIC_DESCRIPCION: 'Ficha actualizada' },
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody['FIC_DESCRIPCION']).toBe('Ficha actualizada');
    });

    it('propaga errores del API como error()', async () => {
      nock(BASE_URL)
        .put(`/ppre/v1/fichas-instalacion/${FICHA.idReg}`)
        .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_ppre_ficha_instalacion');
      const result = await handler({ idReg: FICHA.idReg });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });
});
