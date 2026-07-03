import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerContactosClientesTools } from '../../src/tools/contactos-clientes.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

type Handler = (args: unknown) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}>;

function buildServer(enableWrites: boolean): McpServer {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerContactosClientesTools(server, client, { enableWrites });
  return server;
}

function getHandler(server: McpServer, name: string): Handler {
  const tools = (
    server as unknown as {
      _registeredTools: Record<string, { handler?: Handler; callback?: Handler }>;
    }
  )._registeredTools;
  const handler = tools[name]?.handler ?? tools[name]?.callback;
  if (!handler) throw new Error(`handler no registrado: ${name}`);
  return handler;
}

const CONTACTO_IDREG = 'Q09OVEFDVE8x';

describe('contactos clientes write tools', () => {
  afterEach(() => nock.cleanAll());

  it('gate: sin enableWrites no registra create/update', () => {
    const tools = (
      buildServer(false) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).toHaveProperty('freematica_list_contactos_clientes');
    expect(tools).not.toHaveProperty('freematica_create_contacto_cliente');
    expect(tools).not.toHaveProperty('freematica_update_contacto_cliente');
  });

  it('create_contacto_cliente envía el body CC_* con flags', async () => {
    let sentBody: Record<string, unknown> = {};
    nock(BASE_URL)
      .post('/pgrl/v2/contactos-clientes', (body) => {
        sentBody = body;
        return true;
      })
      .reply(200, { errorCode: '200', errorMessage: '', data: { CC_CLI: '1174' } });

    const handler = getHandler(buildServer(true), 'freematica_create_contacto_cliente');
    const result = await handler({
      grupoCliente: 1,
      codCliente: '1174',
      nombreApellidos: 'MARIA LOPEZ',
      email: 'maria@seur.com',
      contactoPrincipal: true,
    });

    expect(result.isError).toBeUndefined();
    expect(sentBody).toEqual({
      CC_GRUPO_CLI: 1,
      CC_CLI: '1174',
      CC_NOM_APELL: 'MARIA LOPEZ',
      CC_EMAIL1: 'maria@seur.com',
      CC_CONTACTO_PRINCIPAL: '1',
    });
  });

  it('update_contacto_cliente hace fetch v1 + merge + PUT v2', async () => {
    nock(BASE_URL)
      .get(`/pgrl/v1/contactos-clientes/${encodeURIComponent(CONTACTO_IDREG)}`)
      .reply(200, {
        errorCode: '200',
        errorMessage: '',
        data: {
          idReg: CONTACTO_IDREG,
          CC_GRUPO_CLI: 1,
          CC_CLI: '1174',
          CC_NOM_APELL: 'MARIA LOPEZ',
          CC_EMAIL1: 'vieja@seur.com',
          RowNumber: 7,
          _id: '7',
          _cellSettings: '[]',
        },
      });
    let sentBody: Record<string, unknown> = {};
    nock(BASE_URL)
      .put(`/pgrl/v2/contactos-clientes/${encodeURIComponent(CONTACTO_IDREG)}`, (body) => {
        sentBody = body;
        return true;
      })
      .reply(200, { errorCode: '200', errorMessage: '', data: { CC_CLI: '1174' } });

    const handler = getHandler(buildServer(true), 'freematica_update_contacto_cliente');
    const result = await handler({ idReg: CONTACTO_IDREG, email: 'nueva@seur.com', decisor: true });

    expect(result.isError).toBeUndefined();
    expect(sentBody).toEqual({
      idReg: CONTACTO_IDREG,
      CC_GRUPO_CLI: 1,
      CC_CLI: '1174',
      CC_NOM_APELL: 'MARIA LOPEZ',
      CC_EMAIL1: 'nueva@seur.com',
      CC_DECISOR: '1',
    });
  });

  it('update_contacto_cliente rechaza la llamada sin cambios', async () => {
    const handler = getHandler(buildServer(true), 'freematica_update_contacto_cliente');
    const result = await handler({ idReg: CONTACTO_IDREG });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).message).toContain('al menos un campo');
  });
});
