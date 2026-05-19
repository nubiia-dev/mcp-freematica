import { z } from 'zod';

export const MASTER_DATA_CATALOGS = [
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
] as const;

export type MasterDataCatalog = typeof MASTER_DATA_CATALOGS[number];

export const MasterDataCatalogSchema = z.enum(MASTER_DATA_CATALOGS);

export const CATALOG_ENDPOINTS: Record<MasterDataCatalog, string> = {
  'tipos-contrato': '/ppre/v2/tipos-contrato',
  'tipo-instalacion': '/ppre/v1/tipo-instalacion',
  'clases-servicios': '/pvss/v1/clases-servicios',
  'tipos-casos': '/pcrm/v2/tipos-casos',
  'subtipos-casos': '/pcrm/v2/subtipos-casos',
  'tipos-oportunidad-negocio': '/pcrm/v2/tipos-oportunidad-negocio',
  'tipos-impuestos': '/pgrl/v2/tipos-impuestos',
  'tipos-marcajes': '/pkai/v1/tiposmarcajes',
  'naturalezas-abono': '/pven/v1/naturalezas-abono',
  paises: '/pgrl/v1/paises',
  nacionalidades: '/pgrl/v1/nacionalidades',
  provincias: '/pgrl/v1/provincias',
  poblaciones: '/pgrl/v2/poblaciones',
  empresas: '/pgrl/v1/empresas',
  delegaciones: '/pgrl/v1/delegaciones',
  'lineas-negocio': '/pgrl/v2/lineas-negocio',
  'cargos-clientes': '/pgrl/v2/cargos-clientes',
  familias: '/part/v1/familias',
  subfamilias: '/part/v1/subfamilias',
};
