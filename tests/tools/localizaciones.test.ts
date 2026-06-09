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

const COBRO_TOOL = 'freematica_list_localizaciones_cobro_clientes';
const PAGO_TOOL = 'freematica_list_localizaciones_pago_proveedores';
const SERVICIO_TOOL = 'freematica_list_localizaciones_servicio_clientes';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerLocalizacionesTools(server, client);
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

describe('registerLocalizacionesTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers all three tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(COBRO_TOOL);
    expect(tools).toHaveProperty(PAGO_TOOL);
    expect(tools).toHaveProperty(SERVICIO_TOOL);
  });

  // ==========================================================================
  // localizaciones_cobro_clientes
  // ==========================================================================

  describe('list_localizaciones_cobro_clientes', () => {
    it('returns items, count, total, page, items_per_page (no filters)', async () => {
      const fake = [
        { COD_CLI: 'C001', GRUPO_CLI: 'G01', COD_FORMA_COBRO: 'TRANS' },
        { COD_CLI: 'C002', GRUPO_CLI: 'G01', COD_FORMA_COBRO: 'REM' },
      ];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-cobro-clientes')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 200));

      const server = buildServer();
      const handler = getHandler(server, COBRO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({
        items: fake,
        count: 2,
        total: 200,
        page: 1,
        items_per_page: 20,
      });
    });

    it('passes FIQL rquery for codCliente filter', async () => {
      const fake = [{ COD_CLI: 'C001' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-cobro-clientes')
        .query({ items: '20', page: '1', rquery: 'COD_CLI==C001' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, COBRO_TOOL);
      const result = (await handler({ page: 1, items: 20, codCliente: 'C001' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('passes FIQL rquery for grupoCliente and formaPago filters', async () => {
      const fake = [{ GRUPO_CLI: 'G01', COD_FORMA_COBRO: 'TRANS' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-cobro-clientes')
        .query(q => {
          const rquery = String(q.rquery ?? '');
          return rquery.includes('GRUPO_CLI==G01') && rquery.includes('COD_FORMA_COBRO==TRANS');
        })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, COBRO_TOOL);
      const result = (await handler({
        page: 1,
        items: 20,
        grupoCliente: 'G01',
        formaPago: 'TRANS',
      })) as { content: { type: string; text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-cobro-clientes')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const server = buildServer();
      const handler = getHandler(server, COBRO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });

    it('returns invalid_token on 401', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-cobro-clientes')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const server = buildServer();
      const handler = getHandler(server, COBRO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('invalid_token');
    });
  });

  // ==========================================================================
  // localizaciones_pago_proveedores
  // ==========================================================================

  describe('list_localizaciones_pago_proveedores', () => {
    it('returns items, count, total, page, items_per_page (no filters)', async () => {
      const fake = [
        { COD_PRO: 'P001', COD_GRUPO_PRO: 'G01', COD_FORMA_PAGO: 'TRANS' },
      ];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-pago-proveedores')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 50));

      const server = buildServer();
      const handler = getHandler(server, PAGO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({
        items: fake,
        count: 1,
        total: 50,
        page: 1,
        items_per_page: 20,
      });
    });

    it('passes FIQL rquery for codProveedor filter', async () => {
      const fake = [{ COD_PRO: 'P001' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-pago-proveedores')
        .query({ items: '20', page: '1', rquery: 'COD_PRO==P001' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, PAGO_TOOL);
      const result = (await handler({ page: 1, items: 20, codProveedor: 'P001' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('passes FIQL rquery for grupoProveedor and formaPago filters', async () => {
      const fake = [{ COD_GRUPO_PRO: 'G01', COD_FORMA_PAGO: 'REM' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-pago-proveedores')
        .query(q => {
          const rquery = String(q.rquery ?? '');
          return rquery.includes('COD_GRUPO_PRO==G01') && rquery.includes('COD_FORMA_PAGO==REM');
        })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, PAGO_TOOL);
      const result = (await handler({
        page: 1,
        items: 20,
        grupoProveedor: 'G01',
        formaPago: 'REM',
      })) as { content: { type: string; text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-pago-proveedores')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const server = buildServer();
      const handler = getHandler(server, PAGO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });

    it('returns not_found on 404', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-pago-proveedores')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, PAGO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });
  });

  // ==========================================================================
  // localizaciones_servicio_clientes
  // ==========================================================================

  describe('list_localizaciones_servicio_clientes', () => {
    it('returns items, count, total, page, items_per_page (no filters)', async () => {
      const fake = [
        { COD_CLI: 'C001', COD_PAIS: 'ES', COD_PROVINCIA: '28', COD_REPRES: 'R01' },
      ];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 500));

      const server = buildServer();
      const handler = getHandler(server, SERVICIO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({
        items: fake,
        count: 1,
        total: 500,
        page: 1,
        items_per_page: 20,
      });
    });

    it('passes FIQL rquery for codCliente filter', async () => {
      const fake = [{ COD_CLI: 'C001' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query({ items: '20', page: '1', rquery: 'COD_CLI==C001' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, SERVICIO_TOOL);
      const result = (await handler({ page: 1, items: 20, codCliente: 'C001' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('passes FIQL for codPais and codProvincia filters', async () => {
      const fake = [{ COD_PAIS: 'ES', COD_PROVINCIA: '28' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query(q => {
          const rquery = String(q.rquery ?? '');
          return rquery.includes('COD_PAIS==ES') && rquery.includes('COD_PROVINCIA==28');
        })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, SERVICIO_TOOL);
      const result = (await handler({
        page: 1,
        items: 20,
        codPais: 'ES',
        codProvincia: '28',
      })) as { content: { type: string; text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('passes FIQL for representante filter', async () => {
      const fake = [{ COD_REPRES: 'R01' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query(q => String(q.rquery ?? '').includes('COD_REPRES==R01'))
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, SERVICIO_TOOL);
      const result = (await handler({ page: 1, items: 20, representante: 'R01' })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('passes FECHA_BAJA==null for activo=true (localizaciones activas)', async () => {
      const fake = [{ COD_CLI: 'C001', FECHA_BAJA: null }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query(q => String(q.rquery ?? '').includes('FECHA_BAJA==null'))
        .reply(200, listEnv(fake, 5));

      const server = buildServer();
      const handler = getHandler(server, SERVICIO_TOOL);
      const result = (await handler({ page: 1, items: 20, activo: true })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('passes FECHA_BAJA!=null for activo=false (localizaciones de baja)', async () => {
      const fake = [{ COD_CLI: 'C001', FECHA_BAJA: '2023-06-01' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query(q => String(q.rquery ?? '').includes('FECHA_BAJA!=null'))
        .reply(200, listEnv(fake, 2));

      const server = buildServer();
      const handler = getHandler(server, SERVICIO_TOOL);
      const result = (await handler({ page: 1, items: 20, activo: false })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const server = buildServer();
      const handler = getHandler(server, SERVICIO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });

    it('returns invalid_token on 401', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const server = buildServer();
      const handler = getHandler(server, SERVICIO_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('invalid_token');
    });
  });
});
