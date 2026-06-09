import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerCarteraTools } from '../../src/tools/cartera.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_cartera_clientes';
const GET_TOOL = 'freematica_get_cartera_cliente';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerCarteraTools(server, client);
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

describe('registerCarteraTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  it('registers both tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
    expect(tools).toHaveProperty(GET_TOOL);
  });

  // ---------------------------------------------------------------------------
  // freematica_list_cartera_clientes — happy path
  // ---------------------------------------------------------------------------

  it('list_cartera_clientes returns items, count, total, page, items_per_page', async () => {
    const fake = [
      { CARCL_CODAUX: '0001000', CARCL_IMPPEN: 1200.5 },
      { CARCL_CODAUX: '0002000', CARCL_IMPPEN: 350.0 },
    ];
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes')
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

  it('list_cartera_clientes applies empresa and codCliente FIQL filters', async () => {
    const fake = [{ CARCL_CODAUX: '0001000', CARCL_EMP: '1' }];
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes')
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return (
          typeof rq === 'string' &&
          rq.includes('CARCL_EMP==1') &&
          rq.includes('CARCL_CODAUX==0001000')
        );
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      empresa: '1',
      codCliente: '0001000',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_cartera_clientes applies estado=pendiente FIQL filter (CARCL_SITCAR==1)', async () => {
    const fake = [{ CARCL_CODAUX: '0001000', CARCL_SITCAR: 1 }];
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes')
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return typeof rq === 'string' && rq.includes('CARCL_SITCAR==1');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      estado: 'pendiente',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_cartera_clientes applies estado=cancelado FIQL filter (CARCL_SITCAR==2)', async () => {
    const fake = [{ CARCL_CODAUX: '0003000', CARCL_SITCAR: 2 }];
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes')
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return typeof rq === 'string' && rq.includes('CARCL_SITCAR==2');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      estado: 'cancelado',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_cartera_clientes applies soloImpagados=true FIQL filter', async () => {
    const fake = [{ CARCL_CODAUX: '0001000', CARCL_FECIMPAG: '2026-01-15' }];
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes')
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return typeof rq === 'string' && rq.includes('CARCL_FECIMPAG!=null');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      soloImpagados: true,
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_cartera_clientes does NOT emit CARCL_FECIMPAG when soloImpagados=false', async () => {
    const fake = [{ CARCL_CODAUX: '0001000' }];
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes')
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        // rquery may be absent or present, but must NOT contain CARCL_FECIMPAG
        return rq === undefined || !rq.includes('CARCL_FECIMPAG');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      soloImpagados: false,
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_cartera_clientes applies date range filters for CARCL_FECDOC', async () => {
    const fake = [{ CARCL_CODAUX: '0001000', CARCL_FECDOC: '2026-03-15' }];
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes')
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return (
          typeof rq === 'string' &&
          rq.includes('CARCL_FECDOC=ge=2026-01-01') &&
          rq.includes('CARCL_FECDOC=le=2026-06-30')
        );
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      fechaDocDesde: '2026-01-01',
      fechaDocHasta: '2026-06-30',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_cartera_clientes applies vencimiento date range filters', async () => {
    const fake = [{ CARCL_CODAUX: '0001000', CARCL_FECVCTO: '2026-07-01' }];
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes')
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return (
          typeof rq === 'string' &&
          rq.includes('CARCL_FECVCTO=ge=2026-06-01') &&
          rq.includes('CARCL_FECVCTO=le=2026-12-31')
        );
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      fechaVencimientoDesde: '2026-06-01',
      fechaVencimientoHasta: '2026-12-31',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  // ---------------------------------------------------------------------------
  // freematica_list_cartera_clientes — error cases
  // ---------------------------------------------------------------------------

  it('list_cartera_clientes returns error on 404', async () => {
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes')
      .query(true)
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

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

  it('list_cartera_clientes returns error on 500', async () => {
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes')
      .query(true)
      .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

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

  // ---------------------------------------------------------------------------
  // freematica_get_cartera_cliente — happy path
  // ---------------------------------------------------------------------------

  it('get_cartera_cliente returns the document for a valid idReg', async () => {
    const fake = { CARCL_CODAUX: '0001000', CARCL_IMPPEN: 1200.5, CARCL_FECVCTO: '2026-07-01' };
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes/MV9fMTAwMA%3D%3D')
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

  // ---------------------------------------------------------------------------
  // freematica_get_cartera_cliente — error cases
  // ---------------------------------------------------------------------------

  it('get_cartera_cliente returns error not_found when id does not exist', async () => {
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes/BADID')
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

  it('get_cartera_cliente returns error server_error on 500', async () => {
    nock(BASE_URL)
      .get('/pcar/v1/cartera-clientes/SOMEID')
      .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'SOMEID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });
});
