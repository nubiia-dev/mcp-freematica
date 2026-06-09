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
  // PRL — getFichaPrevCliente
  // ---------------------------------------------------------------------------

  describe('getFichaPrevCliente', () => {
    it('sends codCli query param and returns { items, total }', async () => {
      const fake = [{ COD_CLI: '123', CODIGO_FICHA: 'F-001' }];
      const scope = nock(BASE_URL)
        .get('/pprl/v2/ficha-prev-cliente')
        .query({ codCli: '123' })
        .reply(200, listEnv(fake, 1));
      const result = await client.getFichaPrevCliente({ codCliente: '123' });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('sends grpCli query param', async () => {
      const fake = [{ COD_GRUPO_CLI: 5 }];
      const scope = nock(BASE_URL)
        .get('/pprl/v2/ficha-prev-cliente')
        .query({ grpCli: '5' })
        .reply(200, listEnv(fake, 1));
      const result = await client.getFichaPrevCliente({ grupoCliente: 5 });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('sends locServ query param', async () => {
      const fake = [{ COD_LOC_SERV: 99001 }];
      const scope = nock(BASE_URL)
        .get('/pprl/v2/ficha-prev-cliente')
        .query({ locServ: '99001' })
        .reply(200, listEnv(fake, 1));
      const result = await client.getFichaPrevCliente({ codLocalizacionServicio: 99001 });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('sends codigo query param', async () => {
      const fake = [{ CODIGO_FICHA: 'FICHA-XYZ' }];
      const scope = nock(BASE_URL)
        .get('/pprl/v2/ficha-prev-cliente')
        .query({ codigo: 'FICHA-XYZ' })
        .reply(200, listEnv(fake, 1));
      const result = await client.getFichaPrevCliente({ codigoFicha: 'FICHA-XYZ' });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates not_found on 404 envelope', async () => {
      nock(BASE_URL)
        .get('/pprl/v2/ficha-prev-cliente')
        .query({ codCli: 'BAD' })
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });
      await expect(client.getFichaPrevCliente({ codCliente: 'BAD' })).rejects.toMatchObject({
        code: 'not_found',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // PRL — listVigilanciaSalud
  // ---------------------------------------------------------------------------

  describe('listVigilanciaSalud', () => {
    it('calls /pprl/v1/vigilancia-salud with pagination params', async () => {
      const fake = [{ PERVS_PERSO: 'P001' }];
      const scope = nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 50));
      const result = await client.listVigilanciaSalud({ items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 50 });
      expect(scope.isDone()).toBe(true);
    });

    it('sends FIQL filters for empresa and delegacion', async () => {
      const fake = [{ PERVS_EMP: '1' }];
      const scope = nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({ items: '20', page: '1', rquery: 'PERVS_EMP==1;PERVS_DELEG==MAD' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listVigilanciaSalud({
        items: 20,
        page: 1,
        empresa: '1',
        delegacion: 'MAD',
      });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('sends idRegPersona as native query param', async () => {
      const fake = [{ PERVS_PERSO: 'P001' }];
      const scope = nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({ items: '20', page: '1', idRegPersona: 'ABCDEF==' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listVigilanciaSalud({ items: 20, page: 1, idRegPersona: 'ABCDEF==' });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates server_error on 500 envelope', async () => {
      nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Boom', data: null });
      await expect(client.listVigilanciaSalud({ items: 20, page: 1 })).rejects.toMatchObject({
        code: 'server_error',
      });
    });

    it('emite PERVS_FCH_CITA=ge=... en rquery cuando solo fechaCitaDesde', async () => {
      const fake = [{ PERVS_FCH_CITA: '2025-01-15' }];
      const scope = nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({ items: '20', page: '1', rquery: 'PERVS_FCH_CITA=ge=2025-01-01' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listVigilanciaSalud({
        items: 20,
        page: 1,
        fechaCitaDesde: '2025-01-01',
      });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('emite PERVS_FCH_CITA=le=... en rquery cuando solo fechaCitaHasta', async () => {
      const fake = [{ PERVS_FCH_CITA: '2025-11-30' }];
      const scope = nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({ items: '20', page: '1', rquery: 'PERVS_FCH_CITA=le=2025-12-31' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listVigilanciaSalud({
        items: 20,
        page: 1,
        fechaCitaHasta: '2025-12-31',
      });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('emite ambas expresiones ge+le unidas con ";" cuando rango completo', async () => {
      const fake = [{ PERVS_FCH_CITA: '2025-06-15' }];
      const scope = nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud')
        .query({
          items: '20',
          page: '1',
          rquery: 'PERVS_FCH_CITA=ge=2025-01-01;PERVS_FCH_CITA=le=2025-12-31',
        })
        .reply(200, listEnv(fake, 1));
      const result = await client.listVigilanciaSalud({
        items: 20,
        page: 1,
        fechaCitaDesde: '2025-01-01',
        fechaCitaHasta: '2025-12-31',
      });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // PRL — getVigilanciaSalud
  // ---------------------------------------------------------------------------

  describe('getVigilanciaSalud', () => {
    it('returns the VS record for idReg', async () => {
      const fake = { PERVS_RESULTADO: 'APTO', idReg: 'vs001' };
      nock(BASE_URL).get('/pprl/v1/vigilancia-salud/vs001').reply(200, detailEnv(fake));
      const result = await client.getVigilanciaSalud('vs001');
      expect(result).toEqual(fake);
    });

    it('propagates not_found on 404 envelope', async () => {
      nock(BASE_URL)
        .get('/pprl/v1/vigilancia-salud/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });
      await expect(client.getVigilanciaSalud('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // Personal — listPersonal
  // ---------------------------------------------------------------------------

  describe('listPersonal', () => {
    it('calls /pers/v2/personal with pagination and no filters', async () => {
      const fake = [{ VSSPER_COD: 'P001' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 100));
      const result = await client.listPersonal({ items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 100 });
      expect(scope.isDone()).toBe(true);
    });

    it('sends FIQL rquery with empresa and activo=S', async () => {
      const fake = [{ VSSPER_EMP: '1', VSSPER_ACTIVO: 'S' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1', rquery: 'VSSPER_EMP==1;VSSPER_ACTIVO==S' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listPersonal({ items: 20, page: 1, empresa: '1', activo: true });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('sends VSSPER_ACTIVO==N when activo=false', async () => {
      const fake = [{ VSSPER_ACTIVO: 'N' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1', rquery: 'VSSPER_ACTIVO==N' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listPersonal({ items: 20, page: 1, activo: false });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates server_error on 500 envelope', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1' })
        .reply(200, { errorCode: '500', errorMessage: 'Boom', data: null });
      await expect(client.listPersonal({ items: 20, page: 1 })).rejects.toMatchObject({
        code: 'server_error',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Personal — getPersona
  // ---------------------------------------------------------------------------

  describe('getPersona', () => {
    it('returns the persona for idReg', async () => {
      const fake = { VSSPER_COD: 'P001', VSSPER_NOM: 'Ana' };
      nock(BASE_URL).get('/pers/v2/personal/PERS001%3D%3D').reply(200, detailEnv(fake));
      const result = await client.getPersona('PERS001==');
      expect(result).toEqual(fake);
    });

    it('propagates not_found on 404 envelope', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal/BADID')
        .reply(200, { errorCode: '404', errorMessage: 'Not Found', data: null });
      await expect(client.getPersona('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // Calendarios — listCalendarios
  // ---------------------------------------------------------------------------

  describe('listCalendarios', () => {
    it('calls /pgrl/v1/calendarios with pagination', async () => {
      const fake = [{ idReg: 'cal001', NOMBRE: 'Cal 2025' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v1/calendarios')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 5));
      const result = await client.listCalendarios({ items: 10, page: 1 });
      expect(result).toEqual({ items: fake, total: 5 });
      expect(scope.isDone()).toBe(true);
    });

    it('calls with no params when no opts', async () => {
      const fake = [{ idReg: 'cal001' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v1/calendarios')
        .reply(200, listEnv(fake, 1));
      const result = await client.listCalendarios();
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates invalid_token on 401 envelope', async () => {
      nock(BASE_URL)
        .get('/pgrl/v1/calendarios')
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });
      await expect(client.listCalendarios()).rejects.toMatchObject({ code: 'invalid_token' });
    });
  });

  // ---------------------------------------------------------------------------
  // Calendarios — listCalendarioPeriodos
  // ---------------------------------------------------------------------------

  describe('listCalendarioPeriodos', () => {
    it('calls /pgrl/v1/calendarios/{id}/periodos with pagination', async () => {
      const fake = [{ FECHA_INICIO: '2025-01-01', FECHA_FIN: '2025-01-31' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v1/calendarios/cal001/periodos')
        .query({ items: '12', page: '1' })
        .reply(200, listEnv(fake, 12));
      const result = await client.listCalendarioPeriodos('cal001', { items: 12, page: 1 });
      expect(result).toEqual({ items: fake, total: 12 });
      expect(scope.isDone()).toBe(true);
    });

    it('url-encodes idCalendario in the path', async () => {
      const fake = [{ FECHA_INICIO: '2025-01-01' }];
      const scope = nock(BASE_URL)
        .get('/pgrl/v1/calendarios/cal%2B001%3D%3D/periodos')
        .query({ items: '5', page: '1' })
        .reply(200, listEnv(fake, 1));
      const result = await client.listCalendarioPeriodos('cal+001==', { items: 5, page: 1 });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('propagates not_found on 404 envelope', async () => {
      nock(BASE_URL)
        .get('/pgrl/v1/calendarios/NOCAL/periodos')
        .query({ items: '5', page: '1' })
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });
      await expect(
        client.listCalendarioPeriodos('NOCAL', { items: 5, page: 1 }),
      ).rejects.toMatchObject({ code: 'not_found' });
    });
  });
});
