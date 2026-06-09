/**
 * Tests unitarios para los métodos de contabilidad en FreematicaClient:
 * - listCuentasContables
 * - listCuentasAnaliticas
 * - exportAsientos (incluyendo truncado por tamaño)
 */
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

describe('FreematicaClient — contabilidad', () => {
  let client: FreematicaClient;

  beforeEach(() => {
    client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
    delete process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'];
  });

  afterEach(() => {
    nock.cleanAll();
    delete process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'];
  });

  // -------------------------------------------------------------------------
  // listCuentasContables
  // -------------------------------------------------------------------------

  describe('listCuentasContables', () => {
    it('llama a /pcon/v2/cuentas sin filtros por defecto', async () => {
      const fake = [{ COD_CTA: '430' }];
      const scope = nock(BASE_URL).get('/pcon/v2/cuentas').reply(200, listEnv(fake, 1));

      const result = await client.listCuentasContables();
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('filtra por codPlan — rquery COD_PLAN==0001', async () => {
      const fake = [{ COD_CTA: '430', COD_PLAN: '0001' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas')
        .query({ rquery: 'COD_PLAN==0001' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasContables({ codPlan: '0001' });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('filtra activa=true — rquery CTA_ACTIVA==1', async () => {
      const fake = [{ COD_CTA: '430' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas')
        .query({ rquery: 'CTA_ACTIVA==1' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasContables({ activa: true });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('filtra activa=false — rquery CTA_ACTIVA==0', async () => {
      const fake = [{ COD_CTA: '430' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas')
        .query({ rquery: 'CTA_ACTIVA==0' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasContables({ activa: false });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('filtra por grupoCuenta — rquery COD_GRUPO_CTA==G1', async () => {
      const fake = [{ COD_CTA: '430', COD_GRUPO_CTA: 'G1' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas')
        .query({ rquery: 'COD_GRUPO_CTA==G1' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasContables({ grupoCuenta: 'G1' });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('filtra por prefijoCuenta="43" — rquery ge=43;lt=44', async () => {
      const fake = [{ COD_CTA: '4300' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas')
        .query({ rquery: 'COD_CTA=ge=43;COD_CTA=lt=44' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasContables({ prefijoCuenta: '43' });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('prefijoCuenta de un solo char "4" — rquery ge=4;lt=5', async () => {
      const fake = [{ COD_CTA: '430' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas')
        .query({ rquery: 'COD_CTA=ge=4;COD_CTA=lt=5' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasContables({ prefijoCuenta: '4' });
      expect(result.items).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('combina codPlan + activa + grupoCuenta', async () => {
      const fake = [{ COD_CTA: '430' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas')
        .query({ rquery: 'COD_PLAN==0001;CTA_ACTIVA==1;COD_GRUPO_CTA==G1' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasContables({
        codPlan: '0001',
        activa: true,
        grupoCuenta: 'G1',
      });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('propaga invalid_token en envelope 401', async () => {
      nock(BASE_URL)
        .get('/pcon/v2/cuentas')
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      await expect(client.listCuentasContables()).rejects.toMatchObject({ code: 'invalid_token' });
    });

    it('propaga server_error en envelope 500', async () => {
      nock(BASE_URL)
        .get('/pcon/v2/cuentas')
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      await expect(client.listCuentasContables()).rejects.toMatchObject({ code: 'server_error' });
    });
  });

  // -------------------------------------------------------------------------
  // listCuentasAnaliticas
  // -------------------------------------------------------------------------

  describe('listCuentasAnaliticas', () => {
    it('llama a /pcon/v2/cuentas-analiticas sin filtros por defecto', async () => {
      const fake = [{ COD_CTA_ANL: 'ANL001' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas-analiticas')
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasAnaliticas();
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('filtra por area — rquery AREA_ANL==VEN', async () => {
      const fake = [{ COD_CTA_ANL: 'ANL001', AREA_ANL: 'VEN' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas-analiticas')
        .query({ rquery: 'AREA_ANL==VEN' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasAnaliticas({ area: 'VEN' });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('filtra por delegacion — rquery DELEG==SEV', async () => {
      const fake = [{ COD_CTA_ANL: 'ANL002', DELEG: 'SEV' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas-analiticas')
        .query({ rquery: 'DELEG==SEV' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasAnaliticas({ delegacion: 'SEV' });
      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('filtra por prefijoCuenta — ge + lt sobre COD_CTA_ANL', async () => {
      const fake = [{ COD_CTA_ANL: 'C430001' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas-analiticas')
        .query({ rquery: 'COD_CTA_ANL=ge=C43;COD_CTA_ANL=lt=C44' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasAnaliticas({ prefijoCuenta: 'C43' });
      expect(result.items).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('filtra activa=true — rquery CTA_ACTIVA_ANL==1', async () => {
      const fake = [{ COD_CTA_ANL: 'ANL001' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas-analiticas')
        .query({ rquery: 'CTA_ACTIVA_ANL==1' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasAnaliticas({ activa: true });
      expect(result.items).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('combina codPlan + activa + grupoCuenta + area + delegacion', async () => {
      const fake = [{ COD_CTA_ANL: 'X001' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/cuentas-analiticas')
        .query({
          rquery: 'COD_PLAN==0001;CTA_ACTIVA_ANL==1;COD_GRUPO_ANL==GA1;AREA_ANL==COM;DELEG==MAD',
        })
        .reply(200, listEnv(fake, 1));

      const result = await client.listCuentasAnaliticas({
        codPlan: '0001',
        activa: true,
        grupoCuenta: 'GA1',
        area: 'COM',
        delegacion: 'MAD',
      });
      expect(result.items).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('propaga not_found en envelope 404', async () => {
      nock(BASE_URL)
        .get('/pcon/v2/cuentas-analiticas')
        .reply(200, { errorCode: '404', errorMessage: 'Not found', data: null });

      await expect(client.listCuentasAnaliticas()).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // -------------------------------------------------------------------------
  // exportAsientos
  // -------------------------------------------------------------------------

  describe('exportAsientos', () => {
    it('llama a /pcon/v2/export-asientos con empresa y cal obligatorios', async () => {
      const fake = [{ ASI_NUMERO: '1' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query({ empresa: '0001', cal: 'GRAL' })
        .reply(200, listEnv(fake, 1));

      const result = await client.exportAsientos({ empresa: '0001', cal: 'GRAL' });
      expect(result.items).toEqual(fake);
      expect(result.total).toBe(1);
      expect(result.truncated).toBe(false);
      expect(scope.isDone()).toBe(true);
    });

    it('incluye periodo como query param nativo', async () => {
      const fake = [{ ASI_NUMERO: '2' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query({ empresa: '0001', cal: 'GRAL', periodo: '03' })
        .reply(200, listEnv(fake, 1));

      const result = await client.exportAsientos({ empresa: '0001', cal: 'GRAL', periodo: '03' });
      expect(result.items).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('filtra por rango de fechas — FIQL ge + le sobre ASI_FCHASI', async () => {
      const fake = [{ ASI_NUMERO: '3' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query({
          empresa: '0001',
          cal: 'GRAL',
          rquery: 'ASI_FCHASI=ge=2024-01-01;ASI_FCHASI=le=2024-01-31',
        })
        .reply(200, listEnv(fake, 1));

      const result = await client.exportAsientos({
        empresa: '0001',
        cal: 'GRAL',
        fechaDesde: '2024-01-01',
        fechaHasta: '2024-01-31',
      });
      expect(result.items).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('filtra por diario — FIQL ASI_DIARIO==VEN', async () => {
      const fake = [{ ASI_DIARIO: 'VEN' }];
      const scope = nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query({ empresa: '0001', cal: 'GRAL', rquery: 'ASI_DIARIO==VEN' })
        .reply(200, listEnv(fake, 1));

      const result = await client.exportAsientos({
        empresa: '0001',
        cal: 'GRAL',
        diario: 'VEN',
      });
      expect(result.items).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('filtra borrador=true — FIQL ASI_BORR!=<vacío>', async () => {
      const fake = [{ ASI_BORR: 'B' }];
      nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query((q) => {
          return (
            q['empresa'] === '0001' &&
            q['cal'] === 'GRAL' &&
            typeof q['rquery'] === 'string' &&
            (q['rquery'] as string).startsWith('ASI_BORR!=')
          );
        })
        .reply(200, listEnv(fake, 1));

      const result = await client.exportAsientos({
        empresa: '0001',
        cal: 'GRAL',
        borrador: true,
      });
      expect(result.items).toEqual(fake);
    });

    it('filtra borrador=false — FIQL ASI_BORR==<vacío>', async () => {
      const fake = [{ ASI_BORR: null }];
      nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query((q) => {
          return (
            q['empresa'] === '0001' &&
            q['cal'] === 'GRAL' &&
            typeof q['rquery'] === 'string' &&
            (q['rquery'] as string).startsWith('ASI_BORR==')
          );
        })
        .reply(200, listEnv(fake, 1));

      const result = await client.exportAsientos({
        empresa: '0001',
        cal: 'GRAL',
        borrador: false,
      });
      expect(result.items).toEqual(fake);
    });

    it('respuesta dentro del límite → truncated=false, sin warning', async () => {
      process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'] = '10';

      const fake = Array.from({ length: 5 }, (_, i) => ({ ASI_NUMERO: `${i}` }));
      nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query({ empresa: '0001', cal: 'GRAL' })
        .reply(200, listEnv(fake, fake.length));

      const result = await client.exportAsientos({ empresa: '0001', cal: 'GRAL' });
      expect(result.truncated).toBe(false);
      expect(result.warning).toBeUndefined();
      expect(result.items.length).toBe(5);
    });

    it('respuesta > MAX_RESPONSE_SIZE_MB → truncated=true con warning y items reducidos', async () => {
      // Establecer límite muy pequeño (~10 bytes)
      process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'] = '0.00001';

      const largeItems = Array.from({ length: 50 }, (_, i) => ({
        ASI_NUMERO: `${i}`,
        DATA: 'Y'.repeat(200),
      }));

      nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query({ empresa: '0001', cal: 'GRAL' })
        .reply(200, listEnv(largeItems, largeItems.length));

      const result = await client.exportAsientos({ empresa: '0001', cal: 'GRAL' });

      expect(result.truncated).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('truncada');
      expect(result.items.length).toBeLessThan(largeItems.length);
      expect(result.total).toBe(50); // total original, no el truncado
    });

    it('respuesta vacía → truncated=false sin warning', async () => {
      nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query({ empresa: '0001', cal: 'GRAL' })
        .reply(200, listEnv([], 0));

      const result = await client.exportAsientos({ empresa: '0001', cal: 'GRAL' });
      expect(result.truncated).toBe(false);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('propaga invalid_token en envelope 401', async () => {
      nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query({ empresa: '0001', cal: 'GRAL' })
        .reply(200, { errorCode: '401', errorMessage: 'Unauthorized', data: null });

      await expect(
        client.exportAsientos({ empresa: '0001', cal: 'GRAL' }),
      ).rejects.toMatchObject({ code: 'invalid_token' });
    });

    it('propaga server_error en envelope 500', async () => {
      nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query({ empresa: '0001', cal: 'GRAL' })
        .reply(200, { errorCode: '500', errorMessage: 'Server error', data: null });

      await expect(
        client.exportAsientos({ empresa: '0001', cal: 'GRAL' }),
      ).rejects.toMatchObject({ code: 'server_error' });
    });

    it('usa default 10 MB cuando FREEMATICA_MAX_RESPONSE_SIZE_MB no está definido', async () => {
      delete process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'];

      // Respuesta de ~5 KB (muy por debajo de 10 MB) → no debe truncar
      const items = Array.from({ length: 10 }, (_, i) => ({ ASI_NUMERO: `${i}` }));
      nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query({ empresa: '0001', cal: 'GRAL' })
        .reply(200, listEnv(items, items.length));

      const result = await client.exportAsientos({ empresa: '0001', cal: 'GRAL' });
      expect(result.truncated).toBe(false);
    });

    it('usa default 10 MB cuando FREEMATICA_MAX_RESPONSE_SIZE_MB tiene valor inválido', async () => {
      process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'] = 'not-a-number';

      const items = [{ ASI_NUMERO: '1' }];
      nock(BASE_URL)
        .get('/pcon/v2/export-asientos')
        .query({ empresa: '0001', cal: 'GRAL' })
        .reply(200, listEnv(items, 1));

      const result = await client.exportAsientos({ empresa: '0001', cal: 'GRAL' });
      expect(result.truncated).toBe(false);
    });
  });
});
