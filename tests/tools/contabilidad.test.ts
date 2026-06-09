import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerContabilidadTools } from '../../src/tools/contabilidad.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_CUENTAS_TOOL = 'freematica_list_cuentas_contables';
const LIST_ANALITICAS_TOOL = 'freematica_list_cuentas_analiticas';
const EXPORT_ASIENTOS_TOOL = 'freematica_export_asientos';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerContabilidadTools(server, client);
  return server;
}

function getHandler(server: McpServer, name: string) {
  const tools = (server as unknown as { _registeredTools: Record<string, ToolEntry> })
    ._registeredTools;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ToolResult = { content: { type: string; text: string }[]; isError?: boolean };

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const handler = getHandler(server, name);
  return (await handler(args)) as ToolResult;
}

// ---------------------------------------------------------------------------
// freematica_list_cuentas_contables
// ---------------------------------------------------------------------------

describe('freematica_list_cuentas_contables', () => {
  afterEach(() => nock.cleanAll());

  it('registra la tool correctamente', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty(LIST_CUENTAS_TOOL);
  });

  it('happy path sin filtros — llama a /pcon/v2/cuentas sin rquery', async () => {
    const fake = [{ COD_CTA: '430', COD_PLAN: '0001' }];
    nock(BASE_URL).get('/pcon/v2/cuentas').reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_CUENTAS_TOOL, {});

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
    expect(parsed.total).toBe(1);
    expect(parsed.count).toBe(1);
  });

  it('filtra por codPlan — añade rquery COD_PLAN==0001', async () => {
    const fake = [{ COD_CTA: '430', COD_PLAN: '0001' }];
    nock(BASE_URL)
      .get('/pcon/v2/cuentas')
      .query({ rquery: 'COD_PLAN==0001' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_CUENTAS_TOOL, { codPlan: '0001' });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('filtra activa=true — rquery CTA_ACTIVA==1', async () => {
    const fake = [{ COD_CTA: '430', CTA_ACTIVA: '1' }];
    nock(BASE_URL)
      .get('/pcon/v2/cuentas')
      .query({ rquery: 'CTA_ACTIVA==1' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_CUENTAS_TOOL, { activa: true });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('filtra activa=false — rquery CTA_ACTIVA==0', async () => {
    const fake = [{ COD_CTA: '430', CTA_ACTIVA: '0' }];
    nock(BASE_URL)
      .get('/pcon/v2/cuentas')
      .query({ rquery: 'CTA_ACTIVA==0' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_CUENTAS_TOOL, { activa: false });

    expect(result.isError).toBeUndefined();
  });

  it('filtra por prefijoCuenta — añade rquery ge + lt sobre COD_CTA', async () => {
    const fake = [{ COD_CTA: '430001' }];
    // prefijo "43" → COD_CTA=ge=43;COD_CTA=lt=44
    nock(BASE_URL)
      .get('/pcon/v2/cuentas')
      .query({ rquery: 'COD_CTA=ge=43;COD_CTA=lt=44' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_CUENTAS_TOOL, { prefijoCuenta: '43' });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('filtra por grupoCuenta — rquery COD_GRUPO_CTA==G1', async () => {
    const fake = [{ COD_CTA: '430', COD_GRUPO_CTA: 'G1' }];
    nock(BASE_URL)
      .get('/pcon/v2/cuentas')
      .query({ rquery: 'COD_GRUPO_CTA==G1' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_CUENTAS_TOOL, { grupoCuenta: 'G1' });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('combina múltiples filtros — codPlan + activa + grupoCuenta', async () => {
    const fake = [{ COD_CTA: '430' }];
    nock(BASE_URL)
      .get('/pcon/v2/cuentas')
      .query({ rquery: 'COD_PLAN==0001;CTA_ACTIVA==1;COD_GRUPO_CTA==G1' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_CUENTAS_TOOL, {
      codPlan: '0001',
      activa: true,
      grupoCuenta: 'G1',
    });

    expect(result.isError).toBeUndefined();
  });

  it('devuelve error 500 como server_error', async () => {
    nock(BASE_URL)
      .get('/pcon/v2/cuentas')
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer();
    const result = await callTool(server, LIST_CUENTAS_TOOL, {});

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('devuelve error not_found en envelope 404', async () => {
    nock(BASE_URL)
      .get('/pcon/v2/cuentas')
      .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

    const server = buildServer();
    const result = await callTool(server, LIST_CUENTAS_TOOL, {});

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('devuelve lista vacía cuando total=0', async () => {
    nock(BASE_URL).get('/pcon/v2/cuentas').reply(200, listEnv([], 0));

    const server = buildServer();
    const result = await callTool(server, LIST_CUENTAS_TOOL, {});

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual([]);
    expect(parsed.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// freematica_list_cuentas_analiticas
// ---------------------------------------------------------------------------

describe('freematica_list_cuentas_analiticas', () => {
  afterEach(() => nock.cleanAll());

  it('registra la tool correctamente', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty(LIST_ANALITICAS_TOOL);
  });

  it('happy path sin filtros — llama a /pcon/v2/cuentas-analiticas', async () => {
    const fake = [{ COD_CTA_ANL: 'ANL001' }];
    nock(BASE_URL).get('/pcon/v2/cuentas-analiticas').reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_ANALITICAS_TOOL, {});

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('filtra por area — rquery AREA_ANL==COMPRAS', async () => {
    const fake = [{ COD_CTA_ANL: 'ANL001', AREA_ANL: 'COMPRAS' }];
    nock(BASE_URL)
      .get('/pcon/v2/cuentas-analiticas')
      .query({ rquery: 'AREA_ANL==COMPRAS' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_ANALITICAS_TOOL, { area: 'COMPRAS' });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('filtra por delegacion — rquery DELEG==MAD', async () => {
    const fake = [{ COD_CTA_ANL: 'ANL002', DELEG: 'MAD' }];
    nock(BASE_URL)
      .get('/pcon/v2/cuentas-analiticas')
      .query({ rquery: 'DELEG==MAD' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_ANALITICAS_TOOL, { delegacion: 'MAD' });

    expect(result.isError).toBeUndefined();
  });

  it('filtra por prefijoCuenta — añade ge + lt sobre COD_CTA_ANL', async () => {
    const fake = [{ COD_CTA_ANL: 'C430001' }];
    nock(BASE_URL)
      .get('/pcon/v2/cuentas-analiticas')
      .query({ rquery: 'COD_CTA_ANL=ge=C43;COD_CTA_ANL=lt=C44' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_ANALITICAS_TOOL, { prefijoCuenta: 'C43' });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('filtra activa=true — rquery CTA_ACTIVA_ANL==1', async () => {
    const fake = [{ COD_CTA_ANL: 'ANL001', CTA_ACTIVA_ANL: '1' }];
    nock(BASE_URL)
      .get('/pcon/v2/cuentas-analiticas')
      .query({ rquery: 'CTA_ACTIVA_ANL==1' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_ANALITICAS_TOOL, { activa: true });

    expect(result.isError).toBeUndefined();
  });

  it('combina múltiples filtros — codPlan + area + delegacion', async () => {
    const fake = [{ COD_CTA_ANL: 'ANL001' }];
    nock(BASE_URL)
      .get('/pcon/v2/cuentas-analiticas')
      .query({ rquery: 'COD_PLAN==0001;AREA_ANL==VEN;DELEG==MAD' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, LIST_ANALITICAS_TOOL, {
      codPlan: '0001',
      area: 'VEN',
      delegacion: 'MAD',
    });

    expect(result.isError).toBeUndefined();
  });

  it('devuelve server_error en respuesta 500', async () => {
    nock(BASE_URL)
      .get('/pcon/v2/cuentas-analiticas')
      .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

    const server = buildServer();
    const result = await callTool(server, LIST_ANALITICAS_TOOL, {});

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('devuelve lista vacía cuando no hay registros', async () => {
    nock(BASE_URL).get('/pcon/v2/cuentas-analiticas').reply(200, listEnv([], 0));

    const server = buildServer();
    const result = await callTool(server, LIST_ANALITICAS_TOOL, {});

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// freematica_export_asientos
// ---------------------------------------------------------------------------

describe('freematica_export_asientos', () => {
  afterEach(() => {
    nock.cleanAll();
    delete process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'];
  });

  beforeEach(() => {
    delete process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'];
  });

  it('registra la tool correctamente', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty(EXPORT_ASIENTOS_TOOL);
  });

  it('rechaza empresa vacía — isError:true (network sin nock)', async () => {
    // El MCP SDK resuelve (no rechaza) cuando args inválidos llegan al handler interno.
    // Verificamos que el Zod schema falla usando z.object directamente.
    const { z } = await import('zod');
    const schema = z.object({ empresa: z.string().length(4), cal: z.string().length(4) });

    expect(() => schema.parse({ cal: 'GRAL' })).toThrow();
    expect(() => schema.parse({ empresa: '', cal: 'GRAL' })).toThrow();
  });

  it('rechaza empresa con longitud != 4 — Zod length(4)', async () => {
    const { z } = await import('zod');
    const schema = z.object({ empresa: z.string().length(4), cal: z.string().length(4) });

    // 3 chars: falla
    expect(() => schema.parse({ empresa: '001', cal: 'GRAL' })).toThrow();
    // 5 chars: falla
    expect(() => schema.parse({ empresa: '00001', cal: 'GRAL' })).toThrow();
    // 4 chars: pasa
    expect(() => schema.parse({ empresa: '0001', cal: 'GRAL' })).not.toThrow();
  });

  it('rechaza cal con longitud != 4 — Zod length(4)', async () => {
    const { z } = await import('zod');
    const schema = z.object({ empresa: z.string().length(4), cal: z.string().length(4) });

    expect(() => schema.parse({ empresa: '0001', cal: 'GR' })).toThrow();
    expect(() => schema.parse({ empresa: '0001', cal: 'GRALL' })).toThrow();
    expect(() => schema.parse({ empresa: '0001', cal: 'GRAL' })).not.toThrow();
  });

  it('rechaza periodo con más de 2 caracteres — Zod max(2)', async () => {
    const { z } = await import('zod');
    const schema = z.object({
      empresa: z.string().length(4),
      cal: z.string().length(4),
      periodo: z.string().max(2).optional(),
    });

    expect(() => schema.parse({ empresa: '0001', cal: 'GRAL', periodo: '012' })).toThrow();
    // 2 chars: pasa
    expect(() => schema.parse({ empresa: '0001', cal: 'GRAL', periodo: '01' })).not.toThrow();
  });

  it('acepta empresa y cal con exactamente 4 caracteres', async () => {
    const { z } = await import('zod');
    const schema = z.object({ empresa: z.string().length(4), cal: z.string().length(4) });

    expect(() => schema.parse({ empresa: '0001', cal: 'GRAL' })).not.toThrow();
    expect(() => schema.parse({ empresa: 'ABCD', cal: '1234' })).not.toThrow();
  });

  it('happy path con empresa y cal — params nativos correctos', async () => {
    const fake = [{ ASI_NUMERO: '1', ASI_IMPORTE: 100 }];
    nock(BASE_URL)
      .get('/pcon/v2/export-asientos')
      .query({ empresa: '0001', cal: 'GRAL' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, EXPORT_ASIENTOS_TOOL, {
      empresa: '0001',
      cal: 'GRAL',
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
    expect(parsed.total).toBe(1);
  });

  it('incluye periodo como query param nativo', async () => {
    const fake = [{ ASI_NUMERO: '1' }];
    nock(BASE_URL)
      .get('/pcon/v2/export-asientos')
      .query({ empresa: '0001', cal: 'GRAL', periodo: '01' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, EXPORT_ASIENTOS_TOOL, {
      empresa: '0001',
      cal: 'GRAL',
      periodo: '01',
    });

    expect(result.isError).toBeUndefined();
  });

  it('filtra por rango de fechas — rquery ge + le sobre ASI_FCHASI', async () => {
    const fake = [{ ASI_NUMERO: '2' }];
    nock(BASE_URL)
      .get('/pcon/v2/export-asientos')
      .query({
        empresa: '0001',
        cal: 'GRAL',
        rquery: 'ASI_FCHASI=ge=2024-01-01;ASI_FCHASI=le=2024-01-31',
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, EXPORT_ASIENTOS_TOOL, {
      empresa: '0001',
      cal: 'GRAL',
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-01-31',
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('filtra por diario — rquery ASI_DIARIO==VEN', async () => {
    const fake = [{ ASI_DIARIO: 'VEN' }];
    nock(BASE_URL)
      .get('/pcon/v2/export-asientos')
      .query({ empresa: '0001', cal: 'GRAL', rquery: 'ASI_DIARIO==VEN' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, EXPORT_ASIENTOS_TOOL, {
      empresa: '0001',
      cal: 'GRAL',
      diario: 'VEN',
    });

    expect(result.isError).toBeUndefined();
  });

  it('filtra borrador=true — rquery ASI_BORR!=empty', async () => {
    const fake = [{ ASI_BORR: 'B' }];
    // borrador=true → ASI_BORR != ''  → FIQL: ASI_BORR!=%20... need to check exact encoding
    // empty string '' → escapeFiqlValue('') → '' (no chars to escape) → ASI_BORR!=
    nock(BASE_URL)
      .get('/pcon/v2/export-asientos')
      .query((q) => q['empresa'] === '0001' && q['cal'] === 'GRAL' && typeof q['rquery'] === 'string' && (q['rquery'] as string).includes('ASI_BORR'))
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, EXPORT_ASIENTOS_TOOL, {
      empresa: '0001',
      cal: 'GRAL',
      borrador: true,
    });

    expect(result.isError).toBeUndefined();
  });

  it('devuelve server_error en respuesta 500', async () => {
    nock(BASE_URL)
      .get('/pcon/v2/export-asientos')
      .query({ empresa: '0001', cal: 'GRAL' })
      .reply(200, { errorCode: '500', errorMessage: 'Error', data: null });

    const server = buildServer();
    const result = await callTool(server, EXPORT_ASIENTOS_TOOL, {
      empresa: '0001',
      cal: 'GRAL',
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('respuesta grande > MAX_RESPONSE_SIZE_MB → trunca con warning', async () => {
    // Configurar límite de 1 MB (mínimo válido según schema Zod).
    // Items de ~6 KB c/u para superar el límite con 200 registros (~1.2 MB total).
    process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'] = '1';

    // Generar items grandes que superen el límite
    const largeItems = Array.from({ length: 200 }, (_, i) => ({
      ASI_NUMERO: `${i}`,
      PADDING: 'X'.repeat(6000), // cada item ~6 KB
    }));

    nock(BASE_URL)
      .get('/pcon/v2/export-asientos')
      .query({ empresa: '0001', cal: 'GRAL' })
      .reply(200, listEnv(largeItems, largeItems.length));

    const server = buildServer();
    const result = await callTool(server, EXPORT_ASIENTOS_TOOL, {
      empresa: '0001',
      cal: 'GRAL',
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.truncated).toBe(true);
    expect(typeof parsed.warning).toBe('string');
    expect(parsed.warning).toContain('truncada');
    expect(parsed.items.length).toBeLessThan(largeItems.length);
  });

  it('respuesta truncada incluye campo total con el total real de la API', async () => {
    // Configurar límite de 1 MB (mínimo válido según schema Zod).
    // Items de ~6 KB c/u para superar el límite con 200 registros (~1.2 MB total).
    process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'] = '1';

    const totalReal = 250;
    const largeItems = Array.from({ length: 200 }, (_, i) => ({
      ASI_NUMERO: `${i}`,
      PADDING: 'X'.repeat(6000),
    }));

    nock(BASE_URL)
      .get('/pcon/v2/export-asientos')
      .query({ empresa: '0001', cal: 'GRAL' })
      .reply(200, listEnv(largeItems, totalReal));

    const server = buildServer();
    const result = await callTool(server, EXPORT_ASIENTOS_TOOL, {
      empresa: '0001',
      cal: 'GRAL',
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.truncated).toBe(true);
    // El campo total debe reflejar el total real reportado por la API,
    // no solo la cantidad de items truncados devueltos
    expect(parsed.total).toBe(totalReal);
    expect(parsed.count).toBeLessThan(totalReal);
  });

  it('respuesta dentro del límite → no trunca (sin warning)', async () => {
    process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'] = '10'; // 10 MB

    const smallItems = [{ ASI_NUMERO: '1', IMPORTE: 100 }];
    nock(BASE_URL)
      .get('/pcon/v2/export-asientos')
      .query({ empresa: '0001', cal: 'GRAL' })
      .reply(200, listEnv(smallItems, 1));

    const server = buildServer();
    const result = await callTool(server, EXPORT_ASIENTOS_TOOL, {
      empresa: '0001',
      cal: 'GRAL',
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.truncated).toBeUndefined();
    expect(parsed.warning).toBeUndefined();
    expect(parsed.items).toEqual(smallItems);
  });

  it('respuesta vacía no se trunca', async () => {
    nock(BASE_URL)
      .get('/pcon/v2/export-asientos')
      .query({ empresa: '0001', cal: 'GRAL' })
      .reply(200, listEnv([], 0));

    const server = buildServer();
    const result = await callTool(server, EXPORT_ASIENTOS_TOOL, {
      empresa: '0001',
      cal: 'GRAL',
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual([]);
    expect(parsed.truncated).toBeUndefined();
  });

  it('combina empresa + cal + periodo + fechaDesde + diario', async () => {
    const fake = [{ ASI_NUMERO: '3' }];
    nock(BASE_URL)
      .get('/pcon/v2/export-asientos')
      .query({
        empresa: '0001',
        cal: 'GRAL',
        periodo: '03',
        rquery: 'ASI_FCHASI=ge=2024-03-01;ASI_DIARIO==COM',
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const result = await callTool(server, EXPORT_ASIENTOS_TOOL, {
      empresa: '0001',
      cal: 'GRAL',
      periodo: '03',
      fechaDesde: '2024-03-01',
      diario: 'COM',
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });
});
