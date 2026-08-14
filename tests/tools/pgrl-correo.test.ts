import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPgrlCorreoTools } from '../../src/tools/pgrl-correo.js';

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
  registerPgrlCorreoTools(server, client, { enableWrites });
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

describe('registerPgrlCorreoTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers read tools', () => {
    const server = buildServer(false);
    const tools = getTools(server);
    expect(tools).toHaveProperty('freematica_list_correos');
    expect(tools).toHaveProperty('freematica_get_correo');
    expect(tools).toHaveProperty('freematica_list_correos_destinatarios');
    expect(tools).toHaveProperty('freematica_get_correos_totales');
    expect(tools).toHaveProperty('freematica_list_correo_v1');
    expect(tools).toHaveProperty('freematica_verificar_mail');
    expect(tools).toHaveProperty('freematica_mailing_unsubscribe');
    expect(tools).toHaveProperty('freematica_mailing_subscribe');
  });

  it('does NOT register write tools when enableWrites is false', () => {
    const server = buildServer(false);
    const tools = getTools(server);
    expect(tools).not.toHaveProperty('freematica_create_correo_v1');
    expect(tools).not.toHaveProperty('freematica_create_correo');
    expect(tools).not.toHaveProperty('freematica_update_correo_estado_v1');
    expect(tools).not.toHaveProperty('freematica_update_correo_estado');
  });

  it('registers write tools when enableWrites is true', () => {
    const server = buildServer(true);
    const tools = getTools(server);
    expect(tools).toHaveProperty('freematica_create_correo_v1');
    expect(tools).toHaveProperty('freematica_create_correo');
    expect(tools).toHaveProperty('freematica_update_correo_estado_v1');
    expect(tools).toHaveProperty('freematica_update_correo_estado');
  });

  it('list_correos returns items, count, total', async () => {
    const fake = [
      { ID_CORREO: 'C001', ASUNTO: 'Test email 1' },
      { ID_CORREO: 'C002', ASUNTO: 'Test email 2' },
    ];
    nock(BASE_URL)
      .get('/pgrl/v2/correos')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 100));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_correos');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
    expect(parsed.total).toBe(100);
    expect(parsed.count).toBe(2);
  });

  it('get_correo returns the correo object', async () => {
    const fake = { ID_CORREO: 'C001', ASUNTO: 'Test email' };
    nock(BASE_URL)
      .get('/pgrl/v2/correos/CORREOID')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_correo');
    const result = (await handler({ idReg: 'CORREOID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('get_correo returns error on not_found', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/correos/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_correo');
    const result = (await handler({ idReg: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('list_correos_destinatarios returns items', async () => {
    const fake = [{ ID_DEST: 'D001', EMAIL: 'dest@test.com' }];
    nock(BASE_URL)
      .get('/pgrl/v2/correos/destinatarios')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 50));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_correos_destinatarios');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_correos_destinatarios returns error on server failure', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/correos/destinatarios')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_correos_destinatarios');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('get_correos_totales returns error on server failure', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/correos/totales')
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_correos_totales');
    const result = (await handler({})) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('list_correo_v1 returns items', async () => {
    const fake = [{ ID_CORREO: 'C001' }];
    nock(BASE_URL)
      .get('/pgrl/v1/correo')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_correo_v1');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_correo_v1 returns error on server failure', async () => {
    nock(BASE_URL)
      .get('/pgrl/v1/correo')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_correo_v1');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('get_correos_totales returns totals object', async () => {
    const fake = { TOTAL: 500, ENVIADOS: 450, PENDIENTES: 50 };
    nock(BASE_URL)
      .get('/pgrl/v2/correos/totales')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_get_correos_totales');
    const result = (await handler({})) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('verificar_mail returns verification result', async () => {
    const fake = { VALIDO: true, EMAIL: 'test@test.com' };
    nock(BASE_URL)
      .get('/pgrl/v2/control/mail/verificar')
      .query({ email: 'test@test.com' })
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_verificar_mail');
    const result = (await handler({ email: 'test@test.com' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('verificar_mail returns error on server failure', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/control/mail/verificar')
      .query({ email: 'bad@bad.com' })
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_verificar_mail');
    const result = (await handler({ email: 'bad@bad.com' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('mailing_unsubscribe returns unsubscription result', async () => {
    const fake = { SUCCESS: true };
    nock(BASE_URL)
      .get('/pgrl/v1/mailing/unsubscribe/CONTACTID')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_mailing_unsubscribe');
    const result = (await handler({ idReg: 'CONTACTID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('mailing_unsubscribe returns error on not_found', async () => {
    nock(BASE_URL)
      .get('/pgrl/v1/mailing/unsubscribe/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_mailing_unsubscribe');
    const result = (await handler({ idReg: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('mailing_subscribe returns subscription result', async () => {
    const fake = { SUCCESS: true };
    nock(BASE_URL)
      .get('/pgrl/v1/mailing/subscribe/CONTACTID')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, 'freematica_mailing_subscribe');
    const result = (await handler({ idReg: 'CONTACTID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  it('mailing_subscribe returns error on not_found', async () => {
    nock(BASE_URL)
      .get('/pgrl/v1/mailing/subscribe/BAD')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_mailing_subscribe');
    const result = (await handler({ idReg: 'BAD' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('create_correo_v1 posts fields and returns created object', async () => {
    const camposAdicionales = { ASUNTO: 'Test v1', PARA: 'test@test.com' };
    nock(BASE_URL)
      .post('/pgrl/v1/correo', camposAdicionales)
      .reply(200, detailEnv(camposAdicionales));

    const server = buildServer(true);
    const handler = getHandler(server, 'freematica_create_correo_v1');
    const result = (await handler({ camposAdicionales })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(camposAdicionales);
  });

  it('create_correo_v1 returns error on server failure', async () => {
    nock(BASE_URL)
      .post('/pgrl/v1/correo')
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer(true);
    const handler = getHandler(server, 'freematica_create_correo_v1');
    const result = (await handler({ camposAdicionales: {} })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('create_correo posts fields and returns created object', async () => {
    const camposAdicionales = { ASUNTO: 'Test', PARA: 'test@test.com' };
    nock(BASE_URL)
      .post('/pgrl/v2/correos', camposAdicionales)
      .reply(200, detailEnv(camposAdicionales));

    const server = buildServer(true);
    const handler = getHandler(server, 'freematica_create_correo');
    const result = (await handler({ camposAdicionales })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(camposAdicionales);
  });

  it('create_correo (v2) returns error on server failure', async () => {
    nock(BASE_URL)
      .post('/pgrl/v2/correos')
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer(true);
    const handler = getHandler(server, 'freematica_create_correo');
    const result = (await handler({ camposAdicionales: {} })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('list_correos returns error server_error on 500', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/correos')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer();
    const handler = getHandler(server, 'freematica_list_correos');
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('update_correo_estado_v1 puts estado and returns updated object', async () => {
    const fields = { ESTADO: 'enviado' };
    const updated = { ID_CORREO: 'C001', ESTADO: 'enviado' };
    nock(BASE_URL)
      .put('/pgrl/v1/correo/C001/estado', fields)
      .reply(200, detailEnv(updated));

    const server = buildServer(true);
    const handler = getHandler(server, 'freematica_update_correo_estado_v1');
    const result = (await handler({ idReg: 'C001', fields })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(updated);
  });

  it('update_correo_estado_v1 returns error on not_found', async () => {
    nock(BASE_URL)
      .put('/pgrl/v1/correo/BAD/estado')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer(true);
    const handler = getHandler(server, 'freematica_update_correo_estado_v1');
    const result = (await handler({ idReg: 'BAD', fields: {} })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('update_correo_estado (v2) puts estado and returns updated object', async () => {
    const fields = { ESTADO: 'leido' };
    const updated = { ID_CORREO: 'C002', ESTADO: 'leido' };
    nock(BASE_URL)
      .put('/pgrl/v2/correos/C002/estado', fields)
      .reply(200, detailEnv(updated));

    const server = buildServer(true);
    const handler = getHandler(server, 'freematica_update_correo_estado');
    const result = (await handler({ idReg: 'C002', fields })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(updated);
  });

  it('update_correo_estado (v2) returns error on not_found', async () => {
    nock(BASE_URL)
      .put('/pgrl/v2/correos/BAD/estado')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer(true);
    const handler = getHandler(server, 'freematica_update_correo_estado');
    const result = (await handler({ idReg: 'BAD', fields: {} })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });
});
