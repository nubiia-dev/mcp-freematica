import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPgrlInstaladoresTools } from '../../src/tools/pgrl-instaladores.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer(enableWrites = false) {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerPgrlInstaladoresTools(server, client, { enableWrites });
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

function getTools(server: McpServer) {
  return (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
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

describe('registerPgrlInstaladoresTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers read tools', () => {
    const server = buildServer(false);
    const tools = getTools(server);
    expect(tools).toHaveProperty('freematica_list_instaladores');
    expect(tools).toHaveProperty('freematica_get_instalador');
    expect(tools).toHaveProperty('freematica_get_instalador_stocks');
    expect(tools).toHaveProperty('freematica_list_instalador_propuestas_compras');
    expect(tools).toHaveProperty('freematica_get_parte_instalacion');
  });

  it('does NOT register write tools when enableWrites is false', () => {
    const server = buildServer(false);
    const tools = getTools(server);
    expect(tools).not.toHaveProperty('freematica_create_instalador_propuesta_compra');
  });

  it('registers write tools when enableWrites is true', () => {
    const server = buildServer(true);
    const tools = getTools(server);
    expect(tools).toHaveProperty('freematica_create_instalador_propuesta_compra');
  });

  it('list_instaladores returns items, count, total', async () => {
    const fake = [
      { COD_INST: 'I001', NOMBRE: 'Instalador A' },
      { COD_INST: 'I002', NOMBRE: 'Instalador B' },
    ];
    nock(BASE_URL)
      .get('/pgrl/v1/instaladores')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 50));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_instaladores');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
    expect(parsed.total).toBe(50);
    expect(parsed.count).toBe(2);
  });

  it('get_instalador returns the instalador object', async () => {
    const fake = { COD_INST: 'I001', NOMBRE: 'Instalador A' };
    nock(BASE_URL)
      .get('/pgrl/v1/instaladores/INSTID')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_instalador');
    const result = (await handler({ idReg: 'INSTID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('get_instalador_stocks returns stocks object (not a list)', async () => {
    const fake = { stocks: [{ COD_ART: 'A001', CANTIDAD: 5 }] };
    nock(BASE_URL)
      .get('/pgrl/v1/instaladores/INSTID/stocks')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_instalador_stocks');
    const result = (await handler({ idReg: 'INSTID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    // Should be the object directly, not a list wrapper
    expect(parsed).toEqual(fake);
    expect(parsed).not.toHaveProperty('items');
  });

  it('list_instalador_propuestas_compras returns items list', async () => {
    const fake = [{ COD_PROP: 'P001', ESTADO: 'pending' }];
    nock(BASE_URL)
      .get('/pgrl/v1/instaladores/INSTID/propuestas-compras')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_instalador_propuestas_compras');
    const result = (await handler({ idInstalador: 'INSTID', page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('create_instalador_propuesta_compra posts fields and returns created object', async () => {
    const fields = { COD_PROP: 'P001', CANTIDAD: 10 };
    nock(BASE_URL)
      .post('/pgrl/v1/instaladores/INSTID/propuestas-compras', fields)
      .reply(200, detailEnv(fields));

    const server = buildServer(true);
    const handler = getHandler(server, 'freematica_create_instalador_propuesta_compra');
    const result = (await handler({ idInstalador: 'INSTID', fields })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fields);
  });

  it('get_parte_instalacion returns the parte object', async () => {
    const fake = { ID_PARTE: 'P001', ESTADO: 'completado' };
    nock(BASE_URL)
      .get('/pgrl/v1/partes-instalacion/PARTEID')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_parte_instalacion');
    const result = (await handler({ idReg: 'PARTEID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('get_parte_instalacion returns error not_found', async () => {
    nock(BASE_URL)
      .get('/pgrl/v1/partes-instalacion/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_parte_instalacion');
    const result = (await handler({ idReg: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('create_instalador_propuesta_compra returns error on server failure', async () => {
    nock(BASE_URL)
      .post('/pgrl/v1/instaladores/INSTID/propuestas-compras')
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer(true);
    const handler = getHandler(server, 'freematica_create_instalador_propuesta_compra');
    const result = (await handler({ idInstalador: 'INSTID', fields: {} })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('get_instalador returns error not_found when idReg does not exist', async () => {
    nock(BASE_URL)
      .get('/pgrl/v1/instaladores/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_instalador');
    const result = (await handler({ idReg: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});
