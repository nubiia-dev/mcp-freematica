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

describe('FreematicaClient', () => {
  let client: FreematicaClient;

  beforeEach(() => {
    client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getMaterialesAsignadosServicios', () => {
    it('calls GET /pvss/v2/contratos-servicios-material and returns the array', async () => {
      const fakeData = [
        { idreg: 1, material: 'cable RJ45', servicio: 'SVC-100' },
        { idreg: 2, material: 'router', servicio: 'SVC-101' },
      ];
      const scope = nock(BASE_URL)
        .get('/pvss/v2/contratos-servicios-material')
        .reply(200, fakeData);

      const result = await client.getMaterialesAsignadosServicios();

      expect(result).toEqual(fakeData);
      expect(scope.isDone()).toBe(true);
    });

    it('returns empty array when API returns empty array', async () => {
      nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(200, []);
      const result = await client.getMaterialesAsignadosServicios();
      expect(result).toEqual([]);
    });

    it('propagates FreematicaError on 401', async () => {
      nock(BASE_URL).get('/pvss/v2/contratos-servicios-material').reply(401);
      await expect(client.getMaterialesAsignadosServicios()).rejects.toMatchObject({
        code: 'invalid_token',
      });
    });
  });
});
