import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerArticulosTools } from '../../src/tools/articulos.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_articulos';
const GET_TOOL = 'freematica_get_articulo';
const PRECIO_TOOL = 'freematica_get_precio_articulo';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerArticulosTools(server, client);
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

describe('registerArticulosTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers the three articulos tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
    expect(tools).toHaveProperty(GET_TOOL);
    expect(tools).toHaveProperty(PRECIO_TOOL);
  });

  // -------------------------------------------------------------------------
  // freematica_list_articulos
  // -------------------------------------------------------------------------

  describe('freematica_list_articulos', () => {
    it('returns paginated results with no filters', async () => {
      const fake = [{ COD_ARTICULO: ' QQ10615', DESC_ART: 'LIMPIADOR DE ACERO SUMA INOX 0,75L' }];
      nock(BASE_URL)
        .get('/part/v1/articulos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 6304));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(6304);
      expect(parsed.page).toBe(1);
    });

    it('sends familia and subfamilia as quoted FIQL rquery', async () => {
      const fake = [{ COD_ARTICULO: 'A1', COD_FAMILIA: '04', COD_SUBFAM: '02' }];
      nock(BASE_URL)
        .get('/part/v1/articulos')
        .query({ items: '20', page: '1', rquery: "COD_FAMILIA=='04';COD_SUBFAM=='02'" })
        .reply(200, listEnv(fake, 657));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, familia: '04', subfamilia: '02' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('preserves leading spaces in codArticulo (exact match)', async () => {
      const fake = [{ COD_ARTICULO: ' QQ10615' }];
      nock(BASE_URL)
        .get('/part/v1/articulos')
        .query({ items: '20', page: '1', rquery: "COD_ARTICULO==' QQ10615'" })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, codArticulo: ' QQ10615' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('sends proveedor, linea and descripcion filters', async () => {
      const fake = [{ COD_ARTICULO: '01077810', DESC_ART: 'RUEDA BOQUILLA ASPIRADOR' }];
      nock(BASE_URL)
        .get('/part/v1/articulos')
        .query({
          items: '20',
          page: '1',
          rquery: "COD_PROVEEDOR=='1401';COD_LIN_ART=='03';DESC_ART=='RUEDA BOQUILLA ASPIRADOR'",
        })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({
        page: 1,
        items: 20,
        codProveedor: '1401',
        linea: '03',
        descripcion: 'RUEDA BOQUILLA ASPIRADOR',
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('translates activo=true to MOTIVO_BAJA==vacío', async () => {
      const fake = [{ COD_ARTICULO: 'A1', MOTIVO_BAJA: '' }];
      nock(BASE_URL)
        .get('/part/v1/articulos')
        .query({ items: '20', page: '1', rquery: "MOTIVO_BAJA==''" })
        .reply(200, listEnv(fake, 6122));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, activo: true })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('translates activo=false to MOTIVO_BAJA!=vacío', async () => {
      const fake = [{ COD_ARTICULO: ' QQ10615', MOTIVO_BAJA: '52' }];
      nock(BASE_URL)
        .get('/part/v1/articulos')
        .query({ items: '20', page: '1', rquery: "MOTIVO_BAJA!=''" })
        .reply(200, listEnv(fake, 146));

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20, activo: false })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/part/v1/articulos')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Boom', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_get_articulo
  // -------------------------------------------------------------------------

  describe('freematica_get_articulo', () => {
    it('unwraps the single-item list envelope returned by the API', async () => {
      // GET /part/v1/articulos/{idreg} devuelve un envelope de LISTA con un
      // único item (verificado contra el API real), no un objeto detalle.
      const fake = { COD_ARTICULO: ' QQ10615', DESC_ART: 'LIMPIADOR DE ACERO SUMA INOX 0,75L' };
      nock(BASE_URL)
        .get('/part/v1/articulos/MV9fIFFRMTA2MTU%3D')
        .reply(200, listEnv([fake], 1));

      const server = buildServer();
      const handler = getHandler(server, GET_TOOL);
      const result = (await handler({ id: 'MV9fIFFRMTA2MTU=' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns error not_found when idReg does not exist', async () => {
      nock(BASE_URL)
        .get('/part/v1/articulos/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, GET_TOOL);
      const result = (await handler({ id: 'BADID' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_get_precio_articulo
  // -------------------------------------------------------------------------

  describe('freematica_get_precio_articulo', () => {
    it('returns the price object for a valid idReg', async () => {
      const fake = { PRECIO_VENTA: 12.5, DESCUENTO: 0, FACTURABLE: '1' };
      nock(BASE_URL)
        .get('/pgrl/v1/precio-articulo/MV9fIFFRMTA2MTU%3D')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, PRECIO_TOOL);
      const result = (await handler({ id: 'MV9fIFFRMTA2MTU=' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pgrl/v1/precio-articulo/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const server = buildServer();
      const handler = getHandler(server, PRECIO_TOOL);
      const result = (await handler({ id: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });
});
