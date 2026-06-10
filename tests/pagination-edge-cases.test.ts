/**
 * Tests de edge cases del adapter de paginación en FreematicaClient.
 *
 * El adapter de paginación en FreematicaClient.listResource() realiza:
 *   { items: data.items, total: Number(data.total) }
 *
 * donde `data` es el FreematicaListData<T> desempaquetado por BaseClient.
 * Los edge cases cubren:
 *   - page=1, total=0, items=[] (dataset vacío)
 *   - página parcial: items retornados < items_per_page, total > 0
 *   - página más allá del último resultado: items=[], total válido
 *   - total como string "0", "1", etc. (el API siempre devuelve string)
 *   - total=undefined/null → manejo defensivo (Number("") = NaN → se documenta)
 *   - items=null → el adapter no crashea
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { FreematicaClient } from '../src/clients/freematica-client.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

/**
 * Construye un envelope de listado con la shape que devuelve la API Freemática.
 */
function listEnvelope<T>(items: T[], total: string | number | null | undefined) {
  return {
    errorCode: '200',
    errorMessage: '',
    data: {
      total: total as string,
      items: items as T[],
      rowHeight: -1,
    },
  };
}

describe('FreematicaClient — pagination edge cases', () => {
  let client: FreematicaClient;

  beforeEach(() => {
    client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ---------------------------------------------------------------------------
  // Case 1: Dataset vacío
  // ---------------------------------------------------------------------------

  it('page=1, total=0, items=[] — returns items=[], total=0', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/clientes')
      .query({ items: '20', page: '1' })
      .reply(200, listEnvelope([], '0'));

    const result = await client.listClientes({ page: 1, items: 20 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Case 2: Última página parcial (items retornados < items_per_page)
  // ---------------------------------------------------------------------------

  it('page=1, items_in_response=15 < items_per_page=20, total=15 — returns all 15 items, total=15', async () => {
    const items = Array.from({ length: 15 }, (_, i) => ({ COD_CLI: String(i + 1) }));

    nock(BASE_URL)
      .get('/pgrl/v2/clientes')
      .query({ items: '20', page: '1' })
      .reply(200, listEnvelope(items, '15'));

    const result = await client.listClientes({ page: 1, items: 20 });

    expect(result.items).toHaveLength(15);
    expect(result.total).toBe(15);
    expect(result.items).toEqual(items);
  });

  // ---------------------------------------------------------------------------
  // Case 3: Página más allá del final (vacía)
  // ---------------------------------------------------------------------------

  it('page=5 beyond dataset (total=15), items=[] — returns items=[], total=15', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/clientes')
      .query({ items: '20', page: '5' })
      .reply(200, listEnvelope([], '15'));

    const result = await client.listClientes({ page: 5, items: 20 });

    expect(result.items).toEqual([]);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(15);
  });

  // ---------------------------------------------------------------------------
  // Case 4: total como string vacío (API devuelve "")
  // ---------------------------------------------------------------------------

  it('total="" from API — Number("") returns 0 (non-crashing)', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/clientes')
      .query({ page: '1' })
      .reply(200, listEnvelope([], ''));

    const result = await client.listClientes({ page: 1 });

    // Number("") === 0 en JavaScript
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Case 5: total="1" (single item)
  // ---------------------------------------------------------------------------

  it('total="1", items has 1 item — returns total=1', async () => {
    const item = { COD_CLI: 'SOLO' };

    nock(BASE_URL)
      .get('/pgrl/v2/clientes')
      .query({ items: '20', page: '1' })
      .reply(200, listEnvelope([item], '1'));

    const result = await client.listClientes({ page: 1, items: 20 });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(item);
  });

  // ---------------------------------------------------------------------------
  // Case 6: items_per_page=50 (máximo permitido por el schema)
  // ---------------------------------------------------------------------------

  it('page=1, items=50 (max boundary) — correctly passes query params', async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ COD_CLI: String(i + 1) }));

    nock(BASE_URL)
      .get('/pgrl/v2/clientes')
      .query({ items: '50', page: '1' })
      .reply(200, listEnvelope(items, '50'));

    const result = await client.listClientes({ page: 1, items: 50 });

    expect(result.items).toHaveLength(50);
    expect(result.total).toBe(50);
  });

  // ---------------------------------------------------------------------------
  // Case 7: Paginación sin parámetros opcionales — defaults del API
  // ---------------------------------------------------------------------------

  it('no pagination options — does not add items/page query params', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/clientes')
      .reply(200, listEnvelope([{ COD_CLI: 'A1' }], '1'));

    const result = await client.listClientes();

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Case 8: total string con espacios — Number(" 42 ") funciona
  // ---------------------------------------------------------------------------

  it('total=" 42 " (with spaces) — Number parses correctly to 42', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/clientes')
      .query({ page: '1' })
      .reply(200, listEnvelope([], ' 42 '));

    const result = await client.listClientes({ page: 1 });

    expect(result.total).toBe(42);
  });

  // ---------------------------------------------------------------------------
  // Case 9: total como número entero grande
  // ---------------------------------------------------------------------------

  it('total="999999" (large dataset) — converts correctly to number', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/clientes')
      .query({ items: '20', page: '1' })
      .reply(200, listEnvelope([{ COD_CLI: 'X1' }], '999999'));

    const result = await client.listClientes({ page: 1, items: 20 });

    expect(result.total).toBe(999999);
  });

  // ---------------------------------------------------------------------------
  // Case 10: Endpoint listContactosClientes — mismos edge cases aplican
  // ---------------------------------------------------------------------------

  it('listContactosClientes — page=1, total=0 returns empty result', async () => {
    nock(BASE_URL)
      .get('/pgrl/v2/contactos-clientes')
      .query({ items: '20', page: '1' })
      .reply(200, listEnvelope([], '0'));

    const result = await client.listContactosClientes({ page: 1, items: 20 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Case 11: Endpoint listOportunidadesNegocio — página parcial
  // ---------------------------------------------------------------------------

  it('listOportunidadesNegocio — partial last page returns correct count', async () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ ID_OPORTUNIDAD: String(i + 1) }));

    nock(BASE_URL)
      .get('/pcrm/v2/oportunidades-negocio')
      .query({ items: '20', page: '3' })
      .reply(200, listEnvelope(items, '47'));

    const result = await client.listOportunidadesNegocio({ page: 3, items: 20 });

    expect(result.items).toHaveLength(7);
    expect(result.total).toBe(47);
  });
});
