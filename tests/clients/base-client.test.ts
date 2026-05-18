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

describe('BaseClient', () => {
  let client: TestClient;

  beforeEach(() => {
    client = new TestClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

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
      .reply(200, { ok: true });

    const res = await client.testGet<{ ok: boolean }>('/ping');

    expect(res).toEqual({ ok: true });
    expect(scope.isDone()).toBe(true);
  });

  it('maps 401 to invalid_token', async () => {
    nock(BASE_URL).get('/x').reply(401, { error: 'unauthorized' });
    await expect(client.testGet('/x')).rejects.toMatchObject({
      code: 'invalid_token',
    });
  });

  it('maps 403 to forbidden', async () => {
    nock(BASE_URL).get('/x').reply(403);
    await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('maps 404 to not_found', async () => {
    nock(BASE_URL).get('/x').reply(404);
    await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('maps 429 to rate_limit_exceeded', async () => {
    nock(BASE_URL).get('/x').reply(429, '', { 'retry-after': '5' });
    await expect(client.testGet('/x')).rejects.toMatchObject({
      code: 'rate_limit_exceeded',
    });
  });

  it('maps 500 to server_error', async () => {
    nock(BASE_URL).get('/x').reply(500);
    await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'server_error' });
  });

  it('maps network error to network_error', async () => {
    nock(BASE_URL).get('/x').replyWithError({ code: 'ECONNREFUSED', message: 'down' });
    await expect(client.testGet('/x')).rejects.toMatchObject({ code: 'network_error' });
  });

  it('FreematicaError is an Error instance with code property', () => {
    const e = new FreematicaError('forbidden', 'nope');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('forbidden');
    expect(e.message).toBe('nope');
  });
});
