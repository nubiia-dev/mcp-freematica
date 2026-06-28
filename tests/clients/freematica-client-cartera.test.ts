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

const IDREG = 'MV9fMTAwMA==';
const IDREG_ENC = 'MV9fMTAwMA%3D%3D';

describe('FreematicaClient — Cartera & Facturas Ventas (TD-118)', () => {
  let client: FreematicaClient;

  beforeEach(() => {
    client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ---------------------------------------------------------------------------
  // listCarteraClientes
  // ---------------------------------------------------------------------------

  describe('listCarteraClientes', () => {
    it('returns { items, total } from /pcar/v1/cartera-clientes with no filters', async () => {
      const fake = [{ CARCL_CODAUX: '0001000', CARCL_IMPPEN: 500 }];
      const scope = nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 100));
      const result = await client.listCarteraClientes({ items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 100 });
      expect(scope.isDone()).toBe(true);
    });

    it('applies empresa filter as FIQL CARCL_EMP==1', async () => {
      const fake = [{ CARCL_EMP: '1' }];
      const scope = nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes')
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return typeof rq === 'string' && rq.includes('CARCL_EMP==1');
        })
        .reply(200, listEnv(fake, 1));
      const result = await client.listCarteraClientes({ items: 10, page: 1, empresa: '1' });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('applies estado=pendiente as CARCL_SITCAR==1', async () => {
      const fake = [{ CARCL_SITCAR: 1 }];
      const scope = nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes')
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return typeof rq === 'string' && rq.includes('CARCL_SITCAR==1');
        })
        .reply(200, listEnv(fake, 1));
      await client.listCarteraClientes({ items: 10, page: 1, estado: 'pendiente' });
      expect(scope.isDone()).toBe(true);
    });

    it('applies estado=cancelado as CARCL_SITCAR==2', async () => {
      const fake = [{ CARCL_SITCAR: 2 }];
      const scope = nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes')
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return typeof rq === 'string' && rq.includes('CARCL_SITCAR==2');
        })
        .reply(200, listEnv(fake, 1));
      await client.listCarteraClientes({ items: 10, page: 1, estado: 'cancelado' });
      expect(scope.isDone()).toBe(true);
    });

    it('applies estado=derivado as CARCL_SITCAR==3', async () => {
      const fake = [{ CARCL_SITCAR: 3 }];
      const scope = nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes')
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return typeof rq === 'string' && rq.includes('CARCL_SITCAR==3');
        })
        .reply(200, listEnv(fake, 1));
      await client.listCarteraClientes({ items: 10, page: 1, estado: 'derivado' });
      expect(scope.isDone()).toBe(true);
    });

    it('applies soloImpagados=true as CARCL_FECIMPAG!=null', async () => {
      const fake = [{ CARCL_FECIMPAG: '2026-01-15' }];
      const scope = nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes')
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return typeof rq === 'string' && rq.includes('CARCL_FECIMPAG!=null');
        })
        .reply(200, listEnv(fake, 1));
      await client.listCarteraClientes({ items: 10, page: 1, soloImpagados: true });
      expect(scope.isDone()).toBe(true);
    });

    it('does NOT add soloImpagados filter when soloImpagados=false', async () => {
      const fake = [{ CARCL_CODAUX: '0001000' }];
      const scope = nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes')
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          // No rquery at all, or rquery without FECIMPAG
          return !rq || !rq.includes('CARCL_FECIMPAG');
        })
        .reply(200, listEnv(fake, 1));
      await client.listCarteraClientes({ items: 10, page: 1, soloImpagados: false });
      expect(scope.isDone()).toBe(true);
    });

    it('applies fechaDoc range generating two separate FIQL expressions', async () => {
      const fake = [{ CARCL_FECDOC: '2026-03-01' }];
      const scope = nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes')
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return (
            typeof rq === 'string' &&
            rq.includes('CARCL_FECDOC=ge=2026-01-01') &&
            rq.includes('CARCL_FECDOC=le=2026-06-30')
          );
        })
        .reply(200, listEnv(fake, 1));
      await client.listCarteraClientes({
        items: 10,
        page: 1,
        fechaDocDesde: '2026-01-01',
        fechaDocHasta: '2026-06-30',
      });
      expect(scope.isDone()).toBe(true);
    });

    it('applies fechaVencimiento range generating two separate FIQL expressions', async () => {
      const fake = [{ CARCL_FECVCTO: '2026-07-01' }];
      const scope = nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes')
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return (
            typeof rq === 'string' &&
            rq.includes('CARCL_FECVCTO=ge=2026-06-01') &&
            rq.includes('CARCL_FECVCTO=le=2026-12-31')
          );
        })
        .reply(200, listEnv(fake, 1));
      await client.listCarteraClientes({
        items: 10,
        page: 1,
        fechaVencimientoDesde: '2026-06-01',
        fechaVencimientoHasta: '2026-12-31',
      });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates not_found on envelope errorCode=404', async () => {
      nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes')
        .query(true)
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(client.listCarteraClientes()).rejects.toMatchObject({ code: 'not_found' });
    });

    it('propagates server_error on envelope errorCode=500', async () => {
      nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Server Error', data: null });
      await expect(client.listCarteraClientes()).rejects.toMatchObject({ code: 'server_error' });
    });
  });

  // ---------------------------------------------------------------------------
  // getCarteraCliente
  // ---------------------------------------------------------------------------

  describe('getCarteraCliente', () => {
    it('returns the document for idReg', async () => {
      const fake = { CARCL_CODAUX: '0001000', CARCL_IMPPEN: 500 };
      nock(BASE_URL).get(`/pcar/v1/cartera-clientes/${IDREG_ENC}`).reply(200, detailEnv(fake));
      const result = await client.getCarteraCliente(IDREG);
      expect(result).toEqual(fake);
    });

    it('propagates not_found on envelope errorCode=404', async () => {
      nock(BASE_URL)
        .get('/pcar/v1/cartera-clientes/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(client.getCarteraCliente('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listFacturasCabecera
  // ---------------------------------------------------------------------------

  describe('listFacturasCabecera', () => {
    it('returns { items, total } from /pven/v1/facturas-cabecera with pagination', async () => {
      const fake = [{ FVC_NUMFAC: '00001', FVC_TOTFAC: 1210.0 }];
      const scope = nock(BASE_URL)
        .get('/pven/v1/facturas-cabecera')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 500));
      const result = await client.listFacturasCabecera({ items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 500 });
      expect(scope.isDone()).toBe(true);
    });

    it('applies codCliente and serie FIQL filters', async () => {
      const fake = [{ FVC_NUMFAC: '00001' }];
      const scope = nock(BASE_URL)
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
      await client.listFacturasCabecera({ items: 10, page: 1, codCliente: '0001000', serie: 'A' });
      expect(scope.isDone()).toBe(true);
    });

    it('applies fechaFactura range filters', async () => {
      const fake = [{ FVC_NUMFAC: '00001' }];
      const scope = nock(BASE_URL)
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
      await client.listFacturasCabecera({
        items: 10,
        page: 1,
        fechaFacturaDesde: '2026-01-01',
        fechaFacturaHasta: '2026-06-30',
      });
      expect(scope.isDone()).toBe(true);
    });

    it('applies traspasadoContabilidad=true as FVC_TRSCONT==S', async () => {
      const fake = [{ FVC_TRSCONT: 'S' }];
      const scope = nock(BASE_URL)
        .get('/pven/v1/facturas-cabecera')
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return typeof rq === 'string' && rq.includes('FVC_TRSCONT==S');
        })
        .reply(200, listEnv(fake, 1));
      await client.listFacturasCabecera({ items: 10, page: 1, traspasadoContabilidad: true });
      expect(scope.isDone()).toBe(true);
    });

    it('applies traspasadoContabilidad=false as FVC_TRSCONT==N', async () => {
      const fake = [{ FVC_TRSCONT: 'N' }];
      const scope = nock(BASE_URL)
        .get('/pven/v1/facturas-cabecera')
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return typeof rq === 'string' && rq.includes('FVC_TRSCONT==N');
        })
        .reply(200, listEnv(fake, 1));
      await client.listFacturasCabecera({ items: 10, page: 1, traspasadoContabilidad: false });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates not_found on envelope errorCode=404', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas-cabecera')
        .query(true)
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(client.listFacturasCabecera()).rejects.toMatchObject({ code: 'not_found' });
    });

    it('propagates server_error on envelope errorCode=500', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas-cabecera')
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Server Error', data: null });
      await expect(client.listFacturasCabecera()).rejects.toMatchObject({ code: 'server_error' });
    });
  });

  // ---------------------------------------------------------------------------
  // getFacturaCabecera
  // ---------------------------------------------------------------------------

  describe('getFacturaCabecera', () => {
    it('returns the factura for idReg', async () => {
      const fake = { FVC_NUMFAC: '00001', FVC_TOTFAC: 1210.0 };
      nock(BASE_URL).get(`/pven/v1/facturas-cabecera/${IDREG_ENC}`).reply(200, detailEnv(fake));
      const result = await client.getFacturaCabecera(IDREG);
      expect(result).toEqual(fake);
    });

    it('propagates not_found on envelope errorCode=404', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas-cabecera/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(client.getFacturaCabecera('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listFacturaLineas
  // ---------------------------------------------------------------------------

  describe('listFacturaLineas', () => {
    it('calls /pven/v1/facturas-cabecera/{idreg}/lineas with pagination', async () => {
      const fake = [{ FVL_CODART: 'ART001', FVL_CANTFAC: 5 }];
      const scope = nock(BASE_URL)
        .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/lineas`)
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 5));
      const result = await client.listFacturaLineas(IDREG, { items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 5 });
      expect(scope.isDone()).toBe(true);
    });

    it('applies codArticulo FIQL filter', async () => {
      const fake = [{ FVL_CODART: 'ART001' }];
      const scope = nock(BASE_URL)
        .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/lineas`)
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return typeof rq === 'string' && rq.includes('FVL_CODART==ART001');
        })
        .reply(200, listEnv(fake, 1));
      await client.listFacturaLineas(IDREG, { items: 10, page: 1, codArticulo: 'ART001' });
      expect(scope.isDone()).toBe(true);
    });

    it('applies codFamilia and codSubfamilia FIQL filters', async () => {
      const fake = [{ FVL_CODFAM: 'FAM01', FVL_CODSFAM: 'SFAM01' }];
      const scope = nock(BASE_URL)
        .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/lineas`)
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return (
            typeof rq === 'string' &&
            rq.includes('FVL_CODFAM==FAM01') &&
            rq.includes('FVL_CODSFAM==SFAM01')
          );
        })
        .reply(200, listEnv(fake, 1));
      await client.listFacturaLineas(IDREG, {
        items: 10,
        page: 1,
        codFamilia: 'FAM01',
        codSubfamilia: 'SFAM01',
      });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates not_found when factura does not exist', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas-cabecera/BADID/lineas')
        .query(true)
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(client.listFacturaLineas('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listFacturaIva
  // ---------------------------------------------------------------------------

  describe('listFacturaIva', () => {
    it('calls /pven/v1/facturas-cabecera/{idreg}/iva with pagination', async () => {
      const fake = [{ FVI_TIPIVA: '21', FVI_CUOTA: 210.0 }];
      const scope = nock(BASE_URL)
        .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/iva`)
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listFacturaIva(IDREG, { items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('applies tipoIva FIQL filter', async () => {
      const fake = [{ FVI_TIPIVA: '21' }];
      const scope = nock(BASE_URL)
        .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/iva`)
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return typeof rq === 'string' && rq.includes('FVI_TIPIVA==21');
        })
        .reply(200, listEnv(fake, 1));
      await client.listFacturaIva(IDREG, { items: 10, page: 1, tipoIva: '21' });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates not_found when factura does not exist', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas-cabecera/BADID/iva')
        .query(true)
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(client.listFacturaIva('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listFacturaVencimientos
  // ---------------------------------------------------------------------------

  describe('listFacturaVencimientos', () => {
    it('calls /pven/v1/facturas-cabecera/{idreg}/vencimientos with pagination', async () => {
      const fake = [{ FVV_FECVCTO: '2026-07-01', FVV_IMPORTE: 1210.0 }];
      const scope = nock(BASE_URL)
        .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/vencimientos`)
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listFacturaVencimientos(IDREG, { items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('applies modoPago FIQL filter', async () => {
      const fake = [{ FVV_CODMPAG: 'TRF' }];
      const scope = nock(BASE_URL)
        .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/vencimientos`)
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return typeof rq === 'string' && rq.includes('FVV_CODMPAG==TRF');
        })
        .reply(200, listEnv(fake, 1));
      await client.listFacturaVencimientos(IDREG, { items: 10, page: 1, modoPago: 'TRF' });
      expect(scope.isDone()).toBe(true);
    });

    it('applies fecha range FIQL filters for FVV_FECVCTO', async () => {
      const fake = [{ FVV_FECVCTO: '2026-07-01' }];
      const scope = nock(BASE_URL)
        .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/vencimientos`)
        .query((q) => {
          const rq = q['rquery'] as string | undefined;
          return (
            typeof rq === 'string' &&
            rq.includes('FVV_FECVCTO=ge=2026-07-01') &&
            rq.includes('FVV_FECVCTO=le=2026-12-31')
          );
        })
        .reply(200, listEnv(fake, 1));
      await client.listFacturaVencimientos(IDREG, {
        items: 10,
        page: 1,
        fechaVencimientoDesde: '2026-07-01',
        fechaVencimientoHasta: '2026-12-31',
      });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates not_found when factura does not exist', async () => {
      nock(BASE_URL)
        .get('/pven/v1/facturas-cabecera/BADID/vencimientos')
        .query(true)
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(
        client.listFacturaVencimientos('BADID'),
      ).rejects.toMatchObject({ code: 'not_found' });
    });

    it('propagates server_error on envelope errorCode=500', async () => {
      nock(BASE_URL)
        .get(`/pven/v1/facturas-cabecera/${IDREG_ENC}/vencimientos`)
        .query(true)
        .reply(200, { errorCode: '500', errorMessage: 'Server Error', data: null });
      await expect(
        client.listFacturaVencimientos(IDREG),
      ).rejects.toMatchObject({ code: 'server_error' });
    });
  });
});
