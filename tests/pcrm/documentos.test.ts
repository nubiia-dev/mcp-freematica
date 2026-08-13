import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { BASE_URL, buildServer, getHandler, registeredTools, listEnvelope, okEnvelope } from './helpers.js';

const DOCUMENTO = {
  IdDocumento: 'doc-001',
  TITULO: 'Contrato de servicio',
  TEXTO: 'Texto del documento',
};

const READ_TOOLS = [
  'freematica_list_pcrm_documentos_usuario_v1',
  'freematica_get_pcrm_documento_usuario_v1',
  'freematica_list_pcrm_documentos_usuario_v2',
  'freematica_get_pcrm_documento_usuario_v2',
];

const WRITE_TOOLS = [
  'freematica_update_pcrm_documento_usuario_v1',
  'freematica_update_pcrm_documento_usuario_v2',
];

describe('pcrm documentos tools', () => {
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

  describe('freematica_list_pcrm_documentos_usuario_v1', () => {
    it('lista documentos de usuario v1 con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v1/usuarios/USR001/documentos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([DOCUMENTO], 3));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_documentos_usuario_v1');
      const result = await handler({ idUsuario: 'USR001', page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(3);
      expect(parsed.items[0].IdDocumento).toBe('doc-001');
      scope.done();
    });

    it('devuelve error() en fallo del API (401)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v1/usuarios/USR001/documentos')
        .query(true)
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_documentos_usuario_v1');
      const result = await handler({ idUsuario: 'USR001', page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  describe('freematica_get_pcrm_documento_usuario_v1', () => {
    it('devuelve el detalle de un documento v1', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v1/usuarios/USR001/documentos/doc-001')
        .reply(200, okEnvelope(DOCUMENTO));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_documento_usuario_v1');
      const result = await handler({ idUsuario: 'USR001', idDocumento: 'doc-001' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.IdDocumento).toBe('doc-001');
      scope.done();
    });

    it('devuelve error() si el documento no existe (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v1/usuarios/USR001/documentos/x')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_documento_usuario_v1');
      const result = await handler({ idUsuario: 'USR001', idDocumento: 'x' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  describe('freematica_list_pcrm_documentos_usuario_v2', () => {
    it('lista documentos de usuario v2 con paginación', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/usuarios/USR001/documentos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnvelope([DOCUMENTO], 3));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_documentos_usuario_v2');
      const result = await handler({ idUsuario: 'USR001', page: 1, items: 20 });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(3);
      scope.done();
    });

    it('devuelve error() en fallo del API (500)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/usuarios/USR001/documentos')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_documentos_usuario_v2');
      const result = await handler({ idUsuario: 'USR001', page: 1, items: 20 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_get_pcrm_documento_usuario_v2', () => {
    it('devuelve el detalle de un documento v2', async () => {
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/usuarios/USR001/documentos/doc-001')
        .reply(200, okEnvelope(DOCUMENTO));

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_documento_usuario_v2');
      const result = await handler({ idUsuario: 'USR001', idDocumento: 'doc-001' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.TITULO).toBe('Contrato de servicio');
      scope.done();
    });

    it('devuelve error() si el documento no existe (404)', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/usuarios/USR001/documentos/x')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_documento_usuario_v2');
      const result = await handler({ idUsuario: 'USR001', idDocumento: 'x' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_list_pcrm_documentos_usuario_v1 — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v1/usuarios/USR001/documentos').query(true).replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_documentos_usuario_v1');
      const result = await handler({ idUsuario: 'USR001', page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pcrm_documento_usuario_v1 — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v1/usuarios/USR001/documentos/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_documento_usuario_v1');
      const result = await handler({ idUsuario: 'USR001', idDocumento: 'net-err' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_list_pcrm_documentos_usuario_v2 — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/usuarios/USR001/documentos').query(true).replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_list_pcrm_documentos_usuario_v2');
      const result = await handler({ idUsuario: 'USR001', page: 1, items: 20 });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_pcrm_documento_usuario_v2 — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).get('/pcrm/v2/usuarios/USR001/documentos/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer();
      const handler = getHandler(server, 'freematica_get_pcrm_documento_usuario_v2');
      const result = await handler({ idUsuario: 'USR001', idDocumento: 'net-err' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_pcrm_documento_usuario_v1', () => {
    it('actualiza un documento v1 y devuelve el registro', async () => {
      const updated = { ...DOCUMENTO, TEXTO: 'Texto actualizado' };
      const scope = nock(BASE_URL)
        .put('/pcrm/v1/usuarios/USR001/documentos/doc-001')
        .reply(200, okEnvelope(updated));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_documento_usuario_v1');
      const result = await handler({
        idUsuario: 'USR001',
        idDocumento: 'doc-001',
        camposNativos: { TEXTO: 'Texto actualizado' },
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.TEXTO).toBe('Texto actualizado');
      scope.done();
    });

    it('devuelve error() si el documento no existe (404)', async () => {
      nock(BASE_URL)
        .put('/pcrm/v1/usuarios/USR001/documentos/x')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_documento_usuario_v1');
      const result = await handler({ idUsuario: 'USR001', idDocumento: 'x' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_pcrm_documento_usuario_v2', () => {
    it('actualiza un documento v2 y devuelve el registro', async () => {
      const updated = { ...DOCUMENTO, TEXTO: 'Texto v2' };
      const scope = nock(BASE_URL)
        .put('/pcrm/v2/usuarios/USR001/documentos/doc-001')
        .reply(200, okEnvelope(updated));

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_documento_usuario_v2');
      const result = await handler({
        idUsuario: 'USR001',
        idDocumento: 'doc-001',
        camposNativos: { TEXTO: 'Texto v2' },
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.TEXTO).toBe('Texto v2');
      scope.done();
    });

    it('devuelve error() en fallo del API (500)', async () => {
      nock(BASE_URL)
        .put('/pcrm/v2/usuarios/USR001/documentos/doc-001')
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_documento_usuario_v2');
      const result = await handler({ idUsuario: 'USR001', idDocumento: 'doc-001' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });

    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).put('/pcrm/v2/usuarios/USR001/documentos/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_documento_usuario_v2');
      const result = await handler({ idUsuario: 'USR001', idDocumento: 'net-err' });

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_pcrm_documento_usuario_v1 — error genérico (no FreematicaError)', () => {
    it('devuelve error() ante un error de red (no FreematicaError)', async () => {
      nock(BASE_URL).put('/pcrm/v1/usuarios/USR001/documentos/net-err').replyWithError('ECONNRESET');

      const { server } = buildServer({ enableWrites: true });
      const handler = getHandler(server, 'freematica_update_pcrm_documento_usuario_v1');
      const result = await handler({ idUsuario: 'USR001', idDocumento: 'net-err' });

      expect(result.isError).toBe(true);
    });
  });
});
