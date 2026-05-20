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
});
