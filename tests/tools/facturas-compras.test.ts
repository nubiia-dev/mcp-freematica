import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerFacturasComprasTools } from '../../src/tools/facturas-compras.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_facturas_compras';
const GET_TOOL = 'freematica_get_factura_compra';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerFacturasComprasTools(server, client);
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

describe('registerFacturasComprasTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers both tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
    expect(tools).toHaveProperty(GET_TOOL);
  });

  // --------------------------------------------------------------------------
  // list_facturas_compras — happy path
  // --------------------------------------------------------------------------

  it('list returns items, count, total, page, items_per_page (no filters)', async () => {
    const fake = [
      { FCC_CODEMP: '1', FCC_CODPRO: 'P001', FCC_NUMFRA: '2024001' },
      { FCC_CODEMP: '1', FCC_CODPRO: 'P002', FCC_NUMFRA: '2024002' },
    ];
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 150));

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
      total: 150,
      page: 1,
      items_per_page: 20,
    });
  });

  it('list passes rquery FIQL for empresa and codProveedor filters', async () => {
    const fake = [{ FCC_CODEMP: '1', FCC_CODPRO: 'P001' }];
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras')
      .query({ items: '10', page: '1', rquery: 'FCC_CODEMP==1;FCC_CODPRO==P001' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 10,
      empresa: '1',
      codProveedor: 'P001',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list passes exportado as native query param (not FIQL)', async () => {
    const fake = [{ FCC_CODEMP: '1' }];
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras')
      .query({ items: '20', page: '1', exportado: 'not_exported' })
      .reply(200, listEnv(fake, 5));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      exportado: 'not_exported',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes exportado=all as native query param', async () => {
    const fake = [{ FCC_CODEMP: '1' }];
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras')
      .query({ items: '20', page: '1', exportado: 'all' })
      .reply(200, listEnv(fake, 10));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      exportado: 'all',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes rquery FIQL for fecha desde/hasta filters', async () => {
    const fake = [{ FCC_FCHFAC: '2024-01-15' }];
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras')
      .query(q => {
        const rquery = String(q.rquery ?? '');
        return rquery.includes('FCC_FCHFAC') && String(q.page) === '1';
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      fechaDesde: '2024-01-01',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes FIQL for traspasadoContabilidad=true', async () => {
    const fake = [{ FCC_TRASP_CONTAB: 'true' }];
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras')
      .query(q => {
        const rquery = String(q.rquery ?? '');
        return rquery.includes('FCC_TRASP_CONTAB') && rquery.includes('true');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      traspasadoContabilidad: true,
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes FIQL for delegacion and lineaNegocio filters', async () => {
    const fake = [{ FCC_DELEG: 'MAD', FCC_LIN_NEGOCIO: 'LN01' }];
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras')
      .query(q => {
        const rquery = String(q.rquery ?? '');
        return rquery.includes('FCC_DELEG==MAD') && rquery.includes('FCC_LIN_NEGOCIO==LN01');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      delegacion: 'MAD',
      lineaNegocio: 'LN01',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // list_facturas_compras — error paths
  // --------------------------------------------------------------------------

  it('list returns server_error on 500', async () => {
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras')
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

  it('list returns invalid_token on 401', async () => {
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras')
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

  // --------------------------------------------------------------------------
  // get_factura_compra — happy path
  // --------------------------------------------------------------------------

  it('get returns the factura object for a valid idReg', async () => {
    const fake = { FCC_CODEMP: '1', FCC_NUMFRA: '2024001', FCC_CODPRO: 'P001' };
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras/MV9fMTAwMA%3D%3D')
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

  // --------------------------------------------------------------------------
  // get_factura_compra — error paths
  // --------------------------------------------------------------------------

  it('get returns not_found when id does not exist', async () => {
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('get returns server_error on 500', async () => {
    nock(BASE_URL)
      .get('/pcmp/v2/facturas-compras/BADID')
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
