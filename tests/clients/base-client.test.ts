import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { BaseClient, FreematicaError } from '../../src/clients/base-client.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

class TestClient extends BaseClient {
  testGet<T>(path: string): Promise<T> {
    return this.get<T>(path);
  }
}

function envelope<T>(data: T, errorCode = '200', errorMessage = ''): {
  errorCode: string;
  errorMessage: string;
  data: T;
} {
  return { errorCode, errorMessage, data };
}

describe('BaseClient', () => {
  let client: TestClient;

  beforeEach(() => {
    client = new TestClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('header injection', () => {
    it('injects all auth headers and Content-Type on GET', async () => {
      const scope = nock(BASE_URL, {
        reqheaders: {
          'x-auth-token': 'tok',
          'x-auth-company': 'co',
          'x-auth-organization': 'org',
          'x-auth-app': 'app',
          'x-auth-session': 'ses',
          'content-type': 'application/json',
        },
      })
        .get('/ping')
        .reply(200, envelope({ ok: true }));

      const res = await client.testGet<{ ok: boolean }>('/ping');
      expect(res).toEqual({ ok: true });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('envelope unwrap', () => {
    it('returns envelope.data on success (errorCode=200)', async () => {
      nock(BASE_URL).get('/x').reply(200, envelope({ foo: 'bar' }));
      const r = await client.testGet<{ foo: string }>('/x');
      expect(r).toEqual({ foo: 'bar' });
    });

    it('unwraps list-shaped data correctly', async () => {
      const list = { total: '42', items: [{ a: 1 }, { a: 2 }], rowHeight: -1 };
      nock(BASE_URL).get('/list').reply(200, envelope(list));
      const r = await client.testGet<typeof list>('/list');
      expect(r).toEqual(list);
    });
  });

  describe('envelope errorCode mapping', () => {
    it('maps envelope.errorCode=401 to invalid_token', async () => {
      nock(BASE_URL).get('/x').reply(200, envelope(null, '401', 'Unauthorized'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'invalid_token' });
    });

    it('maps envelope.errorCode=403 to forbidden', async () => {
      nock(BASE_URL).get('/x').reply(200, envelope(null, '403', 'Forbidden'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'forbidden' });
    });

    it('maps envelope.errorCode=404 to not_found', async () => {
      nock(BASE_URL).get('/x').reply(200, envelope(null, '404', 'Not Found'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'not_found' });
    });

    it('maps envelope.errorCode=429 to rate_limit_exceeded', async () => {
      nock(BASE_URL).get('/x').reply(200, envelope(null, '429', 'Too Many'));
      await expect(client.testGet('/x')).rejects.toMatchObject({
        code: 'rate_limit_exceeded',
      });
    });

    it('maps envelope.errorCode=500 to server_error', async () => {
      nock(BASE_URL).get('/x').reply(200, envelope(null, '500', 'Internal Error'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
    });

    it('maps envelope.errorCode=503 to server_error', async () => {
      nock(BASE_URL).get('/x').reply(200, envelope(null, '503', 'Service Unavailable'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
    });

    it('falls back to unexpected_error for unknown envelope.errorCode', async () => {
      nock(BASE_URL).get('/x').reply(200, envelope(null, '999', 'Weird'));
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'unexpected_error' });
    });

    it('includes errorMessage in the FreematicaError message', async () => {
      nock(BASE_URL).get('/x').reply(200, envelope(null, '404', 'Resource gone'));
      await expect(client.testGet('/x')).rejects.toMatchObject({
        message: expect.stringContaining('Resource gone'),
      });
    });
  });

  describe('HTTP-level error mapping (axios errors)', () => {
    it('maps HTTP 401 to invalid_token', async () => {
      nock(BASE_URL).get('/x').reply(401, { error: 'unauthorized' });
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'invalid_token' });
    });

    it('maps HTTP 403 to forbidden', async () => {
      nock(BASE_URL).get('/x').reply(403);
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'forbidden' });
    });

    it('maps HTTP 404 to not_found', async () => {
      nock(BASE_URL).get('/x').reply(404);
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'not_found' });
    });

    it('maps HTTP 429 to rate_limit_exceeded', async () => {
      nock(BASE_URL).get('/x').reply(429, '', { 'retry-after': '5' });
      await expect(client.testGet('/x')).rejects.toMatchObject({
        code: 'rate_limit_exceeded',
        retryAfter: 5,
      });
    });

    it('maps HTTP 500 to server_error', async () => {
      nock(BASE_URL).get('/x').reply(500);
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
    });

    it('maps network error to network_error', async () => {
      nock(BASE_URL).get('/x').replyWithError({ code: 'ECONNREFUSED', message: 'down' });
      await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'network_error' });
    });
  });

  describe('FreematicaError', () => {
    it('is an Error instance with code property', () => {
      const e = new FreematicaError('forbidden', 'nope');
      expect(e).toBeInstanceOf(Error);
      expect(e.code).toBe('forbidden');
      expect(e.message).toBe('nope');
    });
  });
});
