import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerAlbaranesTools } from '../../src/tools/albaranes.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_ALBARANES_VENTAS_TOOL = 'freematica_list_albaranes_ventas';
const GET_ALBARAN_VENTA_TOOL = 'freematica_get_albaran_venta';
const LIST_ALBARANES_FACTURA_TOOL = 'freematica_list_albaranes_factura';
const GET_ALBARAN_FACTURA_TOOL = 'freematica_get_albaran_factura';
const LIST_RESULTADOS_FACTURACION_TOOL = 'freematica_list_resultados_facturacion';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerAlbaranesTools(server, client);
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

// =============================================================================
// registerAlbaranesTools — registration
// =============================================================================

describe('registerAlbaranesTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('registers all 5 tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_ALBARANES_VENTAS_TOOL);
    expect(tools).toHaveProperty(GET_ALBARAN_VENTA_TOOL);
    expect(tools).toHaveProperty(LIST_ALBARANES_FACTURA_TOOL);
    expect(tools).toHaveProperty(GET_ALBARAN_FACTURA_TOOL);
    expect(tools).toHaveProperty(LIST_RESULTADOS_FACTURACION_TOOL);
  });

  // ===========================================================================
  // freematica_list_albaranes_ventas — happy paths
  // ===========================================================================

  it('list_albaranes_ventas returns items list with empresa param (native query)', async () => {
    const fake = [
      { ALVC_CODEMP: '1', ALVC_CODCLI: 'CLI001', ALVC_NUMDOC: 100 },
      { ALVC_CODEMP: '1', ALVC_CODCLI: 'CLI002', ALVC_NUMDOC: 101 },
    ];
    nock(BASE_URL)
      .get('/pven/v2/albaranes-ventas')
      .query({ items: '20', page: '1', codEmpresa: '1' })
      .reply(200, listEnv(fake, 250));

    const handler = getHandler(buildServer(), LIST_ALBARANES_VENTAS_TOOL);
    const result = (await handler({ page: 1, items: 20, empresa: '1' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: fake,
      count: 2,
      total: 250,
      page: 1,
      items_per_page: 20,
    });
  });

  it('list_albaranes_ventas passes all native query params correctly', async () => {
    const fake = [{ ALVC_CODEMP: '1', ALVC_DELEG: 'MAD', ALVC_CODCLI: 'CLI001' }];
    nock(BASE_URL)
      .get('/pven/v2/albaranes-ventas')
      .query({
        items: '10',
        page: '1',
        codEmpresa: '1',
        codDelegacion: 'MAD',
        codCliente: 'CLI001',
        codDocumento: 'ALB',
        desdeFecha: '2024-01-01',
        hastaFecha: '2024-01-31',
        order: 'ALVC_FCHDOC DESC',
      })
      .reply(200, listEnv(fake, 1));

    const handler = getHandler(buildServer(), LIST_ALBARANES_VENTAS_TOOL);
    const result = (await handler({
      page: 1,
      items: 10,
      empresa: '1',
      delegacion: 'MAD',
      codCliente: 'CLI001',
      codDocumento: 'ALB',
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-01-31',
      order: 'ALVC_FCHDOC DESC',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_albaranes_ventas only sends codEmpresa when only empresa provided', async () => {
    const fake = [{ ALVC_CODEMP: '2' }];
    nock(BASE_URL)
      .get('/pven/v2/albaranes-ventas')
      .query((q) => {
        // Should NOT have codDelegacion, codCliente, etc. — only codEmpresa + pagination
        return q['codEmpresa'] === '2' && !q['codDelegacion'] && !q['codCliente'];
      })
      .reply(200, listEnv(fake, 5));

    const handler = getHandler(buildServer(), LIST_ALBARANES_VENTAS_TOOL);
    const result = (await handler({ page: 1, items: 20, empresa: '2' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
  });

  // ===========================================================================
  // freematica_list_albaranes_ventas — error paths
  // ===========================================================================

  it('list_albaranes_ventas returns server_error on 500', async () => {
    nock(BASE_URL)
      .get('/pven/v2/albaranes-ventas')
      .query({ items: '20', page: '1', codEmpresa: '1' })
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const handler = getHandler(buildServer(), LIST_ALBARANES_VENTAS_TOOL);
    const result = (await handler({ page: 1, items: 20, empresa: '1' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('list_albaranes_ventas returns invalid_token on 401', async () => {
    nock(BASE_URL)
      .get('/pven/v2/albaranes-ventas')
      .query({ items: '20', page: '1', codEmpresa: '1' })
      .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

    const handler = getHandler(buildServer(), LIST_ALBARANES_VENTAS_TOOL);
    const result = (await handler({ page: 1, items: 20, empresa: '1' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('invalid_token');
  });

  it('list_albaranes_ventas rejects when empresa is missing (Zod validation)', async () => {
    const handler = getHandler(buildServer(), LIST_ALBARANES_VENTAS_TOOL);
    // empresa es REQUERIDO por el endpoint /pven/v2/albaranes-ventas — la
    // ausencia debe fallar en la capa Zod sin llegar al API. No registramos
    // nock: si llegase, fallaría con "no match for request" indicando que la
    // validación no funcionó. El MCP SDK devuelve { isError: true } en lugar
    // de lanzar excepción cuando Zod rechaza el input.
    const result = (await handler({ page: 1, items: 20 } as never)) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };
    expect(result.isError).toBe(true);
  });

  // ===========================================================================
  // freematica_get_albaran_venta — happy path
  // ===========================================================================

  it('get_albaran_venta returns the albaran object for a valid idReg', async () => {
    const fake = { ALVC_CODEMP: '1', ALVC_CODCLI: 'CLI001', ALVC_NUMDOC: 100 };
    nock(BASE_URL)
      .get('/pven/v2/albaranes-ventas/MV9fMTAwMA%3D%3D')
      .reply(200, detailEnv(fake));

    const handler = getHandler(buildServer(), GET_ALBARAN_VENTA_TOOL);
    const result = (await handler({ id: 'MV9fMTAwMA==' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  // ===========================================================================
  // freematica_get_albaran_venta — error paths
  // ===========================================================================

  it('get_albaran_venta returns not_found when id does not exist', async () => {
    nock(BASE_URL)
      .get('/pven/v2/albaranes-ventas/BADID')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const handler = getHandler(buildServer(), GET_ALBARAN_VENTA_TOOL);
    const result = (await handler({ id: 'BADID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('get_albaran_venta returns server_error on 500', async () => {
    nock(BASE_URL)
      .get('/pven/v2/albaranes-ventas/BADID')
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const handler = getHandler(buildServer(), GET_ALBARAN_VENTA_TOOL);
    const result = (await handler({ id: 'BADID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  // ===========================================================================
  // freematica_list_albaranes_factura — happy paths
  // ===========================================================================

  it('list_albaranes_factura returns items list with no filters', async () => {
    const fake = [
      { idReg: 'aaa', FVCA_CODEMP: '1', FVCA_NUMFRA: 2024001, FVCA_NUMALB: 100 },
      { idReg: 'bbb', FVCA_CODEMP: '1', FVCA_NUMFRA: 2024002, FVCA_NUMALB: 101 },
    ];
    nock(BASE_URL)
      .get('/pven/v2/albaranes-facturas')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 80));

    const handler = getHandler(buildServer(), LIST_ALBARANES_FACTURA_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: fake,
      count: 2,
      total: 80,
      page: 1,
      items_per_page: 20,
    });
  });

  it('list_albaranes_factura passes idReg as native query param', async () => {
    const fake = [{ idReg: 'abc123', FVCA_CODEMP: '1' }];
    nock(BASE_URL)
      .get('/pven/v2/albaranes-facturas')
      .query({ items: '20', page: '1', idReg: 'abc123' })
      .reply(200, listEnv(fake, 1));

    const handler = getHandler(buildServer(), LIST_ALBARANES_FACTURA_TOOL);
    const result = (await handler({ page: 1, items: 20, idReg: 'abc123' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_albaranes_factura passes FIQL for empresa filter (FVCA_CODEMP)', async () => {
    const fake = [{ FVCA_CODEMP: '1', FVCA_NUMFRA: 2024001 }];
    nock(BASE_URL)
      .get('/pven/v2/albaranes-facturas')
      .query((q) => {
        const rQuery = String(q['rquery'] ?? '');
        return rQuery.includes('FVCA_CODEMP==1');
      })
      .reply(200, listEnv(fake, 1));

    const handler = getHandler(buildServer(), LIST_ALBARANES_FACTURA_TOOL);
    const result = (await handler({ page: 1, items: 20, empresa: '1' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
  });

  it('list_albaranes_factura passes FIQL for serie and numFactura filters', async () => {
    const fake = [{ FVCA_SERIEFRA: 'A', FVCA_NUMFRA: 2024001 }];
    nock(BASE_URL)
      .get('/pven/v2/albaranes-facturas')
      .query((q) => {
        const rQuery = String(q['rquery'] ?? '');
        return rQuery.includes('FVCA_SERIEFRA==A') && rQuery.includes('FVCA_NUMFRA==2024001');
      })
      .reply(200, listEnv(fake, 1));

    const handler = getHandler(buildServer(), LIST_ALBARANES_FACTURA_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      serie: 'A',
      numFactura: '2024001',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list_albaranes_factura passes FIQL for codCliente filter', async () => {
    const fake = [{ FVCA_CODCLI: 'CLI001' }];
    nock(BASE_URL)
      .get('/pven/v2/albaranes-facturas')
      .query((q) => {
        const rQuery = String(q['rquery'] ?? '');
        return rQuery.includes('FVCA_CODCLI==CLI001');
      })
      .reply(200, listEnv(fake, 1));

    const handler = getHandler(buildServer(), LIST_ALBARANES_FACTURA_TOOL);
    const result = (await handler({ page: 1, items: 20, codCliente: 'CLI001' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
  });

  // ===========================================================================
  // freematica_list_albaranes_factura — error paths
  // ===========================================================================

  it('list_albaranes_factura returns server_error on 500', async () => {
    nock(BASE_URL)
      .get('/pven/v2/albaranes-facturas')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const handler = getHandler(buildServer(), LIST_ALBARANES_FACTURA_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('list_albaranes_factura returns invalid_token on 401', async () => {
    nock(BASE_URL)
      .get('/pven/v2/albaranes-facturas')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

    const handler = getHandler(buildServer(), LIST_ALBARANES_FACTURA_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('invalid_token');
  });

  // ===========================================================================
  // freematica_get_albaran_factura — happy path
  // ===========================================================================

  it('get_albaran_factura returns the vinculacion object for a valid idReg', async () => {
    const fake = {
      idReg: 'MV9fMTAxMA==',
      FVCA_CODEMP: '1',
      FVCA_NUMFRA: 2024001,
      FVCA_NUMALB: 100,
    };
    nock(BASE_URL)
      .get('/pven/v2/albaranes-facturas/MV9fMTAxMA%3D%3D')
      .reply(200, detailEnv(fake));

    const handler = getHandler(buildServer(), GET_ALBARAN_FACTURA_TOOL);
    const result = (await handler({ id: 'MV9fMTAxMA==' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  // ===========================================================================
  // freematica_get_albaran_factura — error paths
  // ===========================================================================

  it('get_albaran_factura returns not_found when id does not exist', async () => {
    nock(BASE_URL)
      .get('/pven/v2/albaranes-facturas/BADID')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const handler = getHandler(buildServer(), GET_ALBARAN_FACTURA_TOOL);
    const result = (await handler({ id: 'BADID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('get_albaran_factura returns server_error on 500', async () => {
    nock(BASE_URL)
      .get('/pven/v2/albaranes-facturas/BADID')
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const handler = getHandler(buildServer(), GET_ALBARAN_FACTURA_TOOL);
    const result = (await handler({ id: 'BADID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  // ===========================================================================
  // freematica_list_resultados_facturacion — happy paths
  // ===========================================================================

  it('list_resultados_facturacion returns items list with no filters', async () => {
    const fake = [
      { FACT_EMP: '1', FACT_CAL: '2024', FACT_MES: 1, FACT_CTRT: 'CT001' },
      { FACT_EMP: '1', FACT_CAL: '2024', FACT_MES: 1, FACT_CTRT: 'CT002' },
    ];
    nock(BASE_URL)
      .get('/pvss/v1/facturacion-resultados')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 500));

    const handler = getHandler(buildServer(), LIST_RESULTADOS_FACTURACION_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: fake,
      count: 2,
      total: 500,
      page: 1,
      items_per_page: 20,
    });
  });

  it('list_resultados_facturacion passes FIQL for empresa filter (FACT_EMP)', async () => {
    const fake = [{ FACT_EMP: '1', FACT_CAL: '2024' }];
    nock(BASE_URL)
      .get('/pvss/v1/facturacion-resultados')
      .query((q) => {
        const rquery = String(q['rquery'] ?? '');
        return rquery.includes('FACT_EMP==1');
      })
      .reply(200, listEnv(fake, 1));

    const handler = getHandler(buildServer(), LIST_RESULTADOS_FACTURACION_TOOL);
    const result = (await handler({ page: 1, items: 20, empresa: '1' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
  });

  it('list_resultados_facturacion passes FIQL for multiple filters', async () => {
    const fake = [{ FACT_EMP: '1', FACT_DELEG: 'MAD', FACT_CAL: '2024', FACT_MES: 3 }];
    nock(BASE_URL)
      .get('/pvss/v1/facturacion-resultados')
      .query((q) => {
        const rquery = String(q['rquery'] ?? '');
        return (
          rquery.includes('FACT_EMP==1') &&
          rquery.includes('FACT_DELEG==MAD') &&
          rquery.includes('FACT_CAL==2024') &&
          rquery.includes('FACT_MES==3')
        );
      })
      .reply(200, listEnv(fake, 1));

    const handler = getHandler(buildServer(), LIST_RESULTADOS_FACTURACION_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      empresa: '1',
      delegacion: 'MAD',
      calendario: '2024',
      mes: 3,
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_resultados_facturacion passes FIQL for contrato, servicio, tipoFac, traspasado', async () => {
    const fake = [{ FACT_CTRT: 'CT001', FACT_SERV: 'SV01', FACT_TIPFAC: 'M', FACT_TRASP: 'S' }];
    nock(BASE_URL)
      .get('/pvss/v1/facturacion-resultados')
      .query((q) => {
        const rquery = String(q['rquery'] ?? '');
        return (
          rquery.includes('FACT_CTRT==CT001') &&
          rquery.includes('FACT_SERV==SV01') &&
          rquery.includes('FACT_TIPFAC==M') &&
          rquery.includes('FACT_TRASP==S')
        );
      })
      .reply(200, listEnv(fake, 1));

    const handler = getHandler(buildServer(), LIST_RESULTADOS_FACTURACION_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      contrato: 'CT001',
      servicio: 'SV01',
      tipoFac: 'M',
      traspasado: 'S',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list_resultados_facturacion passes order as native param', async () => {
    const fake = [{ FACT_EMP: '1' }];
    nock(BASE_URL)
      .get('/pvss/v1/facturacion-resultados')
      .query((q) => {
        return q['order'] === 'FACT_MES DESC' && String(q['page']) === '1';
      })
      .reply(200, listEnv(fake, 1));

    const handler = getHandler(buildServer(), LIST_RESULTADOS_FACTURACION_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      order: 'FACT_MES DESC',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list_resultados_facturacion passes codCliente FIQL filter', async () => {
    const fake = [{ FACT_COD_CLI: 'CLI001' }];
    nock(BASE_URL)
      .get('/pvss/v1/facturacion-resultados')
      .query((q) => {
        const rquery = String(q['rquery'] ?? '');
        return rquery.includes('FACT_COD_CLI==CLI001');
      })
      .reply(200, listEnv(fake, 1));

    const handler = getHandler(buildServer(), LIST_RESULTADOS_FACTURACION_TOOL);
    const result = (await handler({ page: 1, items: 20, codCliente: 'CLI001' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
  });

  // ===========================================================================
  // freematica_list_resultados_facturacion — error paths
  // ===========================================================================

  it('list_resultados_facturacion returns server_error on 500', async () => {
    nock(BASE_URL)
      .get('/pvss/v1/facturacion-resultados')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const handler = getHandler(buildServer(), LIST_RESULTADOS_FACTURACION_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('list_resultados_facturacion returns invalid_token on 401', async () => {
    nock(BASE_URL)
      .get('/pvss/v1/facturacion-resultados')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

    const handler = getHandler(buildServer(), LIST_RESULTADOS_FACTURACION_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('invalid_token');
  });
});
