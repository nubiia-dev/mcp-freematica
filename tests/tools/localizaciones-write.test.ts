import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerLocalizacionesTools } from '../../src/tools/localizaciones.js';

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
  registerLocalizacionesTools(server, client, { enableWrites });
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

const LOC_IDREG = 'TE9DMQ==';

describe('localizaciones tools (nuevas list + write)', () => {
  afterEach(() => nock.cleanAll());

  it('gate: list envío/factura siempre; create/update solo con enableWrites', () => {
    const readonly = (
      buildServer(false) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(readonly).toHaveProperty('freematica_list_localizaciones_envio_clientes');
    expect(readonly).toHaveProperty('freematica_list_localizaciones_factura_clientes');
    expect(readonly).not.toHaveProperty('freematica_create_localizacion_cliente');
    expect(readonly).not.toHaveProperty('freematica_update_localizacion_cliente');

    const writable = (
      buildServer(true) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(writable).toHaveProperty('freematica_create_localizacion_cliente');
    expect(writable).toHaveProperty('freematica_update_localizacion_cliente');
  });

  it('list_localizaciones_envio_clientes lista con filtro FIQL por cliente', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/localizaciones-envio-clientes')
      .query((q) => q['rquery'] === "COD_CLI=='1174'" && q['page'] === '1')
      .reply(200, {
        errorCode: '200',
        errorMessage: '',
        data: { total: '1', items: [{ LOC_CLI_ENV: 3, idReg: LOC_IDREG }], rowHeight: -1 },
      });

    const handler = getHandler(
      buildServer(false),
      'freematica_list_localizaciones_envio_clientes',
    );
    const result = await handler({ page: 1, items: 20, codCliente: '1174' });
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text).items[0].LOC_CLI_ENV).toBe(3);
  });

  it('list_localizaciones_factura_clientes lista paginada', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/localizaciones-factura-clientes')
      .query(true)
      .reply(200, {
        errorCode: '200',
        errorMessage: '',
        data: { total: '1', items: [{ LOC_CLI_FAC: 1 }], rowHeight: -1 },
      });

    const handler = getHandler(
      buildServer(false),
      'freematica_list_localizaciones_factura_clientes',
    );
    const result = await handler({ page: 1, items: 20 });
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text).total).toBe(1);
  });

  it('create tipo servicio envía el body con DESCRIPCION', async () => {
    let sentBody: Record<string, unknown> = {};
    nock(BASE_URL)
      .post('/pgrl/v2/localizaciones-servicio-clientes', (body) => {
        sentBody = body;
        return true;
      })
      .reply(200, { errorCode: '200', errorMessage: '', data: { LOC_CLI_SERV: 6 } });

    const handler = getHandler(buildServer(true), 'freematica_create_localizacion_cliente');
    const result = await handler({
      tipo: 'servicio',
      grupoCliente: 1,
      codCliente: '1174',
      codLocalizacion: 6,
      nombre: 'NAVE SEUR SUBIRATS',
      domicilio: 'CAN BOSC D ANOIA SN',
    });

    expect(result.isError).toBeUndefined();
    expect(sentBody).toEqual({
      COD_GRUPO_CLI: 1,
      COD_CLI: '1174',
      LOC_CLI_SERV: 6,
      DESCRIPCION: 'NAVE SEUR SUBIRATS',
      DOMICILIO: 'CAN BOSC D ANOIA SN',
    });
  });

  it('create tipo cobro exige formaPago', async () => {
    const handler = getHandler(buildServer(true), 'freematica_create_localizacion_cliente');
    const result = await handler({
      tipo: 'cobro',
      grupoCliente: 1,
      codCliente: '1174',
      codLocalizacion: 2,
      nombre: 'COBRO',
    });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).message).toContain('formaPago');
  });

  it('create tipo servicio exige nombre; tipo envio no', async () => {
    const handler = getHandler(buildServer(true), 'freematica_create_localizacion_cliente');
    const sinNombre = await handler({
      tipo: 'servicio',
      grupoCliente: 1,
      codCliente: '1174',
      codLocalizacion: 6,
    });
    expect(sinNombre.isError).toBe(true);
    expect(JSON.parse(sinNombre.content[0].text).message).toContain('nombre');

    nock(BASE_URL)
      .post('/pgrl/v2/localizaciones-envio-clientes')
      .reply(200, { errorCode: '200', errorMessage: '', data: { LOC_CLI_ENV: 3 } });
    const envioSinNombre = await handler({
      tipo: 'envio',
      grupoCliente: 1,
      codCliente: '1174',
      codLocalizacion: 3,
    });
    expect(envioSinNombre.isError).toBeUndefined();
  });

  it('update tipo factura hace fetch v1 + merge + PUT v2', async () => {
    nock(BASE_URL)
      .get(`/pgrl/v1/localizaciones-factura-clientes/${encodeURIComponent(LOC_IDREG)}`)
      .reply(200, {
        errorCode: '200',
        errorMessage: '',
        data: {
          idReg: LOC_IDREG,
          COD_GRUPO_CLI: 1,
          COD_CLI: '1174',
          LOC_CLI_FAC: 1,
          NOM_LOC_FAC: 'SEDE FISCAL',
          E_MAIL: 'vieja@seur.com',
          RowNumber: 2,
          _id: '2',
          _cellSettings: '[]',
        },
      });
    let sentBody: Record<string, unknown> = {};
    nock(BASE_URL)
      .put(`/pgrl/v2/localizaciones-factura-clientes/${encodeURIComponent(LOC_IDREG)}`, (body) => {
        sentBody = body;
        return true;
      })
      .reply(200, { errorCode: '200', errorMessage: '', data: { LOC_CLI_FAC: 1 } });

    const handler = getHandler(buildServer(true), 'freematica_update_localizacion_cliente');
    const result = await handler({ tipo: 'factura', idReg: LOC_IDREG, email: 'nueva@seur.com' });

    expect(result.isError).toBeUndefined();
    expect(sentBody).toEqual({
      idReg: LOC_IDREG,
      COD_GRUPO_CLI: 1,
      COD_CLI: '1174',
      LOC_CLI_FAC: 1,
      NOM_LOC_FAC: 'SEDE FISCAL',
      E_MAIL: 'nueva@seur.com',
    });
  });

  it('update rechaza la llamada sin cambios', async () => {
    const handler = getHandler(buildServer(true), 'freematica_update_localizacion_cliente');
    const result = await handler({ tipo: 'cobro', idReg: LOC_IDREG });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).message).toContain('al menos un campo');
  });
});
