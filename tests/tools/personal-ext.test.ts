import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPersonalExtTools } from '../../src/tools/personal-ext.js';

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
  registerPersonalExtTools(server, client, { enableWrites });
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

function okEnv(data: unknown) {
  return { errorCode: '200', errorMessage: '', data };
}

// ---------------------------------------------------------------------------
// Read-only tool names
// ---------------------------------------------------------------------------
const READ_TOOLS = [
  'freematica_list_personal_v2',
  'freematica_list_personal_identificacion',
  'freematica_list_personal_notas',
  'freematica_get_personal_nota',
  'freematica_list_personal_experiencias',
  'freematica_get_personal_experiencia',
  'freematica_list_personal_formaciones',
  'freematica_get_personal_formacion',
  'freematica_list_personal_contratos',
  'freematica_get_personal_contrato',
  'freematica_list_personal_tramos',
  'freematica_get_personal_tramo',
  'freematica_list_personal_tramos_sync',
  'freematica_get_personal_tramo_v2',
  'freematica_list_personal_pago',
  'freematica_get_personal_pago',
  'freematica_list_personal_adicionales',
  'freematica_list_personal_prorroga',
  'freematica_get_personal_prorroga',
  'freematica_list_incidencias_personal',
  'freematica_get_agenda_persona',
  'freematica_list_equipamiento_ficha_seguridad',
  'freematica_list_anticipos_personal',
  'freematica_get_anticipo_personal',
  'freematica_list_calendario_personal',
  'freematica_get_calendario_personal',
  'freematica_list_cpd',
  'freematica_get_cpd',
  'freematica_list_cpd_movimientos',
  'freematica_list_cpd_firmados_vid',
  'freematica_list_personal_irpf',
  'freematica_get_personal_irpf',
  'freematica_list_sesiones_formacion',
  'freematica_get_sesion_formacion',
  'freematica_list_vss_incidencias',
  'freematica_get_vss_incidencia',
];

// ---------------------------------------------------------------------------
// Write tool names
// ---------------------------------------------------------------------------
const WRITE_TOOLS = [
  'freematica_create_persona',
  'freematica_update_persona',
  'freematica_create_personal_identificacion',
  'freematica_create_personal_nota',
  'freematica_update_personal_nota',
  'freematica_create_personal_experiencia',
  'freematica_create_personal_formacion',
  'freematica_update_personal_formacion',
  'freematica_create_incidencia_base',
  'freematica_update_incidencia_base_fecha_fin',
  'freematica_create_personal_pago',
  'freematica_update_personal_pago',
  'freematica_create_personal_tramo',
  'freematica_update_personal_tramo',
  'freematica_create_personal_contrato',
  'freematica_update_personal_contrato',
  'freematica_create_personal_adicional',
  'freematica_update_personal_adicional',
  'freematica_create_anticipo_personal',
  'freematica_create_calendario_personal',
  'freematica_update_calendario_personal',
  'freematica_update_cpd_bulk',
  'freematica_update_cpd_gestion',
  'freematica_create_personal_irpf',
  'freematica_update_personal_irpf',
  'freematica_create_personal_irpf_ad',
  'freematica_update_personal_irpf_ad',
  'freematica_update_preventor',
  'freematica_update_preventor_estado',
];

describe('registerPersonalExtTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  // =========================================================================
  // REGISTRATION CHECKS
  // =========================================================================

  describe('tool registration', () => {
    it('registers all read-only tools regardless of enableWrites', () => {
      const server = buildServer(false);
      const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
      for (const name of READ_TOOLS) {
        expect(tools, `missing read tool: ${name}`).toHaveProperty(name);
      }
    });

    it('does NOT register write tools when enableWrites=false', () => {
      const server = buildServer(false);
      const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
      for (const name of WRITE_TOOLS) {
        expect(tools, `write tool should not be registered: ${name}`).not.toHaveProperty(name);
      }
    });

    it('registers write tools when enableWrites=true', () => {
      const server = buildServer(true);
      const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
      for (const name of WRITE_TOOLS) {
        expect(tools, `missing write tool: ${name}`).toHaveProperty(name);
      }
    });
  });

  // =========================================================================
  // freematica_list_personal_v2
  // =========================================================================

  describe('freematica_list_personal_v2', () => {
    it('returns paginated results without fchmodificacion', async () => {
      const fake = [{ VSSPER_COD: 'P001', VSSPER_NOM: 'Test' }];
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 100));

      const handler = getHandler(buildServer(), 'freematica_list_personal_v2');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(100);
    });

    it('passes fchmodificacion as query param', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1', fchmodificacion: '2026-01-01' })
        .reply(200, listEnv([], 0));

      const handler = getHandler(buildServer(), 'freematica_list_personal_v2');
      const result = (await handler({ page: 1, items: 20, fchmodificacion: '2026-01-01' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Boom', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_v2');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  // =========================================================================
  // freematica_list_personal_notas
  // =========================================================================

  describe('freematica_list_personal_notas', () => {
    it('returns paginated results without idReg filter', async () => {
      const fake = [{ PERNOT_TIPO: 'OBS', PERNOT_DES: 'Observación test' }];
      nock(BASE_URL)
        .get('/pers/v2/personal-notas')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 5));

      const handler = getHandler(buildServer(), 'freematica_list_personal_notas');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(5);
    });

    it('sends idReg as native query param (not FIQL)', async () => {
      const fake = [{ PERNOT_TIPO: 'OBS' }];
      nock(BASE_URL)
        .get('/pers/v2/personal-notas')
        .query({ items: '20', page: '1', idReg: 'PERS001==' })
        .reply(200, listEnv(fake, 1));

      const handler = getHandler(buildServer(), 'freematica_list_personal_notas');
      const result = (await handler({ page: 1, items: 20, idReg: 'PERS001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });

    it('returns error on 401', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal-notas')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_notas');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('invalid_token');
    });
  });

  // =========================================================================
  // freematica_get_personal_nota
  // =========================================================================

  describe('freematica_get_personal_nota', () => {
    it('returns the nota for a valid idReg', async () => {
      const fake = { PERNOT_TIPO: 'HAB', PERNOT_DES: 'Nota de prueba' };
      nock(BASE_URL)
        .get('/pers/v2/personal-notas/NOTA001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_personal_nota');
      const result = (await handler({ id: 'NOTA001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found when idReg does not exist', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal-notas/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_personal_nota');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_personal_tramos + tramos_sync
  // =========================================================================

  describe('freematica_list_personal_tramos', () => {
    it('returns paginated list of tramos v1', async () => {
      const fake = [{ PERHH_COD_HH: 'H01', PERHH_JORNADA: '100' }];
      nock(BASE_URL)
        .get('/pers/v1/personal_tramos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 50));

      const handler = getHandler(buildServer(), 'freematica_list_personal_tramos');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });
  });

  describe('freematica_list_personal_tramos_sync', () => {
    it('passes fchmodificacion query param', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal/tramos')
        .query({ items: '10', page: '1', fchmodificacion: '2026-06-01' })
        .reply(200, listEnv([], 0));

      const handler = getHandler(buildServer(), 'freematica_list_personal_tramos_sync');
      const result = (await handler({ page: 1, items: 10, fchmodificacion: '2026-06-01' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // freematica_list_personal_contratos + get
  // =========================================================================

  describe('freematica_list_personal_contratos', () => {
    it('returns paginated list of contratos', async () => {
      const fake = [{ PERCTRAB_TIPO: 'I', PERCTRAB_FEC_INI: '2024-01-01' }];
      nock(BASE_URL)
        .get('/pers/v1/personal_contratos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 10));

      const handler = getHandler(buildServer(), 'freematica_list_personal_contratos');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });
  });

  describe('freematica_get_personal_contrato', () => {
    it('returns contrato detail', async () => {
      const fake = { PERCTRAB_TIPO: 'I', PERCTRAB_FEC_INI: '2024-01-01' };
      nock(BASE_URL)
        .get('/pers/v1/personal_contratos/CTRAB001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_personal_contrato');
      const result = (await handler({ id: 'CTRAB001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });
  });

  // =========================================================================
  // freematica_list_cpd + get + movimientos
  // =========================================================================

  describe('freematica_list_cpd', () => {
    it('returns paginated CPD list', async () => {
      const fake = [{ CPD_TIPO: 'NOMINA', CPD_ESTADO: 'PENDIENTE' }];
      nock(BASE_URL)
        .get('/pers/v1/cpd')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 200));

      const handler = getHandler(buildServer(), 'freematica_list_cpd');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).total).toBe(200);
    });
  });

  describe('freematica_list_cpd_movimientos', () => {
    it('returns movements for a CPD document', async () => {
      const fake = [{ MOV_TIPO: 'ENVIO', MOV_FECHA: '2026-01-15' }];
      nock(BASE_URL)
        .get('/pers/v1/cpd/CPD001%3D%3D/movimientos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 3));

      const handler = getHandler(buildServer(), 'freematica_list_cpd_movimientos');
      const result = (await handler({ id: 'CPD001==', page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
    });
  });

  // =========================================================================
  // freematica_list_vss_incidencias + get
  // =========================================================================

  describe('freematica_list_vss_incidencias', () => {
    it('returns paginated VSS incidencias', async () => {
      const fake = [{ VSS_TIPO: 'AT', VSS_FECHA: '2026-03-01' }];
      nock(BASE_URL)
        .get('/pers/v2/vss-incidencias')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 7));

      const handler = getHandler(buildServer(), 'freematica_list_vss_incidencias');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).count).toBe(1);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/vss-incidencias')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_vss_incidencias');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_get_vss_incidencia', () => {
    it('returns the incidencia VSS detail', async () => {
      const fake = { VSS_TIPO: 'AT', VSS_BAJA: '2026-03-01' };
      nock(BASE_URL)
        .get('/pers/v2/vss-incidencias/VSS001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_vss_incidencia');
      const result = (await handler({ id: 'VSS001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });
  });

  // =========================================================================
  // freematica_list_anticipos_personal + get
  // =========================================================================

  describe('freematica_list_anticipos_personal', () => {
    it('returns paginated anticipos', async () => {
      const fake = [{ ANT_IMPORTE: '500' }];
      nock(BASE_URL)
        .get('/pers/v2/personal/anticipos')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 2));

      const handler = getHandler(buildServer(), 'freematica_list_anticipos_personal');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_persona
  // =========================================================================

  describe('freematica_create_persona (enableWrites=false)', () => {
    it('is NOT available', () => {
      const server = buildServer(false);
      const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
      expect(tools).not.toHaveProperty('freematica_create_persona');
    });
  });

  describe('freematica_create_persona (enableWrites=true)', () => {
    it('posts correct body with known fields', async () => {
      const created = { VSSPER_COD: 'P999', VSSPER_NOM: 'Nuevo' };
      nock(BASE_URL)
        .post('/pers/v1/personal', (body) => {
          return (
            body.VSSPER_EMP === '1' &&
            body.VSSPER_DELEG === 'MAD' &&
            body.VSSPER_COD === 'P999' &&
            body.VSSPER_APELL1 === 'Apellido' &&
            body.VSSPER_NOM === 'Nuevo'
          );
        })
        .reply(200, okEnv(created));

      const handler = getHandler(buildServer(true), 'freematica_create_persona');
      const result = (await handler({
        empresa: '1',
        delegacion: 'MAD',
        codPersona: 'P999',
        apellido1: 'Apellido',
        nombre: 'Nuevo',
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(created);
    });

    it('merges camposAdicionales into body', async () => {
      const created = { VSSPER_COD: 'P888' };
      nock(BASE_URL)
        .post('/pers/v1/personal', (body) => {
          return body.VSSPER_SIT === 'A' && body.VSSPER_DPTO === 'ADMIN';
        })
        .reply(200, okEnv(created));

      const handler = getHandler(buildServer(true), 'freematica_create_persona');
      const result = (await handler({
        empresa: '1',
        delegacion: 'MAD',
        codPersona: 'P888',
        apellido1: 'Test',
        nombre: 'Test',
        camposAdicionales: { VSSPER_SIT: 'A', VSSPER_DPTO: 'ADMIN' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .post('/pers/v1/personal')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_create_persona');
      const result = (await handler({
        empresa: '1',
        delegacion: 'MAD',
        codPersona: 'P777',
        apellido1: 'Err',
        nombre: 'Test',
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_persona
  // =========================================================================

  describe('freematica_update_persona (enableWrites=true)', () => {
    it('fetches current then PUTs merged body', async () => {
      const current = { VSSPER_COD: 'P001', VSSPER_NOM: 'OldName', VSSPER_APELL1: 'Old' };
      const idReg = 'PERS001==';

      nock(BASE_URL)
        .get(`/pers/v1/personal/${encodeURIComponent(idReg)}`)
        .reply(200, listEnv([current], 1));

      nock(BASE_URL)
        .put(`/pers/v1/personal/${encodeURIComponent(idReg)}`, (body) => {
          return body.VSSPER_COD === 'P001' && body.VSSPER_NOM === 'NewName';
        })
        .reply(200, okEnv({ ...current, VSSPER_NOM: 'NewName' }));

      const handler = getHandler(buildServer(true), 'freematica_update_persona');
      const result = (await handler({ idReg, nombre: 'NewName' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).VSSPER_NOM).toBe('NewName');
    });

    it('returns not_found when persona does not exist', async () => {
      const idReg = 'NOTEXIST==';
      nock(BASE_URL)
        .get(`/pers/v1/personal/${encodeURIComponent(idReg)}`)
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_persona');
      const result = (await handler({ idReg, nombre: 'NewName' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_personal_nota
  // =========================================================================

  describe('freematica_create_personal_nota (enableWrites=true)', () => {
    it('posts correct PERNOT_* body', async () => {
      const created = { PERNOT_TIPO: 'OBS', PERNOT_DES: 'Nota nueva' };
      nock(BASE_URL)
        .post('/pers/v2/personal-notas', (body) => {
          return body.PERNOT_TIPO === 'OBS' && body.PERNOT_DES === 'Nota nueva';
        })
        .reply(200, okEnv(created));

      const handler = getHandler(buildServer(true), 'freematica_create_personal_nota');
      const result = (await handler({
        tipo: 'OBS',
        descripcion: 'Nota nueva',
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(created);
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_personal_nota
  // =========================================================================

  describe('freematica_update_personal_nota (enableWrites=true)', () => {
    it('fetches current then PUTs merged', async () => {
      const current = { PERNOT_TIPO: 'OBS', PERNOT_DES: 'Old desc' };
      const idReg = 'NOTA001==';

      nock(BASE_URL)
        .get(`/pers/v2/personal-notas/${encodeURIComponent(idReg)}`)
        .reply(200, listEnv([current], 1));

      nock(BASE_URL)
        .put(`/pers/v2/personal-notas/${encodeURIComponent(idReg)}`, (body) => {
          return body.PERNOT_TIPO === 'OBS' && body.PERNOT_DES === 'New desc';
        })
        .reply(200, okEnv({ ...current, PERNOT_DES: 'New desc' }));

      const handler = getHandler(buildServer(true), 'freematica_update_personal_nota');
      const result = (await handler({ idReg, descripcion: 'New desc' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_personal_tramo
  // =========================================================================

  describe('freematica_create_personal_tramo (enableWrites=true)', () => {
    it('posts PERHH_* body correctly', async () => {
      const created = { PERHH_COD_HH: 'H01', PERHH_FEC_INI: '2026-01-01' };
      nock(BASE_URL)
        .post('/pers/v1/personal_tramos', (body) => {
          return body.PERHH_COD_HH === 'H01' && body.PERHH_FEC_INI === '2026-01-01';
        })
        .reply(200, okEnv(created));

      const handler = getHandler(buildServer(true), 'freematica_create_personal_tramo');
      const result = (await handler({
        codHorario: 'H01',
        fechaInicio: '2026-01-01',
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_cpd_gestion
  // =========================================================================

  describe('freematica_update_cpd_gestion (enableWrites=true)', () => {
    it('sends correct gestion body to PUT endpoint', async () => {
      const idReg = 'CPD001==';
      nock(BASE_URL)
        .put(`/pers/v1/cpd/${encodeURIComponent(idReg)}/gestion`, (body) => {
          return body.accionCpd === 'APROBAR' && body.fechaGestion === '2026-08-01';
        })
        .reply(200, okEnv({ success: true }));

      const handler = getHandler(buildServer(true), 'freematica_update_cpd_gestion');
      const result = (await handler({
        idReg,
        accionCpd: 'APROBAR',
        fechaGestion: '2026-08-01',
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
    });

    it('returns error when API rejects', async () => {
      const idReg = 'CPD999==';
      nock(BASE_URL)
        .put(`/pers/v1/cpd/${encodeURIComponent(idReg)}/gestion`)
        .reply(200, { errorCode: '500', errorMessage: 'Error interno', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_cpd_gestion');
      const result = (await handler({
        idReg,
        accionCpd: 'RECHAZAR',
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_personal_irpf
  // =========================================================================

  describe('freematica_create_personal_irpf (enableWrites=true)', () => {
    it('posts camposAdicionales as body', async () => {
      nock(BASE_URL)
        .post('/pers/v2/personal_irpf', (body) => {
          return body.IRPF_TIPO === 'G' && body.IRPF_PERSO === 'P001';
        })
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_personal_irpf');
      const result = (await handler({
        camposAdicionales: { IRPF_TIPO: 'G', IRPF_PERSO: 'P001' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_preventor
  // =========================================================================

  describe('freematica_update_preventor (enableWrites=true)', () => {
    it('sends PUT to /pers/v1/control/preventor', async () => {
      nock(BASE_URL)
        .put('/pers/v1/control/preventor', (body) => {
          return body.PREV_ESTADO === 'ACTIVO';
        })
        .reply(200, okEnv({ updated: true }));

      const handler = getHandler(buildServer(true), 'freematica_update_preventor');
      const result = (await handler({
        camposAdicionales: { PREV_ESTADO: 'ACTIVO' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_preventor_estado
  // =========================================================================

  describe('freematica_update_preventor_estado (enableWrites=true)', () => {
    it('sends POST to /pers/v2/preventor/actualizar-estado', async () => {
      nock(BASE_URL)
        .post('/pers/v2/preventor/actualizar-estado')
        .reply(200, okEnv({ ok: true }));

      const handler = getHandler(buildServer(true), 'freematica_update_preventor_estado');
      const result = (await handler({})) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_incidencia_base
  // =========================================================================

  describe('freematica_create_incidencia_base (enableWrites=true)', () => {
    it('posts empty body when no camposAdicionales', async () => {
      nock(BASE_URL)
        .post('/pers/v2/incidencias-base', {})
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_incidencia_base');
      const result = (await handler({})) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_personal_contrato
  // =========================================================================

  describe('freematica_create_personal_contrato (enableWrites=true)', () => {
    it('maps PERCTRAB_* fields correctly', async () => {
      nock(BASE_URL)
        .post('/pers/v1/personal_contratos', (body) => {
          return body.PERCTRAB_TIPO === 'I' && body.PERCTRAB_FEC_INI === '2026-01-01';
        })
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_personal_contrato');
      const result = (await handler({
        tipoContrato: 'I',
        fechaInicio: '2026-01-01',
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // freematica_list_calendario_personal + get
  // =========================================================================

  describe('freematica_list_calendario_personal', () => {
    it('returns paginated calendar entries', async () => {
      const fake = [{ CAL_TIPO: 'VACACIONES', CAL_FECHA: '2026-08-01' }];
      nock(BASE_URL)
        .get('/pers/v2/personal-cal')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 30));

      const handler = getHandler(buildServer(), 'freematica_list_calendario_personal');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).items).toEqual(fake);
    });
  });

  describe('freematica_get_calendario_personal', () => {
    it('returns calendar entry detail', async () => {
      const fake = { CAL_TIPO: 'PERMISO', CAL_FECHA: '2026-07-04' };
      nock(BASE_URL)
        .get('/pers/v2/personal-cal/CAL001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_calendario_personal');
      const result = (await handler({ id: 'CAL001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found for bad id', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal-cal/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_calendario_personal');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_personal_identificacion — error path
  // =========================================================================

  describe('freematica_list_personal_identificacion', () => {
    it('returns paginated identificacion results', async () => {
      const fake = [{ IDENT_TIPO: 'DNI', IDENT_NUM: '12345678A' }];
      nock(BASE_URL)
        .get('/pers/v2/personal-identificacion')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 3));

      const handler = getHandler(buildServer(), 'freematica_list_personal_identificacion');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(3);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal-identificacion')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_identificacion');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  // =========================================================================
  // freematica_list_personal_experiencias + get
  // =========================================================================

  describe('freematica_list_personal_experiencias', () => {
    it('returns paginated experiencias without filter', async () => {
      const fake = [{ PEREX_DES: 'Técnico', PEREX_EMPRESA: 'Empresa S.A.' }];
      nock(BASE_URL)
        .get('/pers/v1/personal-experiencias')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 5));

      const handler = getHandler(buildServer(), 'freematica_list_personal_experiencias');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).items).toEqual(fake);
    });

    it('sends idReg filter as query param', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal-experiencias')
        .query({ items: '10', page: '1', idReg: 'PERS001==' })
        .reply(200, listEnv([], 0));

      const handler = getHandler(buildServer(), 'freematica_list_personal_experiencias');
      const result = (await handler({ page: 1, items: 10, idReg: 'PERS001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal-experiencias')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Boom', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_experiencias');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  describe('freematica_get_personal_experiencia', () => {
    it('returns experiencia detail', async () => {
      const fake = { PEREX_DES: 'Programador', PEREX_FECHA: '2020-01-01' };
      nock(BASE_URL)
        .get('/pers/v1/personal-experiencias/EXP001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_personal_experiencia');
      const result = (await handler({ id: 'EXP001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found for missing id', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal-experiencias/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_personal_experiencia');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_personal_formaciones + get
  // =========================================================================

  describe('freematica_list_personal_formaciones', () => {
    it('returns paginated formaciones', async () => {
      const fake = [{ FORM_TIPO: 'FP', FORM_TITULO: 'Ciclo Formativo' }];
      nock(BASE_URL)
        .get('/pers/v1/personal-formaciones')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 12));

      const handler = getHandler(buildServer(), 'freematica_list_personal_formaciones');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).total).toBe(12);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal-formaciones')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_formaciones');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_personal_formacion', () => {
    it('returns formacion detail', async () => {
      const fake = { FORM_TIPO: 'UNIV', FORM_TITULO: 'Ingeniería' };
      nock(BASE_URL)
        .get('/pers/v1/personal-formaciones/FORM001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_personal_formacion');
      const result = (await handler({ id: 'FORM001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found for bad id', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal-formaciones/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_personal_formacion');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_get_personal_tramo — error path
  // =========================================================================

  describe('freematica_get_personal_tramo', () => {
    it('returns tramo detail', async () => {
      const fake = { PERHH_COD_HH: 'H02', PERHH_FEC_INI: '2025-01-01' };
      nock(BASE_URL)
        .get('/pers/v1/personal_tramos/TRAM001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_personal_tramo');
      const result = (await handler({ id: 'TRAM001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found for bad id', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal_tramos/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_personal_tramo');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_personal_tramos_sync — error path
  // =========================================================================

  describe('freematica_list_personal_tramos_sync — error path', () => {
    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal/tramos')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Boom', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_tramos_sync');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  // =========================================================================
  // freematica_get_personal_tramo_v2
  // =========================================================================

  describe('freematica_get_personal_tramo_v2', () => {
    it('returns tramo v2 detail', async () => {
      const fake = { PERHH_COD_HH: 'H03', PERHH_FEC_INI: '2026-01-01' };
      nock(BASE_URL)
        .get('/pers/v2/personal/tramos/TRAMV2%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_personal_tramo_v2');
      const result = (await handler({ id: 'TRAMV2==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found for bad id', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal/tramos/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_personal_tramo_v2');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_personal_pago + get
  // =========================================================================

  describe('freematica_list_personal_pago', () => {
    it('returns paginated pago list', async () => {
      const fake = [{ PAGO_IBAN: 'ES1234567890', PAGO_BANCO: 'BANCO' }];
      nock(BASE_URL)
        .get('/pers/v1/personal_pago')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 8));

      const handler = getHandler(buildServer(), 'freematica_list_personal_pago');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).items).toEqual(fake);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal_pago')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_pago');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_personal_pago', () => {
    it('returns pago detail', async () => {
      const fake = { PAGO_IBAN: 'ES9876543210' };
      nock(BASE_URL)
        .get('/pers/v1/personal_pago/PAGO001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_personal_pago');
      const result = (await handler({ id: 'PAGO001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found for bad id', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal_pago/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_personal_pago');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_personal_adicionales — error path
  // =========================================================================

  describe('freematica_list_personal_adicionales', () => {
    it('returns paginated adicionales', async () => {
      const fake = [{ VSSPERA_COD: 'EXTRA1', VSSPERA_TEXTO: 'Valor extra' }];
      nock(BASE_URL)
        .get('/pers/v2/personal-adicionales')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 4));

      const handler = getHandler(buildServer(), 'freematica_list_personal_adicionales');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).items).toEqual(fake);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal-adicionales')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_adicionales');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // freematica_list_personal_prorroga + get
  // =========================================================================

  describe('freematica_list_personal_prorroga', () => {
    it('returns paginated prorrogas', async () => {
      const fake = [{ PROR_TIPO: 'A', PROR_FCH: '2026-01-01' }];
      nock(BASE_URL)
        .get('/pers/v1/personal-prorroga')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 2));

      const handler = getHandler(buildServer(), 'freematica_list_personal_prorroga');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).total).toBe(2);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal-prorroga')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_prorroga');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_personal_prorroga', () => {
    it('returns prorroga detail', async () => {
      const fake = { PROR_TIPO: 'B', PROR_FCH: '2026-06-01' };
      nock(BASE_URL)
        .get('/pers/v1/personal-prorroga/PROR001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_personal_prorroga');
      const result = (await handler({ id: 'PROR001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found for bad id', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal-prorroga/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_personal_prorroga');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_incidencias_personal — error path
  // =========================================================================

  describe('freematica_list_incidencias_personal', () => {
    it('returns paginated incidencias', async () => {
      const fake = [{ INC_TIPO: 'BAJA', INC_FECHA: '2026-03-01' }];
      nock(BASE_URL)
        .get('/pers/v2/incidencias')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 6));

      const handler = getHandler(buildServer(), 'freematica_list_incidencias_personal');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).items).toEqual(fake);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/incidencias')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_incidencias_personal');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // freematica_get_agenda_persona
  // =========================================================================

  describe('freematica_get_agenda_persona', () => {
    it('returns agenda without idReg filter', async () => {
      const fake = [{ AGENDA_TIPO: 'REUNION', AGENDA_FECHA: '2026-08-15' }];
      nock(BASE_URL)
        .get('/pers/v1/agenda-persona')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 3));

      const handler = getHandler(buildServer(), 'freematica_get_agenda_persona');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).items).toEqual(fake);
    });

    it('sends idReg as query param', async () => {
      nock(BASE_URL)
        .get('/pers/v1/agenda-persona')
        .query({ items: '10', page: '1', idReg: 'PERS001==' })
        .reply(200, listEnv([], 0));

      const handler = getHandler(buildServer(), 'freematica_get_agenda_persona');
      const result = (await handler({ page: 1, items: 10, idReg: 'PERS001==' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v1/agenda-persona')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_agenda_persona');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // freematica_list_equipamiento_ficha_seguridad — error path
  // =========================================================================

  describe('freematica_list_equipamiento_ficha_seguridad', () => {
    it('returns paginated equipamiento', async () => {
      const fake = [{ EQ_TIPO: 'CASCO', EQ_REFERENCIA: 'REF001' }];
      nock(BASE_URL)
        .get('/pers/v2/equipamiento-ficha-seguridad')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 10));

      const handler = getHandler(buildServer(), 'freematica_list_equipamiento_ficha_seguridad');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).items).toEqual(fake);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/equipamiento-ficha-seguridad')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_equipamiento_ficha_seguridad');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // freematica_get_anticipo_personal — error path
  // =========================================================================

  describe('freematica_get_anticipo_personal', () => {
    it('returns anticipo detail', async () => {
      const fake = { ANT_IMPORTE: '1000', ANT_FECHA: '2026-07-01' };
      nock(BASE_URL)
        .get('/pers/v2/personal/anticipos/ANT001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_anticipo_personal');
      const result = (await handler({ id: 'ANT001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found for bad id', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal/anticipos/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_anticipo_personal');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_cpd_firmados_vid — error path
  // =========================================================================

  describe('freematica_list_cpd_firmados_vid', () => {
    it('returns paginated firmados-vid', async () => {
      const fake = [{ CPD_VID: '123', CPD_FECHA: '2026-04-01' }];
      nock(BASE_URL)
        .get('/pers/v1/cpd/firmados-vid')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 15));

      const handler = getHandler(buildServer(), 'freematica_list_cpd_firmados_vid');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).total).toBe(15);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v1/cpd/firmados-vid')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_cpd_firmados_vid');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // freematica_get_cpd — error path
  // =========================================================================

  describe('freematica_get_cpd', () => {
    it('returns cpd detail', async () => {
      const fake = { CPD_TIPO: 'CONTRATO', CPD_ESTADO: 'FIRMADO' };
      nock(BASE_URL)
        .get('/pers/v1/cpd/CPD002%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_cpd');
      const result = (await handler({ id: 'CPD002==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found for bad id', async () => {
      nock(BASE_URL)
        .get('/pers/v1/cpd/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_cpd');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_personal_irpf + get
  // =========================================================================

  describe('freematica_list_personal_irpf', () => {
    it('returns paginated irpf list', async () => {
      const fake = [{ IRPF_TIPO: 'G', IRPF_RET: '15' }];
      nock(BASE_URL)
        .get('/pers/v2/personal_irpf')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 50));

      const handler = getHandler(buildServer(), 'freematica_list_personal_irpf');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).items).toEqual(fake);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal_irpf')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_irpf');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_personal_irpf', () => {
    it('returns irpf detail', async () => {
      const fake = { IRPF_TIPO: 'G', IRPF_NUM_DESC: '2' };
      nock(BASE_URL)
        .get('/pers/v2/personal_irpf/IRPF001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_personal_irpf');
      const result = (await handler({ id: 'IRPF001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found for bad id', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal_irpf/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_personal_irpf');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_sesiones_formacion + get
  // =========================================================================

  describe('freematica_list_sesiones_formacion', () => {
    it('returns paginated sesiones formacion', async () => {
      const fake = [{ SES_TIPO: 'PRESENCIAL', SES_FECHA: '2026-05-10' }];
      nock(BASE_URL)
        .get('/pers/v1/sesiones-formacion')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 9));

      const handler = getHandler(buildServer(), 'freematica_list_sesiones_formacion');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).total).toBe(9);
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v1/sesiones-formacion')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_sesiones_formacion');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  describe('freematica_get_sesion_formacion', () => {
    it('returns sesion detail', async () => {
      const fake = { SES_TIPO: 'ONLINE', SES_DURACION: '8' };
      nock(BASE_URL)
        .get('/pers/v1/sesiones-formacion/SES001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const handler = getHandler(buildServer(), 'freematica_get_sesion_formacion');
      const result = (await handler({ id: 'SES001==' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(fake);
    });

    it('returns not_found for bad id', async () => {
      nock(BASE_URL)
        .get('/pers/v1/sesiones-formacion/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_sesion_formacion');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_personal_identificacion
  // =========================================================================

  describe('freematica_create_personal_identificacion (enableWrites=true)', () => {
    it('posts to /pers/v1/personal-identificacion/{idReg}', async () => {
      const idReg = 'PERS001==';
      nock(BASE_URL)
        .post(`/pers/v1/personal-identificacion/${encodeURIComponent(idReg)}`)
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_personal_identificacion');
      const result = (await handler({
        idReg,
        camposAdicionales: { IDENT_TIPO: 'DNI', IDENT_NUM: '12345678A' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual({ created: true });
    });

    it('returns server_error on 500', async () => {
      const idReg = 'PERS999==';
      nock(BASE_URL)
        .post(`/pers/v1/personal-identificacion/${encodeURIComponent(idReg)}`)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_create_personal_identificacion');
      const result = (await handler({ idReg })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_personal_experiencia
  // =========================================================================

  describe('freematica_create_personal_experiencia (enableWrites=true)', () => {
    it('posts PEREX_* body to /pers/v2/personal-experiencia', async () => {
      nock(BASE_URL)
        .post('/pers/v2/personal-experiencia', (body) => {
          return body.PEREX_DES === 'Analista' && body.PEREX_FECHA === '2020-03-01';
        })
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_personal_experiencia');
      const result = (await handler({
        descripcion: 'Analista',
        fecha: '2020-03-01',
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .post('/pers/v2/personal-experiencia')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_create_personal_experiencia');
      const result = (await handler({})) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_personal_formacion
  // =========================================================================

  describe('freematica_create_personal_formacion (enableWrites=true)', () => {
    it('posts camposAdicionales to /pers/v2/personal-formaciones', async () => {
      nock(BASE_URL)
        .post('/pers/v2/personal-formaciones', (body) => {
          return body.FORM_TITULO === 'FP Superior';
        })
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_personal_formacion');
      const result = (await handler({
        camposAdicionales: { FORM_TITULO: 'FP Superior' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_personal_formacion
  // =========================================================================

  describe('freematica_update_personal_formacion (enableWrites=true)', () => {
    it('fetches current formacion then PUTs merged', async () => {
      const current = { FORM_TITULO: 'FP Básico' };
      const idReg = 'FORM001==';

      nock(BASE_URL)
        .get(`/pers/v1/personal-formaciones/${encodeURIComponent(idReg)}`)
        .reply(200, listEnv([current], 1));

      nock(BASE_URL)
        .put(`/pers/v2/personal-formaciones/${encodeURIComponent(idReg)}`, (body) => {
          return body.FORM_TITULO === 'FP Básico' && body.FORM_NIVEL === 'B';
        })
        .reply(200, okEnv({ ...current, FORM_NIVEL: 'B' }));

      const handler = getHandler(buildServer(true), 'freematica_update_personal_formacion');
      const result = (await handler({
        idReg,
        camposAdicionales: { FORM_NIVEL: 'B' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns not_found when formacion does not exist', async () => {
      const idReg = 'NOTEXIST==';
      nock(BASE_URL)
        .get(`/pers/v1/personal-formaciones/${encodeURIComponent(idReg)}`)
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_personal_formacion');
      const result = (await handler({ idReg })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_incidencia_base_fecha_fin
  // =========================================================================

  describe('freematica_update_incidencia_base_fecha_fin (enableWrites=true)', () => {
    it('sends PUT to /pers/v2/incidencias-base/{idReg}', async () => {
      const idReg = 'INC001==';
      nock(BASE_URL)
        .put(`/pers/v2/incidencias-base/${encodeURIComponent(idReg)}`, (body) => {
          return body.FECHA_FIN === '2026-07-31';
        })
        .reply(200, okEnv({ updated: true }));

      const handler = getHandler(buildServer(true), 'freematica_update_incidencia_base_fecha_fin');
      const result = (await handler({
        idReg,
        camposAdicionales: { FECHA_FIN: '2026-07-31' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500', async () => {
      const idReg = 'INC999==';
      nock(BASE_URL)
        .put(`/pers/v2/incidencias-base/${encodeURIComponent(idReg)}`)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_incidencia_base_fecha_fin');
      const result = (await handler({ idReg })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_personal_pago
  // =========================================================================

  describe('freematica_create_personal_pago (enableWrites=true)', () => {
    it('posts to /pers/v1/personal_pago', async () => {
      nock(BASE_URL)
        .post('/pers/v1/personal_pago', (body) => {
          return body.IBAN === 'ES1234';
        })
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_personal_pago');
      const result = (await handler({
        camposAdicionales: { IBAN: 'ES1234' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('posts empty body when no camposAdicionales', async () => {
      nock(BASE_URL)
        .post('/pers/v1/personal_pago', {})
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_personal_pago');
      const result = (await handler({})) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_personal_pago
  // =========================================================================

  describe('freematica_update_personal_pago (enableWrites=true)', () => {
    it('fetches current pago then PUTs merged', async () => {
      const current = { PAGO_IBAN: 'ES0000' };
      const idReg = 'PAGO001==';

      nock(BASE_URL)
        .get(`/pers/v1/personal_pago/${encodeURIComponent(idReg)}`)
        .reply(200, listEnv([current], 1));

      nock(BASE_URL)
        .put(`/pers/v1/personal_pago/${encodeURIComponent(idReg)}`)
        .reply(200, okEnv({ ...current, PAGO_BANCO: 'CAIXA' }));

      const handler = getHandler(buildServer(true), 'freematica_update_personal_pago');
      const result = (await handler({
        idReg,
        camposAdicionales: { PAGO_BANCO: 'CAIXA' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns not_found when pago does not exist', async () => {
      const idReg = 'NOTEXIST==';
      nock(BASE_URL)
        .get(`/pers/v1/personal_pago/${encodeURIComponent(idReg)}`)
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_personal_pago');
      const result = (await handler({ idReg })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_personal_tramo
  // =========================================================================

  describe('freematica_update_personal_tramo (enableWrites=true)', () => {
    it('fetches current tramo then PUTs merged', async () => {
      const current = { PERHH_COD_HH: 'H01', PERHH_JORNADA: 100 };
      const idReg = 'TRAM001==';

      nock(BASE_URL)
        .get(`/pers/v1/personal_tramos/${encodeURIComponent(idReg)}`)
        .reply(200, listEnv([current], 1));

      nock(BASE_URL)
        .put(`/pers/v1/personal_tramos/${encodeURIComponent(idReg)}`, (body) => {
          return body.PERHH_COD_HH === 'H01' && body.PERHH_JORNADA === 80;
        })
        .reply(200, okEnv({ ...current, PERHH_JORNADA: 80 }));

      const handler = getHandler(buildServer(true), 'freematica_update_personal_tramo');
      const result = (await handler({ idReg, jornada: 80 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns not_found when tramo does not exist', async () => {
      const idReg = 'NOTEXIST==';
      nock(BASE_URL)
        .get(`/pers/v1/personal_tramos/${encodeURIComponent(idReg)}`)
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_personal_tramo');
      const result = (await handler({ idReg })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_personal_contrato
  // =========================================================================

  describe('freematica_update_personal_contrato (enableWrites=true)', () => {
    it('fetches current contrato then PUTs merged', async () => {
      const current = { PERCTRAB_TIPO: 'I', PERCTRAB_FEC_INI: '2024-01-01' };
      const idReg = 'CTRAB001==';

      nock(BASE_URL)
        .get(`/pers/v1/personal_contratos/${encodeURIComponent(idReg)}`)
        .reply(200, listEnv([current], 1));

      nock(BASE_URL)
        .put(`/pers/v1/personal_contratos/${encodeURIComponent(idReg)}`, (body) => {
          return body.PERCTRAB_TIPO === 'I' && body.PERCTRAB_FEC_FIN === '2026-12-31';
        })
        .reply(200, okEnv({ ...current, PERCTRAB_FEC_FIN: '2026-12-31' }));

      const handler = getHandler(buildServer(true), 'freematica_update_personal_contrato');
      const result = (await handler({ idReg, fechaFin: '2026-12-31' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });

    it('returns not_found when contrato does not exist', async () => {
      const idReg = 'NOTEXIST==';
      nock(BASE_URL)
        .get(`/pers/v1/personal_contratos/${encodeURIComponent(idReg)}`)
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_personal_contrato');
      const result = (await handler({ idReg })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_personal_adicional
  // =========================================================================

  describe('freematica_create_personal_adicional (enableWrites=true)', () => {
    it('posts VSSPERA_* body to /pers/v2/personal-adicionales', async () => {
      nock(BASE_URL)
        .post('/pers/v2/personal-adicionales', (body) => {
          return body.VSSPERA_COD === 'EXTRA1' && body.VSSPERA_TEXTO === 'Valor';
        })
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_personal_adicional');
      const result = (await handler({
        codCampo: 'EXTRA1',
        texto: 'Valor',
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .post('/pers/v2/personal-adicionales')
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_create_personal_adicional');
      const result = (await handler({})) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_personal_adicional
  // =========================================================================

  describe('freematica_update_personal_adicional (enableWrites=true)', () => {
    it('sends PUT with only changed fields (no GET first)', async () => {
      const idReg = 'ADIC001==';
      nock(BASE_URL)
        .put(`/pers/v2/personal-adicionales/${encodeURIComponent(idReg)}`, (body) => {
          return body.VSSPERA_TEXTO === 'Nuevo valor';
        })
        .reply(200, okEnv({ updated: true }));

      const handler = getHandler(buildServer(true), 'freematica_update_personal_adicional');
      const result = (await handler({ idReg, texto: 'Nuevo valor' })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_anticipo_personal
  // =========================================================================

  describe('freematica_create_anticipo_personal (enableWrites=true)', () => {
    it('posts to /pers/v2/personal/anticipos', async () => {
      nock(BASE_URL)
        .post('/pers/v2/personal/anticipos', (body) => {
          return body.ANT_IMPORTE === 500;
        })
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_anticipo_personal');
      const result = (await handler({
        camposAdicionales: { ANT_IMPORTE: 500 },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('posts empty body when no camposAdicionales', async () => {
      nock(BASE_URL)
        .post('/pers/v2/personal/anticipos', {})
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_anticipo_personal');
      const result = (await handler({})) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_calendario_personal
  // =========================================================================

  describe('freematica_create_calendario_personal (enableWrites=true)', () => {
    it('posts to /pers/v2/personal-cal', async () => {
      nock(BASE_URL)
        .post('/pers/v2/personal-cal', (body) => {
          return body.CAL_TIPO === 'VACACIONES';
        })
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_calendario_personal');
      const result = (await handler({
        camposAdicionales: { CAL_TIPO: 'VACACIONES' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_calendario_personal
  // =========================================================================

  describe('freematica_update_calendario_personal (enableWrites=true)', () => {
    it('fetches current entry then PUTs merged', async () => {
      const current = { CAL_TIPO: 'PERMISO', CAL_FECHA: '2026-07-04' };
      const idReg = 'CAL001==';

      nock(BASE_URL)
        .get(`/pers/v2/personal-cal/${encodeURIComponent(idReg)}`)
        .reply(200, listEnv([current], 1));

      nock(BASE_URL)
        .put(`/pers/v2/personal-cal/${encodeURIComponent(idReg)}`)
        .reply(200, okEnv({ ...current, CAL_DIAS: 2 }));

      const handler = getHandler(buildServer(true), 'freematica_update_calendario_personal');
      const result = (await handler({
        idReg,
        camposAdicionales: { CAL_DIAS: 2 },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns not_found when entry does not exist', async () => {
      const idReg = 'NOTEXIST==';
      nock(BASE_URL)
        .get(`/pers/v2/personal-cal/${encodeURIComponent(idReg)}`)
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_calendario_personal');
      const result = (await handler({ idReg })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_cpd_bulk
  // =========================================================================

  describe('freematica_update_cpd_bulk (enableWrites=true)', () => {
    it('posts to /pers/v1/cpd/actualizar', async () => {
      nock(BASE_URL)
        .post('/pers/v1/cpd/actualizar', (body) => {
          return body.CPD_ACCION === 'APROBAR';
        })
        .reply(200, okEnv({ updated: true }));

      const handler = getHandler(buildServer(true), 'freematica_update_cpd_bulk');
      const result = (await handler({
        camposAdicionales: { CPD_ACCION: 'APROBAR' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('posts empty body when no camposAdicionales', async () => {
      nock(BASE_URL)
        .post('/pers/v1/cpd/actualizar', {})
        .reply(200, okEnv({ updated: true }));

      const handler = getHandler(buildServer(true), 'freematica_update_cpd_bulk');
      const result = (await handler({})) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_personal_irpf
  // =========================================================================

  describe('freematica_update_personal_irpf (enableWrites=true)', () => {
    it('fetches current IRPF then PUTs merged', async () => {
      const current = { IRPF_TIPO: 'G', IRPF_RET: '15' };
      const idReg = 'IRPF001==';

      nock(BASE_URL)
        .get(`/pers/v2/personal_irpf/${encodeURIComponent(idReg)}`)
        .reply(200, listEnv([current], 1));

      nock(BASE_URL)
        .put(`/pers/v2/personal_irpf/${encodeURIComponent(idReg)}`)
        .reply(200, okEnv({ ...current, IRPF_RET: '20' }));

      const handler = getHandler(buildServer(true), 'freematica_update_personal_irpf');
      const result = (await handler({
        idReg,
        camposAdicionales: { IRPF_RET: '20' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns not_found when IRPF record not found', async () => {
      const idReg = 'NOTEXIST==';
      nock(BASE_URL)
        .get(`/pers/v2/personal_irpf/${encodeURIComponent(idReg)}`)
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_personal_irpf');
      const result = (await handler({ idReg })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_create_personal_irpf_ad
  // =========================================================================

  describe('freematica_create_personal_irpf_ad (enableWrites=true)', () => {
    it('posts to /pers/v2/personal_irpf_ad/{idReg}', async () => {
      const idReg = 'IRPF001==';
      nock(BASE_URL)
        .post(`/pers/v2/personal_irpf_ad/${encodeURIComponent(idReg)}`, (body) => {
          return body.IRPFAD_CAMPO === 'DESC_FAMILIAR';
        })
        .reply(200, okEnv({ created: true }));

      const handler = getHandler(buildServer(true), 'freematica_create_personal_irpf_ad');
      const result = (await handler({
        idReg,
        camposAdicionales: { IRPFAD_CAMPO: 'DESC_FAMILIAR' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500', async () => {
      const idReg = 'IRPF999==';
      nock(BASE_URL)
        .post(`/pers/v2/personal_irpf_ad/${encodeURIComponent(idReg)}`)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_create_personal_irpf_ad');
      const result = (await handler({ idReg })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // WRITE TOOLS — freematica_update_personal_irpf_ad
  // =========================================================================

  describe('freematica_update_personal_irpf_ad (enableWrites=true)', () => {
    it('sends PUT to /pers/v2/personal_irpf_ad/{idReg}', async () => {
      const idReg = 'IRPFAD001==';
      nock(BASE_URL)
        .put(`/pers/v2/personal_irpf_ad/${encodeURIComponent(idReg)}`, (body) => {
          return body.IRPFAD_VALOR === '1';
        })
        .reply(200, okEnv({ updated: true }));

      const handler = getHandler(buildServer(true), 'freematica_update_personal_irpf_ad');
      const result = (await handler({
        idReg,
        camposAdicionales: { IRPFAD_VALOR: '1' },
      })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });

    it('returns server_error on 500', async () => {
      const idReg = 'IRPFAD999==';
      nock(BASE_URL)
        .put(`/pers/v2/personal_irpf_ad/${encodeURIComponent(idReg)}`)
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_personal_irpf_ad');
      const result = (await handler({ idReg })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // LIST tools — error path for tools covering list_personal_contratos
  // =========================================================================

  describe('freematica_list_personal_contratos — error path', () => {
    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal_contratos')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_contratos');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // freematica_get_personal_contrato — error path
  // =========================================================================

  describe('freematica_get_personal_contrato — error path', () => {
    it('returns not_found for missing contrato', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal_contratos/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_personal_contrato');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_personal_tramos — error path
  // =========================================================================

  describe('freematica_list_personal_tramos — error path', () => {
    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal_tramos')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_personal_tramos');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // freematica_list_anticipos_personal — error path
  // =========================================================================

  describe('freematica_list_anticipos_personal — error path', () => {
    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal/anticipos')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_anticipos_personal');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // freematica_list_cpd — error path
  // =========================================================================

  describe('freematica_list_cpd — error path', () => {
    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v1/cpd')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_cpd');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // freematica_list_cpd_movimientos — error path
  // =========================================================================

  describe('freematica_list_cpd_movimientos — error path', () => {
    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v1/cpd/CPD001%3D%3D/movimientos')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_cpd_movimientos');
      const result = (await handler({ id: 'CPD001==', page: 1, items: 20 })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // freematica_list_vss_incidencias — happy path (count)
  // =========================================================================

  describe('freematica_list_vss_incidencias — detailed happy path', () => {
    it('returns correct items in response', async () => {
      const fake = [{ VSS_TIPO: 'EP', VSS_BAJA: '2026-01-10' }];
      nock(BASE_URL)
        .get('/pers/v2/vss-incidencias')
        .query({ items: '10', page: '2' })
        .reply(200, listEnv(fake, 20));

      const handler = getHandler(buildServer(), 'freematica_list_vss_incidencias');
      const result = (await handler({ page: 2, items: 10 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toEqual(fake);
      expect(parsed.total).toBe(20);
    });
  });

  // =========================================================================
  // freematica_get_vss_incidencia — error path
  // =========================================================================

  describe('freematica_get_vss_incidencia — error path', () => {
    it('returns not_found for bad id', async () => {
      nock(BASE_URL)
        .get('/pers/v2/vss-incidencias/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_vss_incidencia');
      const result = (await handler({ id: 'BADID' })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });

  // =========================================================================
  // freematica_list_calendario_personal — error path
  // =========================================================================

  describe('freematica_list_calendario_personal — error path', () => {
    it('returns server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal-cal')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

      const handler = getHandler(buildServer(), 'freematica_list_calendario_personal');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
    });
  });

  // =========================================================================
  // Error path for freematica_update_preventor — server_error
  // =========================================================================

  describe('freematica_update_preventor — error path', () => {
    it('returns server_error when API returns 500', async () => {
      nock(BASE_URL)
        .put('/pers/v1/control/preventor')
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_preventor');
      const result = (await handler({ camposAdicionales: { PREV_TIPO: 'X' } })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  // =========================================================================
  // Error path for freematica_update_preventor_estado — server_error
  // =========================================================================

  describe('freematica_update_preventor_estado — error path', () => {
    it('returns server_error when API returns 500', async () => {
      nock(BASE_URL)
        .post('/pers/v2/preventor/actualizar-estado')
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

      const handler = getHandler(buildServer(true), 'freematica_update_preventor_estado');
      const result = (await handler({ camposAdicionales: { PREV_ACCION: 'X' } })) as {
        content: { text: string }[];
        isError?: boolean;
      };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('server_error');
    });
  });

  // =========================================================================
  // freematica_list_personal_v2 — without fchmodificacion branch
  // =========================================================================

  describe('freematica_list_personal_v2 — no fchmodificacion branch', () => {
    it('works without fchmodificacion (undefined branch)', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '5', page: '2' })
        .reply(200, { errorCode: '200', errorMessage: '', data: { total: '0', items: [], rowHeight: -1 } });

      const handler = getHandler(buildServer(), 'freematica_list_personal_v2');
      const result = (await handler({ page: 2, items: 5 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBeUndefined();
    });
  });

  // =========================================================================
  // freematica_get_agenda_persona — without idReg branch already covered above,
  // add error path for completeness
  // =========================================================================

  describe('freematica_get_agenda_persona — error path', () => {
    it('returns not_found on 404', async () => {
      nock(BASE_URL)
        .get('/pers/v1/agenda-persona')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      const handler = getHandler(buildServer(), 'freematica_get_agenda_persona');
      const result = (await handler({ page: 1, items: 20 })) as { content: { text: string }[]; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('not_found');
    });
  });
});
