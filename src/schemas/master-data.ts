import { z } from 'zod';

/**
 * Enum de catálogos de datos maestros disponibles en el API de Freemática.
 *
 * Cada entrada en este array corresponde a un catálogo consultable vía
 * `freematica_get_master_data`. El endpoint asociado está definido en
 * `CATALOG_ENDPOINTS`.
 *
 * Para añadir un nuevo catálogo:
 *   1. Añadir el nombre aquí (mantener orden: tipos, geográficos, organizativos, inventario, financiero)
 *   2. Añadir el endpoint en `CATALOG_ENDPOINTS`
 *   3. Añadir descripción en `CATALOG_DESCRIPTIONS` de `src/tools/master-data.ts`
 *   4. Añadir fila en la tabla "Datos maestros disponibles" del README
 *   5. Añadir test en `tests/schemas/master-data.test.ts` y `tests/tools/master-data.test.ts`
 */
export const MASTER_DATA_CATALOGS = [
  // --- Tipos / clasificaciones ---
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
  // --- Geográficos ---
  'paises',
  'nacionalidades',
  'provincias',
  'poblaciones',
  // --- Organizativos ---
  'empresas',
  'delegaciones',
  'lineas-negocio',
  'cargos-clientes',
  'calendarios',
  'series',
  // --- Inventario ---
  'familias',
  'subfamilias',
  'lineas',
  // --- Financiero ---
  'bancos',
] as const;

export type MasterDataCatalog = typeof MASTER_DATA_CATALOGS[number];

export const MasterDataCatalogSchema = z.enum(MASTER_DATA_CATALOGS);

/**
 * Mapeo catálogo → endpoint REST de Freemática.
 *
 * Solo se incluyen endpoints que funcionan sin parámetros requeridos adicionales.
 * Catálogos que requieren parámetros obligatorios no documentados (ej: `tipos-marcajes`
 * con `sTipoMarcaje`) quedan excluidos hasta descubrir los valores válidos.
 */
export const CATALOG_ENDPOINTS: Record<MasterDataCatalog, string> = {
  // Tipos / clasificaciones
  'tipos-contrato': '/ppre/v2/tipos-contrato',
  'tipo-instalacion': '/ppre/v1/tipo-instalacion',
  'clases-servicios': '/pvss/v1/clases-servicios',
  'tipos-casos': '/pcrm/v2/tipos-casos',
  'subtipos-casos': '/pcrm/v2/subtipos-casos',
  'tipos-oportunidad-negocio': '/pcrm/v2/tipos-oportunidad-negocio',
  'tipos-impuestos': '/pgrl/v2/tipos-impuestos',
  'naturalezas-abono': '/pven/v1/naturalezas-abono',
  incidencecode: '/pvss/v2/incidencecode',
  'claves-facturacion': '/pvss/v2/claves-facturacion',
  // Geográficos
  paises: '/pgrl/v1/paises',
  nacionalidades: '/pgrl/v1/nacionalidades',
  provincias: '/pgrl/v1/provincias',
  poblaciones: '/pgrl/v2/poblaciones',
  // Organizativos
  empresas: '/pgrl/v1/empresas',
  delegaciones: '/pgrl/v1/delegaciones/agrupcod',
  'lineas-negocio': '/pgrl/v2/lineas-negocio',
  'cargos-clientes': '/pgrl/v2/cargos-clientes',
  calendarios: '/pgrl/v1/calendarios',
  series: '/pgrl/v2/series',
  // Inventario
  familias: '/part/v1/familias',
  subfamilias: '/part/v1/subfamilias',
  lineas: '/part/v1/lineas',
  // Financiero
  bancos: '/pgrl/v2/bancos',
};
