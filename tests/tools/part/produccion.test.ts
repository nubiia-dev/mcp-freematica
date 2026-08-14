import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../../src/clients/freematica-client.js';
import { registerProduccionTools } from '../../../src/tools/part/produccion.js';

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
  registerProduccionTools(server, client, { enableWrites });
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

describe('registerProduccionTools', () => {
  afterEach(() => nock.cleanAll());

  it('gate: sin enableWrites no registra el tool de entrada de producción', () => {
    const tools = (
      buildServer(false) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).not.toHaveProperty('freematica_create_entrada_produccion');
  });

  it('con enableWrites registra el tool', () => {
    const tools = (
      buildServer(true) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).toHaveProperty('freematica_create_entrada_produccion');
  });

  describe('freematica_create_entrada_produccion', () => {
    it('mapea los parámetros correctamente al body y devuelve el resultado', async () => {
      const created = {
        FEC_MOVTO: '2025-12-11T14:03:55.984Z',
        ARTICULO_PA: 'PA001',
        ALMACEN_MP: 'MP01',
        ALMACEN_PA: 'PA01',
        CANTIDAD: 5,
        COD_LOTE: 'LOTE-2025',
      };

      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/part/v1/entradas-produccion', (body) => { sentBody = body; return true; })
        .reply(200, detailEnv(created));

      const handler = getHandler(buildServer(true), 'freematica_create_entrada_produccion');
      const result = await handler({
        fechaMovimiento: '2025-12-11T14:03:55.984Z',
        articuloPA: 'PA001',
        almacenMP: 'MP01',
        almacenPA: 'PA01',
        cantidad: 5,
        codLote: 'LOTE-2025',
      });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual(created);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.ARTICULO_PA).toBe('PA001');
    });

    it('omite COD_LOTE si no se proporciona', async () => {
      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/part/v1/entradas-produccion', (body) => { sentBody = body; return true; })
        .reply(200, detailEnv({ FEC_MOVTO: '2025-12-11T14:03:55.984Z' }));

      const handler = getHandler(buildServer(true), 'freematica_create_entrada_produccion');
      await handler({
        fechaMovimiento: '2025-12-11T14:03:55.984Z',
        articuloPA: 'PA001',
        almacenMP: 'MP01',
        almacenPA: 'PA01',
        cantidad: 5,
      });

      expect(sentBody).not.toHaveProperty('COD_LOTE');
    });

    it('propaga error del API', async () => {
      nock(BASE_URL)
        .post('/part/v1/entradas-produccion')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_create_entrada_produccion');
      const result = await handler({
        fechaMovimiento: '2025-12-11T14:03:55.984Z',
        articuloPA: 'PA001',
        almacenMP: 'MP01',
        almacenPA: 'PA01',
        cantidad: 5,
      });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });
});
