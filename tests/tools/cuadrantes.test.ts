import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerCuadrantesTools } from '../../src/tools/cuadrantes.js';

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
  registerCuadrantesTools(server, client, { enableWrites });
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

describe('registerCuadrantesTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers all cuadrante read tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_cuadrantes');
    expect(tools).toHaveProperty('freematica_list_cuadrantes_detalles');
    expect(tools).toHaveProperty('freematica_list_cuadrantes_observaciones');
    expect(tools).toHaveProperty('freematica_list_cuadrantes_auditoria');
    expect(tools).toHaveProperty('freematica_list_cuadrantes_tareas');
    expect(tools).toHaveProperty('freematica_list_computos_pers');
    expect(tools).toHaveProperty('freematica_get_computos_pers');
    expect(tools).toHaveProperty('freematica_get_computos_pers_h');
    expect(tools).toHaveProperty('freematica_list_cuadrantes_cierre_personas');
    expect(tools).toHaveProperty('freematica_get_cuadrante_cierre_persona');
    expect(tools).toHaveProperty('freematica_list_cuadrantes_cierre_personas_complementos');
    expect(tools).toHaveProperty('freematica_get_cuadrante_cierre_persona_complemento');
    expect(tools).toHaveProperty('freematica_list_cuadrantes_cierre_personas_especiales');
    expect(tools).toHaveProperty('freematica_get_cuadrante_cierre_persona_especial');
    expect(tools).toHaveProperty('freematica_list_cuadrantes_cierre_personas_incidencias');
    expect(tools).toHaveProperty('freematica_get_cuadrante_cierre_persona_incidencia');
    // Nuevas tools de lectura Fase 7
    expect(tools).toHaveProperty('freematica_list_campos_estadisticos');
    expect(tools).toHaveProperty('freematica_list_inspecciones');
    expect(tools).toHaveProperty('freematica_list_plantillas');
    expect(tools).toHaveProperty('freematica_list_normas');
    expect(tools).toHaveProperty('freematica_list_rutas_gestion');
    expect(tools).toHaveProperty('freematica_list_rutas_planificacion');
    expect(tools).toHaveProperty('freematica_list_acompanante_ruta');
  });

  it('gate: write tools not registered without enableWrites', () => {
    const tools = (buildServer(false) as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).not.toHaveProperty('freematica_create_computo_pers');
    expect(tools).not.toHaveProperty('freematica_update_computo_pers');
    expect(tools).not.toHaveProperty('freematica_create_computo_pers_h');
  });

  it('write tools registered with enableWrites', () => {
    const tools = (buildServer(true) as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_create_computo_pers');
    expect(tools).toHaveProperty('freematica_update_computo_pers');
    expect(tools).toHaveProperty('freematica_create_computo_pers_h');
  });

  describe('freematica_create_computo_pers', () => {
    it('happy path — POST /pvss/v2/computos-pers', async () => {
      nock(BASE_URL)
        .post('/pvss/v2/computos-pers')
        .reply(200, { errorCode: '200', errorMessage: '', data: { CONFCP_ID: 'NEW' } });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_create_computo_pers');
      const result = (await handler({ CONFCP_EMP: '0001', CONFCP_MES: 1 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.CONFCP_ID).toBe('NEW');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pvss/v2/computos-pers')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_create_computo_pers');
      const result = (await handler({})) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_update_computo_pers', () => {
    it('happy path — PUT /pvss/v2/computos-pers/:idReg', async () => {
      nock(BASE_URL)
        .put('/pvss/v2/computos-pers/ID001%3D%3D')
        .reply(200, { errorCode: '200', errorMessage: '', data: { ok: true } });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_update_computo_pers');
      const result = (await handler({ idReg: 'ID001==', CONFCP_MES: 3 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .put('/pvss/v2/computos-pers/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_update_computo_pers');
      const result = (await handler({ idReg: 'ERR' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_create_computo_pers_h', () => {
    it('happy path — POST /pvss/v2/computos-pers-h', async () => {
      nock(BASE_URL)
        .post('/pvss/v2/computos-pers-h')
        .reply(200, { errorCode: '200', errorMessage: '', data: { CONFCPH_ID: 'HID' } });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_create_computo_pers_h');
      const result = (await handler({ CONFCPH_EMP: '0001', CONFCPH_MES: 1 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .post('/pvss/v2/computos-pers-h')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer(true);
      const handler = getHandler(server, 'freematica_create_computo_pers_h');
      const result = (await handler({})) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_list_campos_estadisticos', () => {
    it('returns paginated results', async () => {
      const fake = [{ CAMPO: 'ce1' }];
      nock(BASE_URL)
        .get('/pvss/v2/campos-estadisticos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 5));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_campos_estadisticos');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/campos-estadisticos')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_campos_estadisticos');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_cuadrantes
  // -------------------------------------------------------------------------

  describe('freematica_list_cuadrantes', () => {
    it('returns paginated results', async () => {
      const fake = [{ COD_CUAD: 'C001' }];
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 10));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(10);
    });

    it('sends order param when provided', async () => {
      const fake = [{ COD_CUAD: 'C002' }];
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes')
        .query({ items: '20', page: '1', order: 'COD_CUAD asc' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes');
      const result = (await handler({ page: 1, items: 20, order: 'COD_CUAD asc' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Boom', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes');
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
  // freematica_list_cuadrantes_auditoria (has desde param)
  // -------------------------------------------------------------------------

  describe('freematica_list_cuadrantes_auditoria', () => {
    it('returns paginated results without desde', async () => {
      const fake = [{ AUDIT: 'entry' }];
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-auditoria')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 200));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes_auditoria');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('sends desde param for incremental sync', async () => {
      const fake = [{ AUDIT: 'new_entry' }];
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-auditoria')
        .query({ items: '20', page: '1', desde: '2026-07-01' })
        .reply(200, listEnv(fake, 5));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes_auditoria');
      const result = (await handler({ page: 1, items: 20, desde: '2026-07-01' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-auditoria')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes_auditoria');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_computos_pers
  // -------------------------------------------------------------------------

  describe('freematica_list_computos_pers', () => {
    it('returns paginated results', async () => {
      const fake = [{ CPER: '1' }];
      nock(BASE_URL)
        .get('/pvss/v2/computos-pers')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 50));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_computos_pers');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/computos-pers')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_computos_pers');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_get_computos_pers
  // -------------------------------------------------------------------------

  describe('freematica_get_computos_pers', () => {
    it('returns item for a valid idReg', async () => {
      const fake = { CPER: 'detalle' };
      nock(BASE_URL)
        .get('/pvss/v2/computos-pers/CPER001%3D%3D')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_computos_pers');
      const result = (await handler({ idReg: 'CPER001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns not_found for missing idReg', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/computos-pers/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_computos_pers');
      const result = (await handler({ idReg: 'BADID' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/computos-pers/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_computos_pers');
      const result = (await handler({ idReg: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_get_computos_pers_h
  // -------------------------------------------------------------------------

  describe('freematica_get_computos_pers_h', () => {
    it('returns item for a valid idReg', async () => {
      const fake = { CPERH: 'historico' };
      nock(BASE_URL)
        .get('/pvss/v2/computos-pers-h/CPERH001%3D%3D')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_computos_pers_h');
      const result = (await handler({ idReg: 'CPERH001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns not_found for missing idReg', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/computos-pers-h/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_computos_pers_h');
      const result = (await handler({ idReg: 'BADID' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/computos-pers-h/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_computos_pers_h');
      const result = (await handler({ idReg: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Cierre personas — list & get
  // -------------------------------------------------------------------------

  describe('freematica_list_cuadrantes_cierre_personas', () => {
    it('returns paginated results', async () => {
      const fake = [{ CIERRE: 'c1' }];
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 3));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes_cierre_personas');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes_cierre_personas');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_cuadrante_cierre_persona', () => {
    it('returns item for a valid idReg', async () => {
      const fake = { CIERRE: 'detalle' };
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas/CP001%3D%3D')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona');
      const result = (await handler({ idReg: 'CP001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns not_found for missing idReg', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona');
      const result = (await handler({ idReg: 'BADID' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona');
      const result = (await handler({ idReg: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Cierre complementos
  // -------------------------------------------------------------------------

  describe('freematica_list_cuadrantes_cierre_personas_complementos', () => {
    it('returns paginated results', async () => {
      const fake = [{ COMP: 'c1' }];
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-complementos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 2));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes_cierre_personas_complementos');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-complementos')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes_cierre_personas_complementos');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_cuadrante_cierre_persona_complemento', () => {
    it('returns item for a valid idReg', async () => {
      const fake = { COMP: 'detalle' };
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-complementos/CC001%3D%3D')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona_complemento');
      const result = (await handler({ idReg: 'CC001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns not_found for missing idReg', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-complementos/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona_complemento');
      const result = (await handler({ idReg: 'BADID' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-complementos/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona_complemento');
      const result = (await handler({ idReg: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Cierre especiales
  // -------------------------------------------------------------------------

  describe('freematica_list_cuadrantes_cierre_personas_especiales', () => {
    it('returns paginated results', async () => {
      const fake = [{ ESP: 'e1' }];
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-especiales')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes_cierre_personas_especiales');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-especiales')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes_cierre_personas_especiales');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_cuadrante_cierre_persona_especial', () => {
    it('returns item for a valid idReg', async () => {
      const fake = { ESP: 'detalle' };
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-especiales/CE001%3D%3D')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona_especial');
      const result = (await handler({ idReg: 'CE001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns not_found for missing idReg', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-especiales/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona_especial');
      const result = (await handler({ idReg: 'BADID' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-especiales/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona_especial');
      const result = (await handler({ idReg: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Cierre incidencias
  // -------------------------------------------------------------------------

  describe('freematica_list_cuadrantes_cierre_personas_incidencias', () => {
    it('returns paginated results', async () => {
      const fake = [{ INC: 'i1' }];
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-incidencias')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 4));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes_cierre_personas_incidencias');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-incidencias')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_cuadrantes_cierre_personas_incidencias');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_cuadrante_cierre_persona_incidencia', () => {
    it('returns item for a valid idReg', async () => {
      const fake = { INC: 'detalle' };
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-incidencias/CI001%3D%3D')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona_incidencia');
      const result = (await handler({ idReg: 'CI001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns not_found for missing idReg', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-incidencias/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona_incidencia');
      const result = (await handler({ idReg: 'BADID' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('not_found');
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/cuadrantes-cierre-personas-incidencias/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_cuadrante_cierre_persona_incidencia');
      const result = (await handler({ idReg: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });
});
