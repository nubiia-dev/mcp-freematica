import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerHabilitacionesTools } from '../../src/tools/habilitaciones.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_SERV_ALTA = 'freematica_list_habilitaciones_servicios_alta';
const LIST_SERV_BAJA = 'freematica_list_habilitaciones_servicios_baja';
const LIST_PERS_ALTA = 'freematica_list_habilitaciones_personal_alta';
const LIST_PERS_BAJA = 'freematica_list_habilitaciones_personal_baja';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer(enableWrites = false) {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerHabilitacionesTools(server, client, { enableWrites });
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

describe('registerHabilitacionesTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers all 6 habilitaciones read tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_SERV_ALTA);
    expect(tools).toHaveProperty(LIST_SERV_BAJA);
    expect(tools).toHaveProperty(LIST_PERS_ALTA);
    expect(tools).toHaveProperty(LIST_PERS_BAJA);
    expect(tools).toHaveProperty('freematica_list_solicitudes_material');
    expect(tools).toHaveProperty('freematica_get_solicitud_material');
  });

  it('gate: write tools not registered without enableWrites', () => {
    const tools = (buildServer(false) as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).not.toHaveProperty('freematica_actualizar_alta_habilitaciones_personal');
    expect(tools).not.toHaveProperty('freematica_actualizar_baja_habilitaciones_personal');
    expect(tools).not.toHaveProperty('freematica_actualizar_alta_habilitaciones_servicios');
    expect(tools).not.toHaveProperty('freematica_actualizar_baja_habilitaciones_servicios');
    expect(tools).not.toHaveProperty('freematica_create_solicitud_material');
  });

  it('write tools registered with enableWrites', () => {
    const tools = (buildServer(true) as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_actualizar_alta_habilitaciones_personal');
    expect(tools).toHaveProperty('freematica_actualizar_baja_habilitaciones_personal');
    expect(tools).toHaveProperty('freematica_actualizar_alta_habilitaciones_servicios');
    expect(tools).toHaveProperty('freematica_actualizar_baja_habilitaciones_servicios');
    expect(tools).toHaveProperty('freematica_create_solicitud_material');
  });

  describe('freematica_actualizar_alta_habilitaciones_personal', () => {
    it('happy path — PUT /peqv/v2/habilitaciones/personal/actualizar/alta', async () => {
      nock(BASE_URL)
        .put('/peqv/v2/habilitaciones/personal/actualizar/alta')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_actualizar_alta_habilitaciones_personal');
      const result = (await handler({ datos: [{ nif: '12345678A' }] })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/peqv/v2/habilitaciones/personal/actualizar/alta')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_actualizar_alta_habilitaciones_personal');
      const result = (await handler({ datos: [] })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_solicitud_material', () => {
    it('happy path — POST /peqv/v2/solicitud-material', async () => {
      nock(BASE_URL)
        .post('/peqv/v2/solicitud-material')
        .reply(200, { errorCode: '200', errorMessage: '', data: { EQSM_ID: 'SM001' } });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_create_solicitud_material');
      const result = (await handler({ EQSM_COD_ART: 'ART001', EQSM_CANT_SOLICITADA: 5 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/peqv/v2/solicitud-material')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_create_solicitud_material');
      const result = (await handler({})) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_list_solicitudes_material', () => {
    it('returns paginated results', async () => {
      const fake = [{ EQSM_ID: 'SM001' }];
      nock(BASE_URL)
        .get('/peqv/v2/solicitud-material')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 5));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_solicitudes_material');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/peqv/v2/solicitud-material')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_solicitudes_material');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_get_solicitud_material
  // -------------------------------------------------------------------------

  describe('freematica_get_solicitud_material', () => {
    it('returns detail for a valid idReg', async () => {
      const fake = { EQSM_ID: 'SM001', EQSM_COD_ART: 'ART001', EQSM_CANT_SOLICITADA: 5 };
      nock(BASE_URL)
        .get('/peqv/v2/solicitud-material/SM001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: fake });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_solicitud_material');
      const result = (await handler({ idReg: 'SM001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns error on 500 (FreematicaError)', async () => {
      nock(BASE_URL)
        .get('/peqv/v2/solicitud-material/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_solicitud_material');
      const result = (await handler({ idReg: 'ERR' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });

    it('returns error on network failure (non-FreematicaError)', async () => {
      nock(BASE_URL)
        .get('/peqv/v2/solicitud-material/NET')
        .replyWithError('ECONNREFUSED');

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_solicitud_material');
      const result = (await handler({ idReg: 'NET' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_actualizar_baja_habilitaciones_personal
  // -------------------------------------------------------------------------

  describe('freematica_actualizar_baja_habilitaciones_personal', () => {
    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/peqv/v2/habilitaciones/personal/actualizar/baja')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_actualizar_baja_habilitaciones_personal');
      const result = (await handler({ datos: [] })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_actualizar_alta_habilitaciones_servicios
  // -------------------------------------------------------------------------

  describe('freematica_actualizar_alta_habilitaciones_servicios', () => {
    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/peqv/v2/habilitaciones/servicios/actualizar/alta')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_actualizar_alta_habilitaciones_servicios');
      const result = (await handler({ datos: [] })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_actualizar_baja_habilitaciones_servicios
  // -------------------------------------------------------------------------

  describe('freematica_actualizar_baja_habilitaciones_servicios', () => {
    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/peqv/v2/habilitaciones/servicios/actualizar/baja')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_actualizar_baja_habilitaciones_servicios');
      const result = (await handler({ datos: [] })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_habilitaciones_servicios_alta
  // -------------------------------------------------------------------------

  describe('freematica_list_habilitaciones_servicios_alta', () => {
    it('returns paginated results with basic pagination', async () => {
      const fake = [{ CAMPO: 'alta_serv' }];
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/servicios/alta')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 100));

      const server = buildServer();
      const handler = getHandler(server, LIST_SERV_ALTA);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(100);
    });

    it('sends desde param for incremental sync', async () => {
      const fake = [{ CAMPO: 'alta_desde' }];
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/servicios/alta')
        .query({ items: '20', page: '1', desde: '2026-01-01' })
        .reply(200, listEnv(fake, 5));

      const server = buildServer();
      const handler = getHandler(server, LIST_SERV_ALTA);
      const result = (await handler({ page: 1, items: 20, desde: '2026-01-01' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/servicios/alta')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Boom', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_SERV_ALTA);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('server_error');
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_habilitaciones_servicios_baja
  // -------------------------------------------------------------------------

  describe('freematica_list_habilitaciones_servicios_baja', () => {
    it('returns paginated results with basic pagination', async () => {
      const fake = [{ CAMPO: 'baja_serv' }];
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/servicios/baja')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 30));

      const server = buildServer();
      const handler = getHandler(server, LIST_SERV_BAJA);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('sends desde param for incremental sync', async () => {
      const fake = [{ CAMPO: 'baja_desde' }];
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/servicios/baja')
        .query({ items: '20', page: '1', desde: '2026-06-01' })
        .reply(200, listEnv(fake, 2));

      const server = buildServer();
      const handler = getHandler(server, LIST_SERV_BAJA);
      const result = (await handler({ page: 1, items: 20, desde: '2026-06-01' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/servicios/baja')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_SERV_BAJA);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_habilitaciones_personal_alta
  // -------------------------------------------------------------------------

  describe('freematica_list_habilitaciones_personal_alta', () => {
    it('returns paginated results with basic pagination', async () => {
      const fake = [{ CAMPO: 'alta_pers' }];
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/personal/alta')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 10));

      const server = buildServer();
      const handler = getHandler(server, LIST_PERS_ALTA);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('sends desde param for incremental sync', async () => {
      const fake = [{ CAMPO: 'alta_pers_desde' }];
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/personal/alta')
        .query({ items: '20', page: '1', desde: '2025-12-01' })
        .reply(200, listEnv(fake, 3));

      const server = buildServer();
      const handler = getHandler(server, LIST_PERS_ALTA);
      const result = (await handler({ page: 1, items: 20, desde: '2025-12-01' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/personal/alta')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_PERS_ALTA);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_habilitaciones_personal_baja
  // -------------------------------------------------------------------------

  describe('freematica_list_habilitaciones_personal_baja', () => {
    it('returns paginated results with basic pagination', async () => {
      const fake = [{ CAMPO: 'baja_pers' }];
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/personal/baja')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 8));

      const server = buildServer();
      const handler = getHandler(server, LIST_PERS_BAJA);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('sends desde param for incremental sync', async () => {
      const fake = [{ CAMPO: 'baja_pers_desde' }];
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/personal/baja')
        .query({ items: '20', page: '1', desde: '2026-03-15' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, LIST_PERS_BAJA);
      const result = (await handler({ page: 1, items: 20, desde: '2026-03-15' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error server_error on 500', async () => {
      nock(BASE_URL)
        .get('/peqv/v2/habilitaciones/personal/baja')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, LIST_PERS_BAJA);
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });
});
