import { describe, it, expect, afterEach } from 'vitest';
import { z } from 'zod';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerFacturasElectronicasTools } from '../../src/tools/facturas-electronicas.js';
import {
  ListFacturasElectronicasFiltersSchema,
  ListFacturasDocumentosFiltersSchema,
} from '../../src/schemas/facturas-electronicas.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_facturas_electronicas';
const GET_TOOL = 'freematica_get_factura_electronica';
const DOCUMENTO_TOOL = 'freematica_get_factura_documento';
const LOG_TOOL = 'freematica_get_factura_log';
const EDICOM_INFO_TOOL = 'freematica_get_edicom_info';
const LIST_DOCUMENTOS_TOOL = 'freematica_list_facturas_documentos';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerFacturasElectronicasTools(server, client);
  return server;
}

function getHandler(server: McpServer, name: string) {
  const tools = (server as unknown as { _registeredTools: Record<string, ToolEntry> })._registeredTools;
  const t = tools[name];
  if (!t) throw new Error(`Tool not registered: ${name}`);
  const fn = t.handler ?? t.callback;
  if (!fn) throw new Error(`No handler for: ${name}`);
  return fn;
}

function listEnv<T>(items: T[], total: number) {
  return {
    errorCode: '200',
    errorMessage: '',
    data: { total: String(total), items, rowHeight: -1 },
  };
}

function detailEnv<T>(item: T) {
  return { errorCode: '200', errorMessage: '', data: item };
}

// Helper to create a large string for size guardrail tests
function makeLargeBase64(mb: number): string {
  // Each char is ~1 byte, so mb * 1024 * 1024 chars ≈ mb MB
  return 'A'.repeat(mb * 1024 * 1024);
}

describe('registerFacturasElectronicasTools', () => {
  afterEach(() => {
    nock.cleanAll();
    delete process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'];
  });

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  it('registers all 6 tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
    expect(tools).toHaveProperty(GET_TOOL);
    expect(tools).toHaveProperty(DOCUMENTO_TOOL);
    expect(tools).toHaveProperty(LOG_TOOL);
    expect(tools).toHaveProperty(EDICOM_INFO_TOOL);
    expect(tools).toHaveProperty(LIST_DOCUMENTOS_TOOL);
  });

  // =========================================================================
  // list_facturas_electronicas
  // =========================================================================

  describe('freematica_list_facturas_electronicas', () => {
    it('returns items, count, total, page, items_per_page (no filters)', async () => {
      const fake = [
        { FACED_CODEMP: '1', FACED_SERIEFRA: 'A', FACED_NUMFRA: 1001, FACED_ESTADO: 'ENVIADA' },
        { FACED_CODEMP: '1', FACED_SERIEFRA: 'A', FACED_NUMFRA: 1002, FACED_ESTADO: 'ACEPTADA' },
      ];
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 50));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({
        items: fake,
        count: 2,
        total: 50,
        page: 1,
        items_per_page: 20,
      });
    });

    it('sends empresa as native query param', async () => {
      const fake = [{ FACED_CODEMP: '1' }];
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1', empresa: '1' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, empresa: '1' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('sends codCliente as "cliente" query param (not "codCliente")', async () => {
      const fake = [{ COD_CLI: 'CLI001' }];
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1', cliente: 'CLI001' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, codCliente: 'CLI001' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('sends fechaDesde as "fechaIni" and fechaHasta as "fechaFin" query params', async () => {
      const fake = [{ FACED_FCHFAC: '2024-01-15' }];
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1', fechaIni: '2024-01-01', fechaFin: '2024-01-31' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({
        page: 1,
        items: 20,
        fechaDesde: '2024-01-01',
        fechaHasta: '2024-01-31',
      })) as { content: { type: string; text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('sends estado as native query param', async () => {
      const fake = [{ FACED_ESTADO: 'ACEPTADA' }];
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1', estado: 'ACEPTADA' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({
        page: 1,
        items: 20,
        estado: 'ACEPTADA',
      })) as { content: { type: string; text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('sends leido=true as native query param', async () => {
      const fake = [{ FACED_LEIDO: 'S' }];
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1', leido: 'true' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({
        page: 1,
        items: 20,
        leido: true,
      })) as { content: { type: string; text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('sends leido=false as native query param', async () => {
      const fake = [{ FACED_LEIDO: 'N' }];
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1', leido: 'false' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({
        page: 1,
        items: 20,
        leido: false,
      })) as { content: { type: string; text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('sends order as native query param', async () => {
      const fake = [{ FACED_FCHFAC: '2024-01-15' }];
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1', order: 'FACED_FCHFAC desc' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({
        page: 1,
        items: 20,
        order: 'FACED_FCHFAC desc',
      })) as { content: { type: string; text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500 envelope', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });

    it('returns invalid_token on 401 envelope', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('invalid_token');
    });

    it('returns not_found on 404 envelope', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });
  });

  // =========================================================================
  // get_factura_electronica
  // =========================================================================

  describe('freematica_get_factura_electronica', () => {
    it('returns the factura object for a valid idReg', async () => {
      const fake = {
        FACED_CODEMP: '1',
        FACED_SERIEFRA: 'A',
        FACED_NUMFRA: 1001,
        FACED_ESTADO: 'ACEPTADA',
        COD_CLI: 'CLI001',
        NOMBRE_CLI: 'Test Cliente',
      };
      nock(BASE_URL)
        .get('/pven/v1/facturas/MV9fMTAwMA%3D%3D')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, GET_TOOL);
      const result = (await handler({ id: 'MV9fMTAwMA==' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns not_found when id does not exist', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, GET_TOOL);
      const result = (await handler({ id: 'BADID' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns server_error on 500 envelope', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas/BADID')
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const server = buildServer();
      const handler = getHandler(server, GET_TOOL);
      const result = (await handler({ id: 'BADID' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // =========================================================================
  // get_factura_documento
  // =========================================================================

  describe('freematica_get_factura_documento', () => {
    it('returns documento object (small payload, no truncation)', async () => {
      const fakeDocumento = {
        FACED_CODEMP: '1',
        FACED_SERIEFRA: 'A',
        FACED_NUMFRA: 1001,
        FACED_DOCUMENTO_PDF: 'dGVzdA==',
        FACED_DOCUMENTO_XML: 'PHhtbD48L3htbD4=',
        FACED_LEIDO: 'S',
      };
      nock(BASE_URL)
        .get('/pven/v1/facturas/FAKEID/documento')
        .reply(200, detailEnv(fakeDocumento));

      const server = buildServer();
      const handler = getHandler(server, DOCUMENTO_TOOL);
      const result = (await handler({ id: 'FAKEID' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      // Should include the document fields and truncated=false
      expect(parsed.truncated).toBe(false);
      expect(parsed.FACED_DOCUMENTO_PDF).toBe('dGVzdA==');
    });

    it('sends documentType as query param', async () => {
      const fakeDocumento = { FACED_CODEMP: '1', FACED_DOCUMENTO_PDF: 'dGVzdA==' };
      nock(BASE_URL)
        .get('/pven/v1/facturas/FAKEID/documento')
        .query({ documentType: 'PDF' })
        .reply(200, detailEnv(fakeDocumento));

      const server = buildServer();
      const handler = getHandler(server, DOCUMENTO_TOOL);
      const result = (await handler({ id: 'FAKEID', documentType: 'PDF' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('sends actualizaLeido as "actualiza-leido" query param', async () => {
      const fakeDocumento = { FACED_CODEMP: '1', FACED_LEIDO: 'S' };
      nock(BASE_URL)
        .get('/pven/v1/facturas/FAKEID/documento')
        .query({ 'actualiza-leido': 'true' })
        .reply(200, detailEnv(fakeDocumento));

      const server = buildServer();
      const handler = getHandler(server, DOCUMENTO_TOOL);
      const result = (await handler({ id: 'FAKEID', actualizaLeido: true })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('applies size guardrail when document exceeds FREEMATICA_MAX_RESPONSE_SIZE_MB', async () => {
      // Set limit to 1 MB
      process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'] = '1';

      // Create a response with a large document (>1 MB)
      const fakeDocumento = {
        FACED_CODEMP: '1',
        FACED_DOCUMENTO_PDF: makeLargeBase64(2), // 2 MB string
      };
      nock(BASE_URL)
        .get('/pven/v1/facturas/BIGID/documento')
        .reply(200, detailEnv(fakeDocumento));

      const server = buildServer();
      const handler = getHandler(server, DOCUMENTO_TOOL);
      const result = (await handler({ id: 'BIGID' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.truncated).toBe(true);
      expect(typeof parsed.warning).toBe('string');
      expect(parsed.warning).toContain('límite de 1 MB');
      expect(typeof parsed.sizeBytes).toBe('number');
      expect(parsed.sizeBytes).toBeGreaterThan(1024 * 1024);
      // Should NOT include document content
      expect(parsed.FACED_DOCUMENTO_PDF).toBeUndefined();
    });

    it('does NOT truncate when document is exactly below the limit', async () => {
      process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'] = '10';

      const fakeDocumento = {
        FACED_CODEMP: '1',
        FACED_DOCUMENTO_PDF: 'small',
      };
      nock(BASE_URL)
        .get('/pven/v1/facturas/SMALLID/documento')
        .reply(200, detailEnv(fakeDocumento));

      const server = buildServer();
      const handler = getHandler(server, DOCUMENTO_TOOL);
      const result = (await handler({ id: 'SMALLID' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.truncated).toBe(false);
      expect(parsed.FACED_DOCUMENTO_PDF).toBe('small');
    });

    it('returns not_found on 404 envelope', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas/BADID/documento')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, DOCUMENTO_TOOL);
      const result = (await handler({ id: 'BADID' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns server_error on 500 envelope', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas/BADID/documento')
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const server = buildServer();
      const handler = getHandler(server, DOCUMENTO_TOOL);
      const result = (await handler({ id: 'BADID' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // =========================================================================
  // get_factura_log
  // =========================================================================

  describe('freematica_get_factura_log', () => {
    it('returns log items for a valid idReg', async () => {
      const fakeLog = [
        {
          FVCTRLE_CODEMP: '1',
          FVCTRLE_FCHFRA: '2024-01-15',
          FVCTRLE_SERIEFRA: 'A',
          FVCTRLE_NUMFRA: 1001,
          FVCTRLE_FCH_MOV: '2024-01-16T10:00:00',
          FVCTRLE_CODCLI: 'CLI001',
        },
      ];
      nock(BASE_URL)
        .get('/pven/v1/facturas/LOGID/log')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fakeLog, 1));

      const server = buildServer();
      const handler = getHandler(server, LOG_TOOL);
      const result = (await handler({ id: 'LOGID', page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fakeLog);
      expect(parsed.total).toBe(1);
      expect(parsed.count).toBe(1);
    });

    it('returns not_found on 404', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas/BADID/log')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, LOG_TOOL);
      const result = (await handler({ id: 'BADID', page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas/BADID/log')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const server = buildServer();
      const handler = getHandler(server, LOG_TOOL);
      const result = (await handler({ id: 'BADID', page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // =========================================================================
  // get_edicom_info
  // =========================================================================

  describe('freematica_get_edicom_info', () => {
    it('returns edicom info list', async () => {
      const fakeEdicom = [
        {
          EDICOM_COMPANY_ID: 'COMP001',
          EDICOM_APPLICATION: 'APP001',
          EDICOM_CLIENT_ID: 'CLIE001',
          EDICOM_DOMAIN: 'test.edicom.es',
          EDICOM_SERVER_URL: 'https://edicom.example.com',
          EDICOM_RAZON_SOCIAL: 'Serlimar S.L.',
        },
      ];
      nock(BASE_URL)
        .get('/pven/v1/facturas/edicominfo')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fakeEdicom, 1));

      const server = buildServer();
      const handler = getHandler(server, EDICOM_INFO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fakeEdicom);
      expect(parsed.total).toBe(1);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas/edicominfo')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const server = buildServer();
      const handler = getHandler(server, EDICOM_INFO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });

    it('returns invalid_token on 401', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas/edicominfo')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const server = buildServer();
      const handler = getHandler(server, EDICOM_INFO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('invalid_token');
    });
  });

  // =========================================================================
  // list_facturas_documentos
  // =========================================================================

  describe('freematica_list_facturas_documentos', () => {
    it('returns list of documents (no filters)', async () => {
      const fakeDocumentos = [
        {
          empresa: '1',
          fecha: '2024-01-15',
          serie: 'A',
          numFra: '1001',
          documentoPdf: 'dGVzdA==',
          documentoXml: 'PHhtbD48L3htbD4=',
        },
      ];
      nock(BASE_URL)
        .get('/pven/v1/facturas/download')
        .reply(200, listEnv(fakeDocumentos, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_DOCUMENTOS_TOOL);
      const result = (await handler({})) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fakeDocumentos);
    });

    it('sends documents filter as query param', async () => {
      const fakeDocumentos = [{ empresa: '1', numFra: '1001', documentoPdf: 'abc' }];
      nock(BASE_URL)
        .get('/pven/v1/facturas/download')
        .query({ documents: 'ID001,ID002' })
        .reply(200, listEnv(fakeDocumentos, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_DOCUMENTOS_TOOL);
      const result = (await handler({ documents: 'ID001,ID002' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('sends documentType filter as query param', async () => {
      const fakeDocumentos = [{ empresa: '1', numFra: '1001', documentoPdf: 'abc' }];
      nock(BASE_URL)
        .get('/pven/v1/facturas/download')
        .query({ documentType: 'PDF' })
        .reply(200, listEnv(fakeDocumentos, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_DOCUMENTOS_TOOL);
      const result = (await handler({ documentType: 'PDF' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('applies size guardrail when bulk download exceeds FREEMATICA_MAX_RESPONSE_SIZE_MB', async () => {
      // Set limit to 1 MB
      process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'] = '1';

      // Create many large documents (total > 1 MB)
      const fakeDocumentos = Array.from({ length: 10 }, (_, i) => ({
        empresa: '1',
        numFra: String(1000 + i),
        documentoPdf: makeLargeBase64(1), // 1 MB each = 10 MB total
      }));
      nock(BASE_URL)
        .get('/pven/v1/facturas/download')
        .reply(200, listEnv(fakeDocumentos, 10));

      const server = buildServer();
      const handler = getHandler(server, LIST_DOCUMENTOS_TOOL);
      const result = (await handler({})) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.truncated).toBe(true);
      expect(typeof parsed.warning).toBe('string');
      expect(parsed.warning).toContain('límite de 1 MB');
      // Returned fewer items than total
      expect(parsed.count).toBeLessThan(10);
    });

    it('does NOT truncate when response is within limit', async () => {
      process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'] = '10';

      const fakeDocumentos = [
        { empresa: '1', numFra: '1001', documentoPdf: 'small' },
        { empresa: '1', numFra: '1002', documentoPdf: 'small' },
      ];
      nock(BASE_URL)
        .get('/pven/v1/facturas/download')
        .reply(200, listEnv(fakeDocumentos, 2));

      const server = buildServer();
      const handler = getHandler(server, LIST_DOCUMENTOS_TOOL);
      const result = (await handler({})) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.truncated).toBeUndefined();
      expect(parsed.items).toHaveLength(2);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas/download')
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_DOCUMENTOS_TOOL);
      const result = (await handler({})) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });

    it('returns not_found on 404', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas/download')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_DOCUMENTOS_TOOL);
      const result = (await handler({})) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });
  });

  // =========================================================================
  // Zod schema validation (via direct schema parsing, not through handler)
  // The MCP SDK validates schemas before calling the handler. We test the
  // schema directly to verify correct Zod constraints are declared.
  // =========================================================================

  describe('Zod schema constraints', () => {
    it('ListFacturasElectronicasFiltersSchema: rejects invalid fechaDesde format', () => {
      const schema = z.object(ListFacturasElectronicasFiltersSchema);
      expect(() => schema.parse({ fechaDesde: 'not-a-date' })).toThrow();
    });

    it('ListFacturasElectronicasFiltersSchema: rejects invalid fechaHasta format (no dashes)', () => {
      const schema = z.object(ListFacturasElectronicasFiltersSchema);
      expect(() => schema.parse({ fechaHasta: '20240101' })).toThrow();
    });

    it('ListFacturasElectronicasFiltersSchema: rejects empty empresa string (min 1)', () => {
      const schema = z.object(ListFacturasElectronicasFiltersSchema);
      expect(() => schema.parse({ empresa: '' })).toThrow();
    });

    it('ListFacturasElectronicasFiltersSchema: accepts valid YYYY-MM-DD date', () => {
      const schema = z.object(ListFacturasElectronicasFiltersSchema);
      expect(() => schema.parse({ fechaDesde: '2024-01-01' })).not.toThrow();
    });

    it('ListFacturasDocumentosFiltersSchema: rejects invalid documentType value', () => {
      const schema = z.object(ListFacturasDocumentosFiltersSchema);
      expect(() => schema.parse({ documentType: 'INVALID' })).toThrow();
    });

    it('ListFacturasDocumentosFiltersSchema: accepts valid documentType values', () => {
      const schema = z.object(ListFacturasDocumentosFiltersSchema);
      expect(() => schema.parse({ documentType: 'PDF' })).not.toThrow();
      expect(() => schema.parse({ documentType: 'XML' })).not.toThrow();
      expect(() => schema.parse({ documentType: 'ERROR' })).not.toThrow();
    });
  });

  // =========================================================================
  // Non-FreematicaError handling
  // =========================================================================

  describe('Non-FreematicaError handling', () => {
    it('list_facturas_electronicas: handles unexpected network error gracefully', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas')
        .query({ items: '20', page: '1' })
        .replyWithError('ECONNREFUSED');

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });
});
