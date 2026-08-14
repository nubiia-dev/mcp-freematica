import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPgrlCatalogosTools } from '../../src/tools/pgrl-catalogos.js';

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

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerPgrlCatalogosTools(server, client);
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

describe('registerPgrlCatalogosTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers all catalog tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_delegaciones_v1');
    expect(tools).toHaveProperty('freematica_get_delegacion_v1');
    expect(tools).toHaveProperty('freematica_list_delegaciones_agrupcod');
    expect(tools).toHaveProperty('freematica_list_delegaciones_v2');
    expect(tools).toHaveProperty('freematica_get_delegacion_v2');
    expect(tools).toHaveProperty('freematica_list_empresas');
    expect(tools).toHaveProperty('freematica_get_empresa');
    expect(tools).toHaveProperty('freematica_list_paises');
    expect(tools).toHaveProperty('freematica_list_provincias');
    expect(tools).toHaveProperty('freematica_list_nacionalidades');
    expect(tools).toHaveProperty('freematica_list_poblaciones');
    expect(tools).toHaveProperty('freematica_get_poblacion');
    expect(tools).toHaveProperty('freematica_list_series');
    expect(tools).toHaveProperty('freematica_list_lineas_negocio');
    expect(tools).toHaveProperty('freematica_list_bancos');
    expect(tools).toHaveProperty('freematica_list_tipos_impuestos');
    expect(tools).toHaveProperty('freematica_get_tipo_impuesto');
    expect(tools).toHaveProperty('freematica_list_usuarios_satelite');
    expect(tools).toHaveProperty('freematica_get_configuracion_usuario');
    expect(tools).toHaveProperty('freematica_list_auditoria_procesos');
  });

  it('list_delegaciones_v1 returns items, count, total', async () => {
    const fake = [{ COD_DLG: 'DLG01', DESC_DLG: 'Delegación Madrid' }];
    nock(BASE_URL)
      .get('/pgrl/v1/delegaciones')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 5));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_delegaciones_v1');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
    expect(parsed.total).toBe(5);
  });

  it('get_delegacion_v1 returns delegation detail', async () => {
    const fake = { COD_DLG: 'DLG01', DESC_DLG: 'Delegación Madrid' };
    nock(BASE_URL)
      .get('/pgrl/v1/delegaciones/REG01')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_delegacion_v1');
    const result = (await handler({ idReg: 'REG01' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('list_paises returns items', async () => {
    const fake = [{ COD_PAIS: 'ES', DESC_PAIS: 'España' }];
    nock(BASE_URL)
      .get('/pgrl/v1/paises')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 200));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_paises');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_poblaciones returns items', async () => {
    const fake = [{ COD_POB: 'POB01', DESC_POB: 'Madrid' }];
    nock(BASE_URL)
      .get('/pgrl/v2/poblaciones')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 8000));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_poblaciones');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
    expect(parsed.total).toBe(8000);
  });

  it('get_poblacion returns population detail', async () => {
    const fake = { COD_POB: 'POB01', DESC_POB: 'Madrid' };
    nock(BASE_URL)
      .get('/pgrl/v2/poblaciones/POBID')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_poblacion');
    const result = (await handler({ idReg: 'POBID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('get_tipo_impuesto returns tax type detail', async () => {
    const fake = { COD_IMP: 'IVA21', PORCENTAJE: 21 };
    nock(BASE_URL)
      .get('/pgrl/v2/tipos-impuestos/IMPID')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_tipo_impuesto');
    const result = (await handler({ idReg: 'IMPID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('get_configuracion_usuario returns configuration object', async () => {
    const fake = { COD_USR: 'USR01', CONFIG: 'value' };
    nock(BASE_URL)
      .get('/pgrl/v1/configuracion-usuario/USRID')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_configuracion_usuario');
    const result = (await handler({ idReg: 'USRID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('get_configuracion_usuario returns error not_found', async () => {
    nock(BASE_URL)
      .get('/pgrl/v1/configuracion-usuario/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_configuracion_usuario');
    const result = (await handler({ idReg: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('list_auditoria_procesos returns items', async () => {
    const fake = [{ ID_PROC: 'P001', DESCRIPCION: 'Proceso de facturación' }];
    nock(BASE_URL)
      .get('/pgrl/v2/auditoria-procesos')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 100));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_auditoria_procesos');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
    expect(parsed.total).toBe(100);
  });

  it('list_auditoria_procesos returns error on server failure', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/auditoria-procesos')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_auditoria_procesos');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('get_delegacion_v1 returns error not_found when idReg does not exist', async () => {
    nock(BASE_URL)
      .get('/pgrl/v1/delegaciones/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_delegacion_v1');
    const result = (await handler({ idReg: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});
