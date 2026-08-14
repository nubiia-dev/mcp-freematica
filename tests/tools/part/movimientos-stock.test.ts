import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../../src/clients/freematica-client.js';
import { registerMovimientosStockTools } from '../../../src/tools/part/movimientos-stock.js';

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
  registerMovimientosStockTools(server, client, { enableWrites });
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

function detailEnv<T>(item: T) {
  return { errorCode: '200', errorMessage: '', data: item };
}

describe('registerMovimientosStockTools', () => {
  afterEach(() => nock.cleanAll());

  it('gate: sin enableWrites no registra el tool de creación', () => {
    const tools = (
      buildServer(false) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).not.toHaveProperty('freematica_create_movimiento_stock');
  });

  it('con enableWrites registra el tool de creación', () => {
    const tools = (
      buildServer(true) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).toHaveProperty('freematica_create_movimiento_stock');
  });

  describe('freematica_create_movimiento_stock', () => {
    it('envía el body y devuelve el movimiento creado', async () => {
      const fields = {
        COD_GRUPO_ART: '1',
        COD_ALMACEN: '01',
        COD_ARTICULO: 'A1',
        FEC_MOVTO: '2025-12-11T14:03:55.984Z',
        TIPO_MVTO: 'E',
        CANTIDAD: 10,
        ENT_SAL: 1,
      };
      const created = { idReg: 'MOV001', ...fields };

      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/part/v2/movimiento-stock', (body) => { sentBody = body; return true; })
        .reply(200, detailEnv(created));

      const handler = getHandler(buildServer(true), 'freematica_create_movimiento_stock');
      const result = await handler({ fields });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual(fields);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.idReg).toBe('MOV001');
    });

    it('propaga error del API', async () => {
      nock(BASE_URL)
        .post('/part/v2/movimiento-stock')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_create_movimiento_stock');
      const result = await handler({ fields: { COD_ARTICULO: 'A1' } });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });
});
