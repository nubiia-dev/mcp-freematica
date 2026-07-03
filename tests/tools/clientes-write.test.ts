import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerClientesTools } from '../../src/tools/clientes.js';

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
  registerClientesTools(server, client, { enableWrites });
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

// idReg de cliente: Base64("1__1174")
const CLIENTE_IDREG = Buffer.from('1__1174').toString('base64');

describe('clientes write tools', () => {
  afterEach(() => nock.cleanAll());

  it('gate: sin enableWrites no registra create/update', () => {
    const tools = (
      buildServer(false) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).toHaveProperty('freematica_list_clientes');
    expect(tools).not.toHaveProperty('freematica_create_cliente');
    expect(tools).not.toHaveProperty('freematica_update_cliente');
  });

  it('create_cliente envía el body con idReg derivado', async () => {
    let sentBody: Record<string, unknown> = {};
    nock(BASE_URL)
      .post('/pgrl/v2/clientes', (body) => {
        sentBody = body;
        return true;
      })
      .reply(200, { errorCode: '200', errorMessage: '', data: { COD_CLI: '1174' } });

    const handler = getHandler(buildServer(true), 'freematica_create_cliente');
    const result = await handler({
      grupoCliente: 1,
      codCliente: '1174',
      nombre: 'SEUR SUBIRATS',
      nif: 'B12345678',
      tipoImpuesto: 'IVA',
      divisa: 'EUR',
      tipoFacturacion: 'M',
      email: 'x@y.com',
    });

    expect(result.isError).toBeUndefined();
    expect(sentBody).toEqual({
      idReg: CLIENTE_IDREG,
      COD_GRUPO_CLI: 1,
      COD_CLI: '1174',
      NOMBRE_CLI: 'SEUR SUBIRATS',
      NIF: 'B12345678',
      TIPO_IMPTO: 'IVA',
      COD_DIVISA: 'EUR',
      TIPO_FACT: 'M',
      E_MAIL: 'x@y.com',
    });
  });

  it('update_cliente hace fetch + merge y elimina metadatos', async () => {
    nock(BASE_URL)
      .get(`/pgrl/v2/clientes/${encodeURIComponent(CLIENTE_IDREG)}`)
      .reply(200, {
        errorCode: '200',
        errorMessage: '',
        data: {
          idReg: CLIENTE_IDREG,
          COD_GRUPO_CLI: 1,
          COD_CLI: '1174',
          NOMBRE_CLI: 'SEUR SUBIRATS',
          NIF: 'B12345678',
          TIPO_IMPTO: 'IVA',
          COD_DIVISA: 'EUR',
          TIPO_FACT: 'M',
          E_MAIL: 'vieja@y.com',
          RowNumber: 1,
          _id: '1',
          _cellSettings: '[]',
        },
      });
    let sentBody: Record<string, unknown> = {};
    nock(BASE_URL)
      .put(`/pgrl/v2/clientes/${encodeURIComponent(CLIENTE_IDREG)}`, (body) => {
        sentBody = body;
        return true;
      })
      .reply(200, { errorCode: '200', errorMessage: '', data: { COD_CLI: '1174' } });

    const handler = getHandler(buildServer(true), 'freematica_update_cliente');
    const result = await handler({ idReg: CLIENTE_IDREG, email: 'nueva@y.com' });

    expect(result.isError).toBeUndefined();
    expect(sentBody).toEqual({
      idReg: CLIENTE_IDREG,
      COD_GRUPO_CLI: 1,
      COD_CLI: '1174',
      NOMBRE_CLI: 'SEUR SUBIRATS',
      NIF: 'B12345678',
      TIPO_IMPTO: 'IVA',
      COD_DIVISA: 'EUR',
      TIPO_FACT: 'M',
      E_MAIL: 'nueva@y.com',
    });
  });

  it('update_cliente rechaza la llamada sin cambios', async () => {
    const handler = getHandler(buildServer(true), 'freematica_update_cliente');
    const result = await handler({ idReg: CLIENTE_IDREG });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).message).toContain('al menos un campo');
  });

  it('update_cliente propaga not_found del fetch previo', async () => {
    nock(BASE_URL)
      .get(`/pgrl/v2/clientes/${encodeURIComponent(CLIENTE_IDREG)}`)
      .reply(200, { errorCode: '404', errorMessage: 'No existe', data: null });

    const handler = getHandler(buildServer(true), 'freematica_update_cliente');
    const result = await handler({ idReg: CLIENTE_IDREG, nombre: 'X' });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('not_found');
  });
});
