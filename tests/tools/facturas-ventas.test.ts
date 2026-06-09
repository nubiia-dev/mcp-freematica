import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerFacturasVentasTools } from '../../src/tools/facturas-ventas.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_CABECERA_TOOL = 'freematica_list_facturas_cabecera';
const GET_CABECERA_TOOL = 'freematica_get_factura_cabecera';
const LIST_LINEAS_TOOL = 'freematica_list_factura_lineas';
const LIST_IVA_TOOL = 'freematica_list_factura_iva';
const LIST_VENCIMIENTOS_TOOL = 'freematica_list_factura_vencimientos';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerFacturasVentasTools(server, client);
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

// Encoded idReg for test: 'MV9fMTAwMA==' → URL-encoded: 'MV9fMTAwMA%3D%3D'
const IDREG = 'MV9fMTAwMA==';
const IDREG_ENC = 'MV9fMTAwMA%3D%3D';

describe('registerFacturasVentasTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  it('registers all 5 tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_CABECERA_TOOL);
    expect(tools).toHaveProperty(GET_CABECERA_TOOL);
    expect(tools).toHaveProperty(LIST_LINEAS_TOOL);
    expect(tools).toHaveProperty(LIST_IVA_TOOL);
    expect(tools).toHaveProperty(LIST_VENCIMIENTOS_TOOL);
  });

  // ---------------------------------------------------------------------------
  // freematica_list_facturas_cabecera — happy path
  // ---------------------------------------------------------------------------

  it('list_facturas_cabecera returns items with pagination', async () => {
    const fake = [
      { FVC_NUMFAC: '00001', FVC_SERFAC: 'A', FVC_TOTFAC: 1210.0 },
      { FVC_NUMFAC: '00002', FVC_SERFAC: 'A', FVC_TOTFAC: 605.0 },
    ];
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 500));

    const server = buildServer();
    const handler = getHandler(server, LIST_CABECERA_TOOL);
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

  it('list_facturas_cabecera applies codCliente and serie FIQL filters', async () => {
    const fake = [{ FVC_NUMFAC: '00001', FVC_SERFAC: 'A' }];
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera')
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return (
          typeof rq === 'string' &&
          rq.includes('FVC_CODAUX==0001000') &&
          rq.includes('FVC_SERFAC==A')
        );
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_CABECERA_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      codCliente: '0001000',
      serie: 'A',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_facturas_cabecera applies fecha range FIQL filters', async () => {
    const fake = [{ FVC_NUMFAC: '00001', FVC_FECFAC: '2026-03-01' }];
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera')
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return (
          typeof rq === 'string' &&
          rq.includes('FVC_FECFAC=ge=2026-01-01') &&
          rq.includes('FVC_FECFAC=le=2026-06-30')
        );
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_CABECERA_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      fechaFacturaDesde: '2026-01-01',
      fechaFacturaHasta: '2026-06-30',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_facturas_cabecera applies traspasadoContabilidad=true FIQL filter', async () => {
    const fake = [{ FVC_NUMFAC: '00001', FVC_TRSCONT: 'S' }];
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera')
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return typeof rq === 'string' && rq.includes('FVC_TRSCONT==S');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_CABECERA_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      traspasadoContabilidad: true,
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_facturas_cabecera applies traspasadoContabilidad=false FIQL filter', async () => {
    const fake = [{ FVC_NUMFAC: '00002', FVC_TRSCONT: 'N' }];
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera')
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return typeof rq === 'string' && rq.includes('FVC_TRSCONT==N');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_CABECERA_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      traspasadoContabilidad: false,
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  // ---------------------------------------------------------------------------
  // freematica_list_facturas_cabecera — error cases
  // ---------------------------------------------------------------------------

  it('list_facturas_cabecera returns error on 404', async () => {
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera')
      .query(true)
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_CABECERA_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('list_facturas_cabecera returns error on 500', async () => {
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera')
      .query(true)
      .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_CABECERA_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  // ---------------------------------------------------------------------------
  // freematica_get_factura_cabecera — happy path
  // ---------------------------------------------------------------------------

  it('get_factura_cabecera returns the factura object for a valid idReg', async () => {
    const fake = { FVC_NUMFAC: '00001', FVC_SERFAC: 'A', FVC_TOTFAC: 1210.0 };
    nock(BASE_URL)
      .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}`)
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, GET_CABECERA_TOOL);
    const result = (await handler({ id: IDREG })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fake);
  });

  // ---------------------------------------------------------------------------
  // freematica_get_factura_cabecera — error cases
  // ---------------------------------------------------------------------------

  it('get_factura_cabecera returns error not_found when id does not exist', async () => {
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera/BADID')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, GET_CABECERA_TOOL);
    const result = (await handler({ id: 'BADID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('get_factura_cabecera returns error server_error on 500', async () => {
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera/SOMEID')
      .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

    const server = buildServer();
    const handler = getHandler(server, GET_CABECERA_TOOL);
    const result = (await handler({ id: 'SOMEID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  // ---------------------------------------------------------------------------
  // freematica_list_factura_lineas — happy path
  // ---------------------------------------------------------------------------

  it('list_factura_lineas returns lines for a valid idFactura', async () => {
    const fake = [
      { FVL_CODART: 'ART001', FVL_CANTFAC: 5, FVL_IMPORTE: 250.0 },
      { FVL_CODART: 'ART002', FVL_CANTFAC: 2, FVL_IMPORTE: 100.0 },
    ];
    nock(BASE_URL)
      .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/lineas`)
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 2));

    const server = buildServer();
    const handler = getHandler(server, LIST_LINEAS_TOOL);
    const result = (await handler({ idFactura: IDREG, page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
    expect(parsed.total).toBe(2);
  });

  it('list_factura_lineas applies codArticulo FIQL filter', async () => {
    const fake = [{ FVL_CODART: 'ART001', FVL_CANTFAC: 5 }];
    nock(BASE_URL)
      .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/lineas`)
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return typeof rq === 'string' && rq.includes('FVL_CODART==ART001');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_LINEAS_TOOL);
    const result = (await handler({
      idFactura: IDREG,
      page: 1,
      items: 20,
      codArticulo: 'ART001',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  // ---------------------------------------------------------------------------
  // freematica_list_factura_lineas — error cases
  // ---------------------------------------------------------------------------

  it('list_factura_lineas returns error not_found when factura does not exist', async () => {
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera/BADID/lineas')
      .query(true)
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_LINEAS_TOOL);
    const result = (await handler({ idFactura: 'BADID', page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('list_factura_lineas returns error server_error on 500', async () => {
    nock(BASE_URL)
      .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/lineas`)
      .query(true)
      .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_LINEAS_TOOL);
    const result = (await handler({ idFactura: IDREG, page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  // ---------------------------------------------------------------------------
  // freematica_list_factura_iva — happy path
  // ---------------------------------------------------------------------------

  it('list_factura_iva returns iva lines for a valid idFactura', async () => {
    const fake = [
      { FVI_TIPIVA: '21', FVI_BASE: 1000.0, FVI_CUOTA: 210.0, FVI_TOTAL: 1210.0 },
    ];
    nock(BASE_URL)
      .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/iva`)
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_IVA_TOOL);
    const result = (await handler({ idFactura: IDREG, page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_factura_iva applies tipoIva FIQL filter', async () => {
    const fake = [{ FVI_TIPIVA: '21', FVI_BASE: 1000.0 }];
    nock(BASE_URL)
      .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/iva`)
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return typeof rq === 'string' && rq.includes('FVI_TIPIVA==21');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_IVA_TOOL);
    const result = (await handler({
      idFactura: IDREG,
      page: 1,
      items: 20,
      tipoIva: '21',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  // ---------------------------------------------------------------------------
  // freematica_list_factura_iva — error cases
  // ---------------------------------------------------------------------------

  it('list_factura_iva returns error not_found when factura does not exist', async () => {
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera/BADID/iva')
      .query(true)
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_IVA_TOOL);
    const result = (await handler({ idFactura: 'BADID', page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('list_factura_iva returns error server_error on 500', async () => {
    nock(BASE_URL)
      .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/iva`)
      .query(true)
      .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_IVA_TOOL);
    const result = (await handler({ idFactura: IDREG, page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  // ---------------------------------------------------------------------------
  // freematica_list_factura_vencimientos — happy path
  // ---------------------------------------------------------------------------

  it('list_factura_vencimientos returns vencimientos for a valid idFactura', async () => {
    const fake = [
      { FVV_FECVCTO: '2026-07-01', FVV_IMPORTE: 1210.0, FVV_CODMPAG: 'TRF' },
    ];
    nock(BASE_URL)
      .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/vencimientos`)
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_VENCIMIENTOS_TOOL);
    const result = (await handler({ idFactura: IDREG, page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list_factura_vencimientos applies modoPago and date range FIQL filters', async () => {
    const fake = [{ FVV_FECVCTO: '2026-07-01', FVV_CODMPAG: 'TRF' }];
    nock(BASE_URL)
      .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/vencimientos`)
      .query((q) => {
        const rq = q['rquery'] as string | undefined;
        return (
          typeof rq === 'string' &&
          rq.includes('FVV_CODMPAG==TRF') &&
          rq.includes('FVV_FECVCTO=ge=2026-07-01') &&
          rq.includes('FVV_FECVCTO=le=2026-12-31')
        );
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_VENCIMIENTOS_TOOL);
    const result = (await handler({
      idFactura: IDREG,
      page: 1,
      items: 20,
      modoPago: 'TRF',
      fechaVencimientoDesde: '2026-07-01',
      fechaVencimientoHasta: '2026-12-31',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  // ---------------------------------------------------------------------------
  // freematica_list_factura_vencimientos — error cases
  // ---------------------------------------------------------------------------

  it('list_factura_vencimientos returns error not_found when factura does not exist', async () => {
    nock(BASE_URL)
      .get('/pven/v1/facturas-cabecera/BADID/vencimientos')
      .query(true)
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_VENCIMIENTOS_TOOL);
    const result = (await handler({ idFactura: 'BADID', page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('list_factura_vencimientos returns error server_error on 500', async () => {
    nock(BASE_URL)
      .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/vencimientos`)
      .query(true)
      .reply(200, { errorCode: '500', errorMessage: 'Internal Server Error', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_VENCIMIENTOS_TOOL);
    const result = (await handler({ idFactura: IDREG, page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });
});
