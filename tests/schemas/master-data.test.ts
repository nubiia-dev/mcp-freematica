import { describe, it, expect } from 'vitest';
import {
  MASTER_DATA_CATALOGS,
  CATALOG_ENDPOINTS,
  MasterDataCatalogSchema,
} from '../../src/schemas/master-data.js';

describe('MASTER_DATA_CATALOGS', () => {
  it('includes the 24 expected catalogs in stable order', () => {
    expect(MASTER_DATA_CATALOGS).toEqual([
      // Tipos / clasificaciones
      'tipos-contrato',
      'tipo-instalacion',
      'clases-servicios',
      'tipos-casos',
      'subtipos-casos',
      'tipos-oportunidad-negocio',
      'tipos-impuestos',
      'naturalezas-abono',
      'incidencecode',
      'claves-facturacion',
      // Geográficos
      'paises',
      'nacionalidades',
      'provincias',
      'poblaciones',
      // Organizativos
      'empresas',
      'delegaciones',
      'lineas-negocio',
      'cargos-clientes',
      'calendarios',
      'series',
      // Inventario
      'familias',
      'subfamilias',
      'lineas',
      // Financiero
      'bancos',
    ]);
    expect(MASTER_DATA_CATALOGS).toHaveLength(24);
  });

  it('does not include tipos-marcajes (broken upstream — requires sTipoMarcaje param)', () => {
    expect(MASTER_DATA_CATALOGS).not.toContain('tipos-marcajes');
  });

  // ------------------------------------------------------------------ TD-122
  it('includes lineas-negocio (verified in v0.4.1)', () => {
    expect(MASTER_DATA_CATALOGS).toContain('lineas-negocio');
  });

  it('includes the 6 new catalogs added in v0.5.0 (TD-122)', () => {
    const newCatalogs = ['bancos', 'series', 'lineas', 'incidencecode', 'calendarios', 'claves-facturacion'];
    for (const catalog of newCatalogs) {
      expect(MASTER_DATA_CATALOGS).toContain(catalog);
    }
  });
});

describe('CATALOG_ENDPOINTS', () => {
  it('has an endpoint mapping for every catalog in the enum', () => {
    for (const catalog of MASTER_DATA_CATALOGS) {
      expect(CATALOG_ENDPOINTS[catalog]).toBeDefined();
      expect(CATALOG_ENDPOINTS[catalog]).toMatch(/^\/[a-z]/);
    }
  });

  it('every endpoint starts with / and has at least two path segments', () => {
    for (const catalog of MASTER_DATA_CATALOGS) {
      const endpoint = CATALOG_ENDPOINTS[catalog];
      expect(endpoint.startsWith('/')).toBe(true);
      expect(endpoint.split('/').length).toBeGreaterThanOrEqual(3);
    }
  });

  // Existing catalogs (spot checks)
  it('maps tipos-contrato to /ppre/v2/tipos-contrato', () => {
    expect(CATALOG_ENDPOINTS['tipos-contrato']).toBe('/ppre/v2/tipos-contrato');
  });

  it('maps clases-servicios to /pvss/v1/clases-servicios', () => {
    expect(CATALOG_ENDPOINTS['clases-servicios']).toBe('/pvss/v1/clases-servicios');
  });

  it('maps delegaciones to /pgrl/v1/delegaciones/agrupcod (other variants require empresa param)', () => {
    expect(CATALOG_ENDPOINTS['delegaciones']).toBe('/pgrl/v1/delegaciones/agrupcod');
  });

  it('maps poblaciones to /pgrl/v2/poblaciones', () => {
    expect(CATALOG_ENDPOINTS['poblaciones']).toBe('/pgrl/v2/poblaciones');
  });

  // TD-122 — lineas-negocio verification
  it('maps lineas-negocio to /pgrl/v2/lineas-negocio', () => {
    expect(CATALOG_ENDPOINTS['lineas-negocio']).toBe('/pgrl/v2/lineas-negocio');
  });

  // TD-122 — new catalog endpoint mappings
  it('maps bancos to /pgrl/v2/bancos', () => {
    expect(CATALOG_ENDPOINTS['bancos']).toBe('/pgrl/v2/bancos');
  });

  it('maps series to /pgrl/v2/series', () => {
    expect(CATALOG_ENDPOINTS['series']).toBe('/pgrl/v2/series');
  });

  it('maps lineas to /part/v1/lineas', () => {
    expect(CATALOG_ENDPOINTS['lineas']).toBe('/part/v1/lineas');
  });

  it('maps incidencecode to /pvss/v2/incidencecode', () => {
    expect(CATALOG_ENDPOINTS['incidencecode']).toBe('/pvss/v2/incidencecode');
  });

  it('maps calendarios to /pgrl/v1/calendarios', () => {
    expect(CATALOG_ENDPOINTS['calendarios']).toBe('/pgrl/v1/calendarios');
  });

  it('maps claves-facturacion to /pvss/v2/claves-facturacion', () => {
    expect(CATALOG_ENDPOINTS['claves-facturacion']).toBe('/pvss/v2/claves-facturacion');
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

  it('rejects tipos-marcajes (removed in v0.4.1)', () => {
    expect(() => MasterDataCatalogSchema.parse('tipos-marcajes')).toThrow();
  });

  // TD-122 — lineas-negocio and new catalogs are accepted
  it('accepts lineas-negocio', () => {
    expect(() => MasterDataCatalogSchema.parse('lineas-negocio')).not.toThrow();
  });

  it('accepts bancos', () => {
    expect(() => MasterDataCatalogSchema.parse('bancos')).not.toThrow();
  });

  it('accepts series', () => {
    expect(() => MasterDataCatalogSchema.parse('series')).not.toThrow();
  });

  it('accepts incidencecode', () => {
    expect(() => MasterDataCatalogSchema.parse('incidencecode')).not.toThrow();
  });

  it('accepts calendarios', () => {
    expect(() => MasterDataCatalogSchema.parse('calendarios')).not.toThrow();
  });

  it('accepts claves-facturacion', () => {
    expect(() => MasterDataCatalogSchema.parse('claves-facturacion')).not.toThrow();
  });

  it('accepts lineas', () => {
    expect(() => MasterDataCatalogSchema.parse('lineas')).not.toThrow();
  });
});
