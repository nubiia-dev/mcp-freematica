import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../../src/clients/freematica-client.js';
import { registerAlbaranesTraspasoTools } from '../../../src/tools/part/albaranes-traspaso.js';

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
  registerAlbaranesTraspasoTools(server, client, { enableWrites });
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

describe('registerAlbaranesTraspasoTools', () => {
  afterEach(() => nock.cleanAll());

  it('gate: sin enableWrites no registra los tools de escritura', () => {
    const tools = (
      buildServer(false) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).not.toHaveProperty('freematica_create_albaran_traspaso');
    expect(tools).not.toHaveProperty('freematica_traspaso_albaran');
  });

  it('con enableWrites registra ambos tools', () => {
    const tools = (
      buildServer(true) as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(tools).toHaveProperty('freematica_create_albaran_traspaso');
    expect(tools).toHaveProperty('freematica_traspaso_albaran');
  });

  describe('freematica_create_albaran_traspaso', () => {
    it('envía cab+lineas correctamente y devuelve el albarán creado', async () => {
      const cab = { EMPRESA: '1', ALM_ORIGEN: '01', ALM_DESTINO: '02' };
      const lineas = [{ COD_ARTICULO: 'A1', CANTIDAD: 5 }];
      const created = { idReg: 'ALB001', VoTraspasoAlbaranCab: cab, lineas };

      let sentBody: Record<string, unknown> = {};
      nock(BASE_URL)
        .post('/part/v2/albaranes-traspaso', (body) => { sentBody = body; return true; })
        .reply(200, detailEnv(created));

      const handler = getHandler(buildServer(true), 'freematica_create_albaran_traspaso');
      const result = await handler({ cab, lineas });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual({ VoTraspasoAlbaranCab: cab, lineas });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.idReg).toBe('ALB001');
    });
  });

  describe('freematica_traspaso_albaran', () => {
    it('ejecuta el traspaso enviando body vacío', async () => {
      const IDREG = 'ALB001';
      let sentBody: Record<string, unknown> = { sentinel: true };
      nock(BASE_URL)
        .put(`/part/v2/control/albaran-traspaso/${encodeURIComponent(IDREG)}`, (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, detailEnv({ success: true }));

      const handler = getHandler(buildServer(true), 'freematica_traspaso_albaran');
      const result = await handler({ idReg: IDREG });

      expect(result.isError).toBeUndefined();
      expect(sentBody).toEqual({});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it('propaga error del API', async () => {
      nock(BASE_URL)
        .put('/part/v2/control/albaran-traspaso/IDREG1')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_traspaso_albaran');
      const result = await handler({ idReg: 'IDREG1' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });
});
