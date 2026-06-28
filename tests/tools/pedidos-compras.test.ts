import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../src/clients/freematica-client.js';
import { registerPedidosComprasTools } from '../../src/tools/pedidos-compras.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

const LIST_TOOL = 'freematica_list_pedidos_compra';
const GET_TOOL = 'freematica_get_pedido_compra';

interface ToolEntry {
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
  callback?: (args: Record<string, unknown>) => Promise<unknown>;
}

function buildServer() {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerPedidosComprasTools(server, client);
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

describe('registerPedidosComprasTools', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  it('registers both tools', () => {
    const server = buildServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty(LIST_TOOL);
    expect(tools).toHaveProperty(GET_TOOL);
  });

  // --------------------------------------------------------------------------
  // list_pedidos_compra — happy path: solo query params nativos
  // --------------------------------------------------------------------------

  it('list returns items, count, total, page, items_per_page (no filters)', async () => {
    const fake = [
      { ALCC_NUMDOC: 1001, ALCC_DELEG: 'MAD1', idReg: 'abc==' },
      { ALCC_NUMDOC: 1002, ALCC_DELEG: 'BCN1', idReg: 'def==' },
    ];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query({ items: '20', page: '1' })
      .reply(200, listEnv(fake, 250));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
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

  it('list passes empresa as native query param codEmpresa (NOT FIQL)', async () => {
    const fake = [{ ALCC_CODEMP: '1000' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query({ items: '20', page: '1', codEmpresa: '1000' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      empresa: '1000',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes codProveedor as native query param (NOT FIQL)', async () => {
    const fake = [{ ALCC_CODPRO: 'P001' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query({ items: '20', page: '1', codProveedor: 'P001' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      codProveedor: 'P001',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes fechaPedidoDesde as native query param desdeFecha', async () => {
    const fake = [{ ALCC_FCHPED: '2025-03-01' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query({ items: '20', page: '1', desdeFecha: '2025-01-01' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      fechaPedidoDesde: '2025-01-01',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes fechaPedidoHasta as native query param hastaFecha', async () => {
    const fake = [{ ALCC_FCHPED: '2025-06-30' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query({ items: '20', page: '1', hastaFecha: '2025-12-31' })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      fechaPedidoHasta: '2025-12-31',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes all 4 native query params together (empresa + codProveedor + fechas)', async () => {
    const fake = [{ ALCC_NUMDOC: 9001 }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query({
        items: '20',
        page: '1',
        codEmpresa: '1000',
        codProveedor: 'P001',
        desdeFecha: '2025-01-01',
        hastaFecha: '2025-12-31',
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      empresa: '1000',
      codProveedor: 'P001',
      fechaPedidoDesde: '2025-01-01',
      fechaPedidoHasta: '2025-12-31',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  // --------------------------------------------------------------------------
  // list_pedidos_compra — happy path: solo FIQL
  // --------------------------------------------------------------------------

  it('list passes numPedido as FIQL ALCC_NUMDOC==N', async () => {
    const fake = [{ ALCC_NUMDOC: 12345678 }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => String(q.rquery ?? '').includes('ALCC_NUMDOC==12345678'))
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      numPedido: 12345678,
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list passes delegacion as FIQL ALCC_DELEG==XXXX', async () => {
    const fake = [{ ALCC_DELEG: 'MAD1' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => String(q.rquery ?? '').includes('ALCC_DELEG==MAD1'))
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      delegacion: 'MAD1',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes codDocumento + codCliente as FIQL', async () => {
    const fake = [{ ALCC_CODDOC: 'PCMP', ALCC_COD_CLIENTE: '0001000' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => {
        const rq = String(q.rquery ?? '');
        return rq.includes('ALCC_CODDOC==PCMP') && rq.includes('ALCC_COD_CLIENTE==0001000');
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      codDocumento: 'PCMP',
      codCliente: '0001000',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes referencia as FIQL ALCC_REFERENCIA==X', async () => {
    const fake = [{ ALCC_REFERENCIA: 'REF-2025-001' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => String(q.rquery ?? '').includes('ALCC_REFERENCIA==REF-2025-001'))
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      referencia: 'REF-2025-001',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes fechaEntregaDesde as FIQL ALCC_FCHENTREGA=ge=', async () => {
    const fake = [{ ALCC_FCHENTREGA: '2025-06-15' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => String(q.rquery ?? '').includes('ALCC_FCHENTREGA=ge=2025-01-01'))
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      fechaEntregaDesde: '2025-01-01',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes fechaEntregaHasta as FIQL ALCC_FCHENTREGA=le=', async () => {
    const fake = [{ ALCC_FCHENTREGA: '2025-06-15' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => String(q.rquery ?? '').includes('ALCC_FCHENTREGA=le=2025-12-31'))
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      fechaEntregaHasta: '2025-12-31',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  it('list passes BOTH fechaEntrega ge AND le when both are provided', async () => {
    const fake = [{ ALCC_FCHENTREGA: '2025-06-15' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => {
        const rq = String(q.rquery ?? '');
        return (
          rq.includes('ALCC_FCHENTREGA=ge=2025-01-01') &&
          rq.includes('ALCC_FCHENTREGA=le=2025-12-31')
        );
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      fechaEntregaDesde: '2025-01-01',
      fechaEntregaHasta: '2025-12-31',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  // --------------------------------------------------------------------------
  // list_pedidos_compra — enum estado: todos los valores
  // --------------------------------------------------------------------------

  it('estado=pendiente generates FIQL ALCC_PED_BLOQ==\'\';ALCC_PED_RECIB==\'\'', async () => {
    const fake = [{ ALCC_NUMDOC: 5001 }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => {
        const rq = String(q.rquery ?? '');
        return rq.includes("ALCC_PED_BLOQ==''") && rq.includes("ALCC_PED_RECIB==''");
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      estado: 'pendiente',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it("estado=bloqueado generates FIQL ALCC_PED_BLOQ!=''", async () => {
    const fake = [{ ALCC_NUMDOC: 5002, ALCC_PED_BLOQ: 'S' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => String(q.rquery ?? '').includes("ALCC_PED_BLOQ!=''"))
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      estado: 'bloqueado',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it("estado=recibido generates FIQL ALCC_PED_RECIB!=''", async () => {
    const fake = [{ ALCC_NUMDOC: 5003, ALCC_PED_RECIB: 'S' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => String(q.rquery ?? '').includes("ALCC_PED_RECIB!=''"))
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      estado: 'recibido',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  // --------------------------------------------------------------------------
  // list_pedidos_compra — combinación: nativos + FIQL en la misma llamada
  // --------------------------------------------------------------------------

  it('list passes both native query params AND FIQL rquery in the same request', async () => {
    const fake = [{ ALCC_NUMDOC: 9999, ALCC_DELEG: 'BCN1' }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => {
        // Verificar que los params nativos están presentes
        const hasNatives =
          q.codEmpresa === '1000' &&
          q.codProveedor === 'P001' &&
          q.desdeFecha === '2025-01-01' &&
          q.hastaFecha === '2025-12-31';
        // Verificar que hay FIQL en rquery
        const rq = String(q.rquery ?? '');
        const hasFiql = rq.includes('ALCC_DELEG==BCN1') && rq.includes('ALCC_FPAGO==TRF');
        return hasNatives && hasFiql;
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      empresa: '1000',
      codProveedor: 'P001',
      fechaPedidoDesde: '2025-01-01',
      fechaPedidoHasta: '2025-12-31',
      delegacion: 'BCN1',
      formaPago: 'TRF',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toEqual(fake);
  });

  it('list passes all FIQL filters + estado together', async () => {
    const fake = [{ ALCC_NUMDOC: 8888 }];
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query(q => {
        const rq = String(q.rquery ?? '');
        return (
          rq.includes('ALCC_NUMDOC==12345') &&
          rq.includes('ALCC_COD_INSTALADOR==INST01') &&
          rq.includes('ALCC_COD_MANTENEDOR==MANT01') &&
          rq.includes("ALCC_PED_BLOQ!=''")
        );
      })
      .reply(200, listEnv(fake, 1));

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      numPedido: 12345,
      codInstalador: 'INST01',
      codMantenedor: 'MANT01',
      estado: 'bloqueado',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // list_pedidos_compra — validación Zod
  // --------------------------------------------------------------------------

  it('list rejects empresa with length !== 4 (too short)', async () => {
    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      empresa: '100',  // 3 chars, must be exactly 4
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    // Zod validation error → isError or content with error
    expect(result.isError).toBe(true);
  });

  it('list rejects empresa with length !== 4 (too long)', async () => {
    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      empresa: '10001',  // 5 chars, must be exactly 4
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBe(true);
  });

  it('list rejects codProveedor with length > 10', async () => {
    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      codProveedor: '12345678901',  // 11 chars, max is 10
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBe(true);
  });

  it('list rejects delegacion with length !== 4', async () => {
    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      delegacion: 'MA',  // 2 chars, must be exactly 4
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBe(true);
  });

  it('list rejects formaPago with length !== 3', async () => {
    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      formaPago: 'TRFX',  // 4 chars, must be exactly 3
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBe(true);
  });

  it('list rejects invalid estado value', async () => {
    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({
      page: 1,
      items: 20,
      estado: 'invalido',
    })) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBe(true);
  });

  // --------------------------------------------------------------------------
  // list_pedidos_compra — error paths
  // --------------------------------------------------------------------------

  it('list returns server_error on 500 envelope', async () => {
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });

  it('list returns invalid_token on 401 envelope', async () => {
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos')
      .query({ items: '20', page: '1' })
      .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

    const server = buildServer();
    const handler = getHandler(server, LIST_TOOL);
    const result = (await handler({ page: 1, items: 20 })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('invalid_token');
  });

  // --------------------------------------------------------------------------
  // get_pedido_compra — happy path
  // --------------------------------------------------------------------------

  it('get returns the pedido composite object for a valid idReg', async () => {
    const fake = {
      VoPedidosCompraCab: { ALCC_NUMDOC: 1001, ALCC_DELEG: 'MAD1' },
      cabecera_proveedor: { COD_PRO: 'P001', NOMBRE_PRO: 'Proveedor A' },
      lineas: [
        { ALCC_LIN: 1, ALCC_CANT: 5, ALCC_ART: 'ART001' },
        { ALCC_LIN: 2, ALCC_CANT: 2, ALCC_ART: 'ART002' },
      ],
    };
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos/MV9fMTAwMA%3D%3D')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'MV9fMTAwMA==' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    // Verifica que el objeto compuesto NO está aplanado
    expect(parsed).toHaveProperty('VoPedidosCompraCab');
    expect(parsed).toHaveProperty('cabecera_proveedor');
    expect(parsed).toHaveProperty('lineas');
    expect(parsed.lineas).toHaveLength(2);
  });

  it('get URL-encodes idReg with special characters (==)', async () => {
    const fake = { VoPedidosCompraCab: { ALCC_NUMDOC: 2001 }, cabecera_proveedor: {}, lineas: [] };
    // idReg con "==" → debe codificarse como "%3D%3D" en la URL
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos/ABCDEF%3D%3D')
      .reply(200, detailEnv(fake));

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'ABCDEF==' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // get_pedido_compra — error paths
  // --------------------------------------------------------------------------

  it('get returns not_found when id does not exist', async () => {
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos/BADID')
      .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'BADID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('not_found');
  });

  it('get returns server_error on 500 envelope', async () => {
    nock(BASE_URL)
      .get('/pcmp/v2/pedidos/BADID')
      .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });

    const server = buildServer();
    const handler = getHandler(server, GET_TOOL);
    const result = (await handler({ id: 'BADID' })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('server_error');
  });
});
