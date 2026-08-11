import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerServiciosPvssTools } from '../../src/tools/servicios-pvss.js';

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

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerServiciosPvssTools(server, client);
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

describe('registerServiciosPvssTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers all servicios-pvss tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('freematica_list_contratos_servicios_global');
    expect(tools).toHaveProperty('freematica_list_contratos_turnos');
    expect(tools).toHaveProperty('freematica_list_contratos_horarios_operativa');
    expect(tools).toHaveProperty('freematica_list_clases_servicios');
    expect(tools).toHaveProperty('freematica_list_inspectores');
    expect(tools).toHaveProperty('freematica_get_inspector_empresa');
    expect(tools).toHaveProperty('freematica_list_claves_facturacion');
    expect(tools).toHaveProperty('freematica_list_incidencias_servicios');
    expect(tools).toHaveProperty('freematica_get_incidencia_servicio');
    expect(tools).toHaveProperty('freematica_list_incidencecode');
    expect(tools).toHaveProperty('freematica_get_contratos_servicios_material');
  });

  // -------------------------------------------------------------------------
  // freematica_list_contratos_servicios_global
  // -------------------------------------------------------------------------

  describe('freematica_list_contratos_servicios_global', () => {
    it('returns paginated results', async () => {
      const fake = [{ COD_SERV: 'S001' }];
      nock(BASE_URL)
        .get('/pvss/v1/contratos-servicios')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 100));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_contratos_servicios_global');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(100);
    });

    it('sends order param when provided', async () => {
      const fake = [{ COD_SERV: 'S002' }];
      nock(BASE_URL)
        .get('/pvss/v1/contratos-servicios')
        .query({ items: '20', page: '1', order: 'COD_SERV asc' })
        .reply(200, listEnv(fake, 1));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_contratos_servicios_global');
      const result = (await handler({ page: 1, items: 20, order: 'COD_SERV asc' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/contratos-servicios')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Boom', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_contratos_servicios_global');
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
  // freematica_list_contratos_turnos
  // -------------------------------------------------------------------------

  describe('freematica_list_contratos_turnos', () => {
    it('returns paginated results', async () => {
      const fake = [{ TURNO: 'T001' }];
      nock(BASE_URL)
        .get('/pvss/v1/contratos-turnos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 20));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_contratos_turnos');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/contratos-turnos')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_contratos_turnos');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_contratos_horarios_operativa
  // -------------------------------------------------------------------------

  describe('freematica_list_contratos_horarios_operativa', () => {
    it('returns paginated results', async () => {
      const fake = [{ HORARIO: 'H001' }];
      nock(BASE_URL)
        .get('/pvss/v1/contratos-horarios-operativa')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 5));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_contratos_horarios_operativa');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/contratos-horarios-operativa')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_contratos_horarios_operativa');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_clases_servicios
  // -------------------------------------------------------------------------

  describe('freematica_list_clases_servicios', () => {
    it('returns paginated results', async () => {
      const fake = [{ CLASE: 'CL01' }];
      nock(BASE_URL)
        .get('/pvss/v1/clases-servicios')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 15));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_clases_servicios');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/clases-servicios')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_clases_servicios');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_inspectores
  // -------------------------------------------------------------------------

  describe('freematica_list_inspectores', () => {
    it('returns paginated results', async () => {
      const fake = [{ INSPECTOR: 'INS001' }];
      nock(BASE_URL)
        .get('/pvss/v1/inspectores')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 7));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_inspectores');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/inspectores')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_inspectores');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_get_inspector_empresa
  // -------------------------------------------------------------------------

  describe('freematica_get_inspector_empresa', () => {
    it('returns the inspector data', async () => {
      const fake = { COD_INSPECTOR: 'INS_EMP_001', NOMBRE: 'Inspector Principal' };
      nock(BASE_URL)
        .get('/pvss/v1/inspector-empresa')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_inspector_empresa');
      const result = (await handler({})) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v1/inspector-empresa')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_inspector_empresa');
      const result = (await handler({})) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_claves_facturacion
  // -------------------------------------------------------------------------

  describe('freematica_list_claves_facturacion', () => {
    it('returns paginated results', async () => {
      const fake = [{ CLAVE: 'CF001' }];
      nock(BASE_URL)
        .get('/pvss/v2/claves-facturacion')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 30));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_claves_facturacion');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/claves-facturacion')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_claves_facturacion');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_incidencias_servicios
  // -------------------------------------------------------------------------

  describe('freematica_list_incidencias_servicios', () => {
    it('returns paginated results', async () => {
      const fake = [{ INCIDENCIA: 'INC001' }];
      nock(BASE_URL)
        .get('/pvss/v2/incidencias-servicios')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 60));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_incidencias_servicios');
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
        .get('/pvss/v2/incidencias-servicios')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_incidencias_servicios');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_get_incidencia_servicio
  // -------------------------------------------------------------------------

  describe('freematica_get_incidencia_servicio', () => {
    it('returns item for a valid idReg', async () => {
      const fake = { INCIDENCIA: 'detalle' };
      nock(BASE_URL)
        .get('/pvss/v2/incidencias-servicios/INC001%3D%3D')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_incidencia_servicio');
      const result = (await handler({ idReg: 'INC001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns not_found for missing idReg', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/incidencias-servicios/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_incidencia_servicio');
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
        .get('/pvss/v2/incidencias-servicios/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_incidencia_servicio');
      const result = (await handler({ idReg: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_list_incidencecode
  // -------------------------------------------------------------------------

  describe('freematica_list_incidencecode', () => {
    it('returns paginated results', async () => {
      const fake = [{ CODE: 'IC001' }];
      nock(BASE_URL)
        .get('/pvss/v2/incidencecode')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 25));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_incidencecode');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/incidencecode')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_list_incidencecode');
      const result = (await handler({ page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // freematica_get_contratos_servicios_material
  // -------------------------------------------------------------------------

  describe('freematica_get_contratos_servicios_material', () => {
    it('returns item for a valid idReg', async () => {
      const fake = { MATERIAL: 'MAT001', CANTIDAD: 5 };
      nock(BASE_URL)
        .get('/pvss/v2/contratos-servicios-material/MAT001%3D%3D')
        .reply(200, detailEnv(fake));

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_contratos_servicios_material');
      const result = (await handler({ idReg: 'MAT001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fake);
    });

    it('returns not_found for missing idReg', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/contratos-servicios-material/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_contratos_servicios_material');
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
        .get('/pvss/v2/contratos-servicios-material/ERR')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const server = buildServer();
      const handler = getHandler(server, 'freematica_get_contratos_servicios_material');
      const result = (await handler({ idReg: 'ERR' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });
});
