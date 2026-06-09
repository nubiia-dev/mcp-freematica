import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerProveedoresTools } from '../../src/tools/proveedores.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_proveedores';
const GET_TOOL = 'freematica_get_proveedor';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerProveedoresTools(server, client);
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

describe('registerProveedoresTools', () => {
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
  // list_proveedores — happy path
  // --------------------------------------------------------------------------

  it('list returns items, count, total, page, items_per_page (no filters)', async () => {
    const fake = [
      { COD_PRO: 'P001', NOMBRE_PRO: 'Proveedor A', NIF: '12345678A' },
      { COD_PRO: 'P002', NOMBRE_PRO: 'Proveedor B', NIF: '87654321B' },
    ];
    nock(BASE_URL)
      .get('/pgrl/v2/proveedores')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 250));

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
      total: 250,
      page: 1,
      items_per_page: 20,
    });
  });

  it('list passes rquery FIQL for codProveedor and nif filters', async () => {
    const fake = [{ COD_PRO: 'P001', NIF: '12345678A' }];
    nock(BASE_URL)
      .get('/pgrl/v2/proveedores')
      .query({ items: '10', page: '1', rquery: 'COD_PRO==P001;NIF==12345678A' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 10,
      codProveedor: 'P001',
      nif: '12345678A',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list passes =lk= FIQL for nombre partial search', async () => {
    const fake = [{ COD_PRO: 'P001', NOMBRE_PRO: 'García S.L.' }];
    nock(BASE_URL)
      .get('/pgrl/v2/proveedores')
      .query(q => {
        const rquery = String(q.rquery ?? '');
        return rquery.includes('NOMBRE_PRO') && rquery.includes('García');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      nombre: 'García',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list passes FECHA_BAJA==null for activo=true (proveedores activos)', async () => {
    const fake = [{ COD_PRO: 'P001', FECHA_BAJA: null }];
    nock(BASE_URL)
      .get('/pgrl/v2/proveedores')
      .query(q => {
        const rquery = String(q.rquery ?? '');
        return rquery.includes('FECHA_BAJA==null');
      })
      .reply(200, listEnv(fake, 10));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      activo: true,
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes FECHA_BAJA!=null for activo=false (proveedores de baja)', async () => {
    const fake = [{ COD_PRO: 'P099', FECHA_BAJA: '2023-01-01' }];
    nock(BASE_URL)
      .get('/pgrl/v2/proveedores')
      .query(q => {
        const rquery = String(q.rquery ?? '');
        return rquery.includes('FECHA_BAJA!=null');
      })
      .reply(200, listEnv(fake, 3));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      activo: false,
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes codPais and codProvincia FIQL filters', async () => {
    const fake = [{ COD_PRO: 'P001', COD_PAIS: 'ES', COD_PROVINCIA: '28' }];
    nock(BASE_URL)
      .get('/pgrl/v2/proveedores')
      .query(q => {
        const rquery = String(q.rquery ?? '');
        return rquery.includes('COD_PAIS==ES') && rquery.includes('COD_PROVINCIA==28');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      codPais: 'ES',
      codProvincia: '28',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes grupoProveedor and tipoIdent FIQL filters', async () => {
    const fake = [{ COD_PRO: 'P001', COD_GRUPO_PRO: 'G01', CMP_TIPO_IDENT: 'NIF' }];
    nock(BASE_URL)
      .get('/pgrl/v2/proveedores')
      .query(q => {
        const rquery = String(q.rquery ?? '');
        return rquery.includes('COD_GRUPO_PRO==G01') && rquery.includes('CMP_TIPO_IDENT==NIF');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      grupoProveedor: 'G01',
      tipoIdent: 'NIF',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // list_proveedores — error paths
  // --------------------------------------------------------------------------

  it('list returns server_error on 500', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/proveedores')
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
      .get('/pgrl/v2/proveedores')
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
  // get_proveedor — happy path
  // --------------------------------------------------------------------------

  it('get returns the proveedor object for a valid idReg', async () => {
    const fake = { COD_PRO: 'P001', NOMBRE_PRO: 'Proveedor A', NIF: '12345678A' };
    nock(BASE_URL)
      .get('/pgrl/v2/proveedores/MV9fUDAwMQ%3D%3D')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'MV9fUDAwMQ==' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  // --------------------------------------------------------------------------
  // get_proveedor — error paths
  // --------------------------------------------------------------------------

  it('get returns not_found when id does not exist', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/proveedores/BAD')
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
      .get('/pgrl/v2/proveedores/BADID')
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
