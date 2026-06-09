import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { FreematicaClient } from '../../src/clients/freematica-client.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

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

describe('FreematicaClient', () => {
  let client: FreematicaClient;

  beforeEach(() => {
    client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getMaterialesAsignadosServicios', () => {
    it('returns { items, total } from /pvss/v2/contratos-servicios-material', async () => {
      const fake = [{ idreg: 1 }, { idreg: 2 }];
      nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(200, listEnv(fake, 2));
      const result = await client.getMaterialesAsignadosServicios();
      expect(result).toEqual({ items: fake, total: 2 });
    });

    it('returns empty items + total=0 for empty dataset', async () => {
      nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(200, listEnv([], 0));
      const result = await client.getMaterialesAsignadosServicios();
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('propagates invalid_token on envelope errorCode=401', async () => {
      nock(BASE_URL)
        .get('/pvss/v2/contratos-servicios-material')
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });
      await expect(client.getMaterialesAsignadosServicios()).rejects.toMatchObject({
        code: 'invalid_token',
      });
    });
  });

  describe('getMasterData', () => {
    it('calls the endpoint mapped for the catalog and returns { items, total }', async () => {
      const fake = [{ idreg: 1, nombre: 'España' }];
      const scope = nock(BASE_URL).get('/pgrl/v1/paises').reply(200, listEnv(fake, 1));
      const result = await client.getMasterData('paises');
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates invalid_token on envelope errorCode=401', async () => {
      nock(BASE_URL)
        .get('/pgrl/v1/paises')
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });
      await expect(client.getMasterData('paises')).rejects.toMatchObject({
        code: 'invalid_token',
      });
    });
  });

  describe('listClientes', () => {
    it('uses default request (no query) when no opts', async () => {
      const fake = [{ COD_CLI: '1' }];
      const scope = nock(BASE_URL).get('/pgrl/v2/clientes').reply(200, listEnv(fake, 100));
      const result = await client.listClientes();
      expect(result).toEqual({ items: fake, total: 100 });
      expect(scope.isDone()).toBe(true);
    });

    it('appends items and page query params when provided', async () => {
      const fake = [{ COD_CLI: '5' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v2/clientes')
        .query({ items: '20', page: '2' })
        .reply(200, listEnv(fake, 100));
      const result = await client.listClientes({ items: 20, page: 2 });
      expect(result).toEqual({ items: fake, total: 100 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getCliente', () => {
    it('returns the cliente object for idReg', async () => {
      const fake = { COD_CLI: '1000', NOMBRE_CLI: 'ACME' };
      nock(BASE_URL).get('/pgrl/v2/clientes/MV9fMTAwMA%3D%3D').reply(200, detailEnv(fake));
      const result = await client.getCliente('MV9fMTAwMA==');
      expect(result).toEqual(fake);
    });

    it('propagates not_found on envelope errorCode=404', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/clientes/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(client.getCliente('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  describe('listContactosClientes', () => {
    it('returns { items, total } from /pgrl/v2/contactos-clientes with pagination', async () => {
      const fake = [{ idReg: 'X' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v2/contactos-clientes')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 50));
      const result = await client.listContactosClientes({ items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 50 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('listOportunidadesNegocio', () => {
    it('returns { items, total } from /pcrm/v2/oportunidades-negocio', async () => {
      const fake = [{ ID_OPORTUNIDAD: 2.0 }];
      const scope = nock(BASE_URL)
        .get('/pcrm/v2/oportunidades-negocio')
        .query({ items: '5', page: '1' })
        .reply(200, listEnv(fake, 25));
      const result = await client.listOportunidadesNegocio({ items: 5, page: 1 });
      expect(result).toEqual({ items: fake, total: 25 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getOportunidadNegocio', () => {
    it('returns the oportunidad object for idReg', async () => {
      const fake = { COD_CLI: '709', ID_OPORTUNIDAD: 2.0 };
      nock(BASE_URL).get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D').reply(200, detailEnv(fake));
      const result = await client.getOportunidadNegocio('MDJfXzI=');
      expect(result).toEqual(fake);
    });
  });

  describe('getOportunidadNegocioDatosAmpliados', () => {
    it('returns the datos-ampliados object for idReg', async () => {
      const fake = { FOO: 'BAR' };
      nock(BASE_URL)
        .get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D/datos-ampliados')
        .reply(200, detailEnv(fake));
      const result = await client.getOportunidadNegocioDatosAmpliados('MDJfXzI=');
      expect(result).toEqual(fake);
    });

    it('propagates not_found when oportunidad has no datos-ampliados', async () => {
      nock(BASE_URL)
        .get('/pcrm/v2/oportunidades-negocio/MDJfXzI%3D/datos-ampliados')
        .reply(200, { errorCode: '404', errorMessage: 'No data', data: null });
      await expect(
        client.getOportunidadNegocioDatosAmpliados('MDJfXzI='),
      ).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listFacturasCompras (v0.5.0)
  // ---------------------------------------------------------------------------

  describe('listFacturasCompras', () => {
    it('returns { items, total } from /pcmp/v2/facturas-compras with pagination', async () => {
      const fake = [{ FCC_CODEMP: '1', FCC_NUMFRA: '2024001' }];
      const scope = nock(BASE_URL)
        .get('/pcmp/v2/facturas-compras')
        .query({ items: '10', page: '2' })
        .reply(200, listEnv(fake, 100));
      const result = await client.listFacturasCompras({ items: 10, page: 2 });
      expect(result).toEqual({ items: fake, total: 100 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes exportado as native query param', async () => {
      const fake = [{ FCC_CODEMP: '1' }];
      const scope = nock(BASE_URL)
        .get('/pcmp/v2/facturas-compras')
        .query({ items: '20', page: '1', exportado: 'not_exported' })
        .reply(200, listEnv(fake, 5));
      const result = await client.listFacturasCompras({
        items: 20,
        page: 1,
        exportado: 'not_exported',
      });
      expect(result).toEqual({ items: fake, total: 5 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes FIQL rquery for empresa and codProveedor', async () => {
      const fake = [{ FCC_CODEMP: '1', FCC_CODPRO: 'P001' }];
      const scope = nock(BASE_URL)
        .get('/pcmp/v2/facturas-compras')
        .query(q => String(q.rquery ?? '').includes('FCC_CODEMP==1') &&
                    String(q.rquery ?? '').includes('FCC_CODPRO==P001'))
        .reply(200, listEnv(fake, 1));
      const result = await client.listFacturasCompras({
        items: 20,
        page: 1,
        empresa: '1',
        codProveedor: 'P001',
      });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes FIQL for delegacion and lineaNegocio', async () => {
      const fake = [{ FCC_DELEG: 'MAD', FCC_LIN_NEGOCIO: 'LN01' }];
      nock(BASE_URL)
        .get('/pcmp/v2/facturas-compras')
        .query(q => String(q.rquery ?? '').includes('FCC_DELEG==MAD') &&
                    String(q.rquery ?? '').includes('FCC_LIN_NEGOCIO==LN01'))
        .reply(200, listEnv(fake, 1));
      const result = await client.listFacturasCompras({
        items: 20,
        page: 1,
        delegacion: 'MAD',
        lineaNegocio: 'LN01',
      });
      expect(result.items).toEqual(fake);
    });

    it('passes FIQL for serie and numFactura', async () => {
      const fake = [{ FCC_SERIEFRA: 'A', FCC_NUMFRA: '2024999' }];
      nock(BASE_URL)
        .get('/pcmp/v2/facturas-compras')
        .query(q => String(q.rquery ?? '').includes('FCC_SERIEFRA==A') &&
                    String(q.rquery ?? '').includes('FCC_NUMFRA==2024999'))
        .reply(200, listEnv(fake, 1));
      const result = await client.listFacturasCompras({
        items: 20,
        page: 1,
        serie: 'A',
        numFactura: '2024999',
      });
      expect(result.items).toEqual(fake);
    });

    it('propagates invalid_token on 401', async () => {
      nock(BASE_URL)
        .get('/pcmp/v2/facturas-compras')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });
      await expect(client.listFacturasCompras({ items: 20, page: 1 })).rejects.toMatchObject({
        code: 'invalid_token',
      });
    });

    it('propagates server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pcmp/v2/facturas-compras')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });
      await expect(client.listFacturasCompras({ items: 20, page: 1 })).rejects.toMatchObject({
        code: 'server_error',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getFacturaCompra (v0.5.0)
  // ---------------------------------------------------------------------------

  describe('getFacturaCompra', () => {
    it('returns the factura object for idReg', async () => {
      const fake = { FCC_CODEMP: '1', FCC_NUMFRA: '2024001', FCC_CODPRO: 'P001' };
      nock(BASE_URL)
        .get('/pcmp/v2/facturas-compras/MV9fMTAwMA%3D%3D')
        .reply(200, detailEnv(fake));
      const result = await client.getFacturaCompra('MV9fMTAwMA==');
      expect(result).toEqual(fake);
    });

    it('propagates not_found on 404', async () => {
      nock(BASE_URL)
        .get('/pcmp/v2/facturas-compras/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(client.getFacturaCompra('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listProveedores (v0.5.0)
  // ---------------------------------------------------------------------------

  describe('listProveedores', () => {
    it('returns { items, total } from /pgrl/v2/proveedores with pagination', async () => {
      const fake = [{ COD_PRO: 'P001', NOMBRE_PRO: 'Proveedor A' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v2/proveedores')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 50));
      const result = await client.listProveedores({ items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 50 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes FIQL for codProveedor and nif', async () => {
      const fake = [{ COD_PRO: 'P001' }];
      nock(BASE_URL)
        .get('/pgrl/v2/proveedores')
        .query({ items: '20', page: '1', rquery: 'COD_PRO==P001;NIF==12345678A' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listProveedores({
        items: 20,
        page: 1,
        codProveedor: 'P001',
        nif: '12345678A',
      });
      expect(result.items).toEqual(fake);
    });

    it('passes FECHA_BAJA==null for activo=true', async () => {
      const fake = [{ COD_PRO: 'P001', FECHA_BAJA: null }];
      nock(BASE_URL)
        .get('/pgrl/v2/proveedores')
        .query(q => String(q.rquery ?? '').includes('FECHA_BAJA==null'))
        .reply(200, listEnv(fake, 10));
      const result = await client.listProveedores({ items: 20, page: 1, activo: true });
      expect(result.items).toEqual(fake);
    });

    it('passes FECHA_BAJA!=null for activo=false', async () => {
      const fake = [{ COD_PRO: 'P099', FECHA_BAJA: '2023-01-01' }];
      nock(BASE_URL)
        .get('/pgrl/v2/proveedores')
        .query(q => String(q.rquery ?? '').includes('FECHA_BAJA!=null'))
        .reply(200, listEnv(fake, 3));
      const result = await client.listProveedores({ items: 20, page: 1, activo: false });
      expect(result.items).toEqual(fake);
    });

    it('propagates invalid_token on 401', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/proveedores')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });
      await expect(client.listProveedores({ items: 20, page: 1 })).rejects.toMatchObject({
        code: 'invalid_token',
      });
    });

    it('propagates server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/proveedores')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });
      await expect(client.listProveedores({ items: 20, page: 1 })).rejects.toMatchObject({
        code: 'server_error',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getProveedor (v0.5.0)
  // ---------------------------------------------------------------------------

  describe('getProveedor', () => {
    it('returns the proveedor object for idReg', async () => {
      const fake = { COD_PRO: 'P001', NOMBRE_PRO: 'Proveedor A', NIF: '12345678A' };
      nock(BASE_URL)
        .get('/pgrl/v2/proveedores/MV9fUDAwMQ%3D%3D')
        .reply(200, detailEnv(fake));
      const result = await client.getProveedor('MV9fUDAwMQ==');
      expect(result).toEqual(fake);
    });

    it('propagates not_found on 404', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/proveedores/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(client.getProveedor('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listLocalizacionesCobroClientes (v0.5.0)
  // ---------------------------------------------------------------------------

  describe('listLocalizacionesCobroClientes', () => {
    it('returns { items, total } from /pgrl/v2/localizaciones-cobro-clientes', async () => {
      const fake = [{ COD_CLI: 'C001', COD_FORMA_COBRO: 'TRANS' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-cobro-clientes')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 200));
      const result = await client.listLocalizacionesCobroClientes({ items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 200 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes FIQL rquery for codCliente', async () => {
      const fake = [{ COD_CLI: 'C001' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-cobro-clientes')
        .query({ items: '20', page: '1', rquery: 'COD_CLI==C001' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listLocalizacionesCobroClientes({
        items: 20,
        page: 1,
        codCliente: 'C001',
      });
      expect(result.items).toEqual(fake);
    });

    it('propagates server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-cobro-clientes')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });
      await expect(
        client.listLocalizacionesCobroClientes({ items: 20, page: 1 }),
      ).rejects.toMatchObject({ code: 'server_error' });
    });
  });

  // ---------------------------------------------------------------------------
  // listLocalizacionesPagoProveedores (v0.5.0)
  // ---------------------------------------------------------------------------

  describe('listLocalizacionesPagoProveedores', () => {
    it('returns { items, total } from /pgrl/v2/localizaciones-pago-proveedores', async () => {
      const fake = [{ COD_PRO: 'P001', COD_FORMA_PAGO: 'TRANS' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-pago-proveedores')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 50));
      const result = await client.listLocalizacionesPagoProveedores({ items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 50 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes FIQL rquery for codProveedor', async () => {
      const fake = [{ COD_PRO: 'P001' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-pago-proveedores')
        .query({ items: '20', page: '1', rquery: 'COD_PRO==P001' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listLocalizacionesPagoProveedores({
        items: 20,
        page: 1,
        codProveedor: 'P001',
      });
      expect(result.items).toEqual(fake);
    });

    it('propagates server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-pago-proveedores')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });
      await expect(
        client.listLocalizacionesPagoProveedores({ items: 20, page: 1 }),
      ).rejects.toMatchObject({ code: 'server_error' });
    });
  });

  // ---------------------------------------------------------------------------
  // listLocalizacionesServicioClientes (v0.5.0)
  // ---------------------------------------------------------------------------

  describe('listLocalizacionesServicioClientes', () => {
    it('returns { items, total } from /pgrl/v2/localizaciones-servicio-clientes', async () => {
      const fake = [{ COD_CLI: 'C001', COD_PAIS: 'ES', COD_REPRES: 'R01' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 500));
      const result = await client.listLocalizacionesServicioClientes({ items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 500 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes FIQL rquery for codCliente', async () => {
      const fake = [{ COD_CLI: 'C001' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query({ items: '20', page: '1', rquery: 'COD_CLI==C001' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listLocalizacionesServicioClientes({
        items: 20,
        page: 1,
        codCliente: 'C001',
      });
      expect(result.items).toEqual(fake);
    });

    it('passes FECHA_BAJA==null for activo=true', async () => {
      const fake = [{ COD_CLI: 'C001', FECHA_BAJA: null }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query(q => String(q.rquery ?? '').includes('FECHA_BAJA==null'))
        .reply(200, listEnv(fake, 5));
      const result = await client.listLocalizacionesServicioClientes({
        items: 20,
        page: 1,
        activo: true,
      });
      expect(result.items).toEqual(fake);
    });

    it('passes FECHA_BAJA!=null for activo=false', async () => {
      const fake = [{ COD_CLI: 'C001', FECHA_BAJA: '2023-06-01' }];
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query(q => String(q.rquery ?? '').includes('FECHA_BAJA!=null'))
        .reply(200, listEnv(fake, 2));
      const result = await client.listLocalizacionesServicioClientes({
        items: 20,
        page: 1,
        activo: false,
      });
      expect(result.items).toEqual(fake);
    });

    it('propagates server_error on 500', async () => {
      nock(BASE_URL)
        .get('/pgrl/v2/localizaciones-servicio-clientes')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Internal error', data: null });
      await expect(
        client.listLocalizacionesServicioClientes({ items: 20, page: 1 }),
      ).rejects.toMatchObject({ code: 'server_error' });
    });
  });
});
