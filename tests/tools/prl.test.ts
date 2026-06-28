import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPrlTools } from '../../src/tools/prl.js';
import { FichaPrevClienteRefinedSchema } from '../../src/tools/prl.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const FICHA_TOOL = 'freematica_get_ficha_prev_cliente';
const LIST_VS_TOOL = 'freematica_list_vigilancia_salud';
const GET_VS_TOOL = 'freematica_get_vigilancia_salud';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerPrlTools(server, client);
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

// ---------------------------------------------------------------------------
// FichaPrevClienteRefinedSchema — .refine() validation tests
// ---------------------------------------------------------------------------

describe('FichaPrevClienteRefinedSchema (.refine validation)', () => {
  it('fails when all 4 identifiers are undefined (empty input)', () => {
    const result = FichaPrevClienteRefinedSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((e) => e.message);
      expect(msgs.some((m) => m.includes('al menos un identificador'))).toBe(true);
    }
  });

  it('passes when codCliente is provided', () => {
    expect(FichaPrevClienteRefinedSchema.safeParse({ codCliente: '123' }).success).toBe(true);
  });

  it('passes when grupoCliente is provided', () => {
    expect(FichaPrevClienteRefinedSchema.safeParse({ grupoCliente: 5 }).success).toBe(true);
  });

  it('passes when codLocalizacionServicio is provided', () => {
    expect(FichaPrevClienteRefinedSchema.safeParse({ codLocalizacionServicio: 12345 }).success).toBe(true);
  });

  it('passes when codigoFicha is provided', () => {
    expect(FichaPrevClienteRefinedSchema.safeParse({ codigoFicha: 'FICHA-001' }).success).toBe(true);
  });

  it('passes when multiple identifiers are provided', () => {
    expect(
      FichaPrevClienteRefinedSchema.safeParse({ codCliente: '123', grupoCliente: 2 }).success,
    ).toBe(true);
  });

  it('fails grupoCliente > 99 (max 2 digits)', () => {
    const result = FichaPrevClienteRefinedSchema.safeParse({ grupoCliente: 100 });
    expect(result.success).toBe(false);
  });

  it('fails codLocalizacionServicio > 99999 (max 5 digits)', () => {
    const result = FichaPrevClienteRefinedSchema.safeParse({ codLocalizacionServicio: 100000 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// registerPrlTools — tool registration and handlers
// ---------------------------------------------------------------------------

describe('registerPrlTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers all 3 PRL tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(FICHA_TOOL);
    expect(tools).toHaveProperty(LIST_VS_TOOL);
    expect(tools).toHaveProperty(GET_VS_TOOL);
  });

  // -------------------------------------------------------------------------
  // freematica_get_ficha_prev_cliente
  // -------------------------------------------------------------------------

  describe('freematica_get_ficha_prev_cliente', () => {
    it('returns error when no identifier is provided (refine validation)', async () => {
      const server = buildServer();
      const handler = getHandler(server, FICHA_TOOL);
      const result = (await handler({})) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.message).toContain('al menos un identificador');
    });

    it('returns fichas when codCliente is provided', async () => {
      const fake = [{ COD_CLI: '123', CODIGO_FICHA: 'F-001' }];
      nock(BASE_URL)
        .get('/pprl/v2/ficha-prev-cliente')
        .query({ codCli: '123' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, FICHA_TOOL);
      const result = (await handler({ codCliente: '123' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(1);
    });

    it('returns fichas when grupoCliente is provided', async () => {
      const fake = [{ COD_CLI: '456', COD_GRUPO_CLI: 5 }];
      nock(BASE_URL)
        .get('/pprl/v2/ficha-prev-cliente')
        .query({ grpCli: '5' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, FICHA_TOOL);
      const result = (await handler({ grupoCliente: 5 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('returns fichas when codLocalizacionServicio is provided', async () => {
      const fake = [{ COD_LOC_SERV: 99001 }];
      nock(BASE_URL)
        .get('/pprl/v2/ficha-prev-cliente')
        .query({ locServ: '99001' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, FICHA_TOOL);
      const result = (await handler({ codLocalizacionServicio: 99001 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('returns fichas when codigoFicha is provided', async () => {
      const fake = [{ CODIGO_FICHA: 'FICHA-XYZ' }];
      nock(BASE_URL)
        .get('/pprl/v2/ficha-prev-cliente')
        .query({ codigo: 'FICHA-XYZ' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, FICHA_TOOL);
      const result = (await handler({ codigoFicha: 'FICHA-XYZ' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('returns error not_found on 404 envelope', async () => {
      nock(BASE_URL)
        .get('/pprl/v2/ficha-prev-cliente')
        .query({ codCli: 'NOTEXIST' })
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const server = buildServer();
      const handler = getHandler(server, FICHA_TOOL);
      const result = (await handler({ codCliente: 'NOTEXIST' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns error server_error on 500 envelope', async () => {
      nock(BASE_URL)
        .get('/pprl/v2/ficha-prev-cliente')
        .query({ codCli: '123' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const server = buildServer();
      const handler = getHandler(server, FICHA_TOOL);
      const result = (await handler({ codCliente: '123' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_vigilancia_salud
  // -------------------------------------------------------------------------

  describe('freematica_list_vigilancia_salud', () => {
    it('returns paginated results with no filters', async () => {
      const fake = [{ PERVS_PERSO: 'P001', idReg: 'abc123' }];
      nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 50));

      const server = buildServer();
      const handler = getHandler(server, LIST_VS_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(50);
      expect(parsed.page).toBe(1);
    });

    it('sends empresa and delegacion as FIQL rquery', async () => {
      const fake = [{ PERVS_EMP: '1', PERVS_DELEG: 'MAD' }];
      nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({ items: '20', page: '1', rquery: 'PERVS_EMP==1;PERVS_DELEG==MAD' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_VS_TOOL);
      const result = (await handler({ page: 1, items: 20, empresa: '1', delegacion: 'MAD' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('sends idRegPersona as native query param (not FIQL)', async () => {
      const fake = [{ PERVS_PERSO: 'P001' }];
      nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({ items: '20', page: '1', idRegPersona: 'ABCDEF==' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_VS_TOOL);
      const result = (await handler({ page: 1, items: 20, idRegPersona: 'ABCDEF==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Boom', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_VS_TOOL);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });

    it('pasa filtro fechaCitaDesde/Hasta al client y lo traduce a FIQL ge+le', async () => {
      const fake = [{ PERVS_FCH_CITA: '2025-06-15', idReg: 'xyz' }];
      nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({
          items: '20',
          page: '1',
          rquery: 'PERVS_FCH_CITA=ge=2025-01-01;PERVS_FCH_CITA=le=2025-12-31',
        })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_VS_TOOL);
      const result = (await handler({
        page: 1,
        items: 20,
        fechaCitaDesde: '2025-01-01',
        fechaCitaHasta: '2025-12-31',
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_get_vigilancia_salud
  // -------------------------------------------------------------------------

  describe('freematica_get_vigilancia_salud', () => {
    it('returns the VS record for a valid idReg', async () => {
      const fake = { PERVS_PERSO: 'P001', PERVS_RESULTADO: 'APTO', idReg: 'abc123' };
      nock(BASE_URL).get('/pprl/v1/vigilancia-salud/abc123').reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, GET_VS_TOOL);
      const result = (await handler({ id: 'abc123' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns error not_found when idReg does not exist', async () => {
      nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const server = buildServer();
      const handler = getHandler(server, GET_VS_TOOL);
      const result = (await handler({ id: 'BADID' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Err', data: null });

      const server = buildServer();
      const handler = getHandler(server, GET_VS_TOOL);
      const result = (await handler({ id: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });
});
