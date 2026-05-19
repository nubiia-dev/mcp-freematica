import { describe, it, expect } from 'vitest';
import {
  MASTER_DATA_CATALOGS,
  CATALOG_ENDPOINTS,
  MasterDataCatalogSchema,
} from '../../src/schemas/master-data.js';

describe('MASTER_DATA_CATALOGS', () => {
  it('includes the 19 expected catalogs in stable order', () => {
    expect(MASTER_DATA_CATALOGS).toEqual([
      'tipos-contrato',
      'tipo-instalacion',
      'clases-servicios',
      'tipos-casos',
      'subtipos-casos',
      'tipos-oportunidad-negocio',
      'tipos-impuestos',
      'tipos-marcajes',
      'naturalezas-abono',
      'paises',
      'nacionalidades',
      'provincias',
      'poblaciones',
      'empresas',
      'delegaciones',
      'lineas-negocio',
      'cargos-clientes',
      'familias',
      'subfamilias',
    ]);
    expect(MASTER_DATA_CATALOGS).toHaveLength(19);
  });
});

describe('CATALOG_ENDPOINTS', () => {
  it('has an endpoint mapping for every catalog in the enum', () => {
    for (const catalog of MASTER_DATA_CATALOGS) {
      expect(CATALOG_ENDPOINTS[catalog]).toBeDefined();
      expect(CATALOG_ENDPOINTS[catalog]).toMatch(/^\/[a-z]/);
    }
  });

  it('maps tipos-contrato to /ppre/v2/tipos-contrato', () => {
    expect(CATALOG_ENDPOINTS['tipos-contrato']).toBe('/ppre/v2/tipos-contrato');
  });

  it('maps clases-servicios to /pvss/v1/clases-servicios', () => {
    expect(CATALOG_ENDPOINTS['clases-servicios']).toBe('/pvss/v1/clases-servicios');
  });

  it('maps delegaciones to /pgrl/v2/delegaciones (v2, not v1)', () => {
    expect(CATALOG_ENDPOINTS['delegaciones']).toBe('/pgrl/v2/delegaciones');
  });

  it('maps poblaciones to /pgrl/v2/poblaciones', () => {
    expect(CATALOG_ENDPOINTS['poblaciones']).toBe('/pgrl/v2/poblaciones');
  });
});

describe('MasterDataCatalogSchema', () => {
  it('accepts every catalog value', () => {
    for (const catalog of MASTER_DATA_CATALOGS) {
      expect(() => MasterDataCatalogSchema.parse(catalog)).not.toThrow();
    }
  });

  it('rejects unknown catalogs', () => {
    expect(() => MasterDataCatalogSchema.parse('not-a-catalog')).toThrow();
  });
});
