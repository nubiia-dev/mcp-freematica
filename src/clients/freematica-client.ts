import { BaseClient } from './base-client.js';
import { buildFiql, appendRquery } from './fiql-builder.js';
import { CATALOG_ENDPOINTS, type MasterDataCatalog } from '../schemas/master-data.js';
import {
  ESTADO_CARTERA_FIQL_MAP,
  type ListCarteraFilters,
} from '../schemas/cartera.js';
import type {
  ListFacturasCabeceraFilters,
  ListFacturaLineasFilters,
  ListFacturaIvaFilters,
  ListFacturaVencimientosFilters,
} from '../schemas/facturas-ventas.js';
import type { FreematicaListData } from '../types/api-envelope.js';
import type { Cliente } from '../types/clientes.js';
import type { ContactoCliente } from '../types/contactos-clientes.js';
import type { MasterDataItem } from '../types/master-data.js';
import type { OportunidadNegocio } from '../types/oportunidades-negocio.js';
import type { VoContratosServMatAsignado } from '../types/contratos.js';

export interface ListResult<T> {
  items: T[];
  total: number;
}

export interface ListOptions {
  page?: number;
  items?: number;
}

/**
 * Typed client for the Freemática REST API.
 *
 * One method per exposed endpoint (or per family of endpoints). The wrapper
 * `{ errorCode, errorMessage, data }` is unwrapped by `BaseClient.request`,
 * so methods only see `data`.
 *
 * For list endpoints, `data` has shape `{ total, items, rowHeight }`. List
 * methods unwrap that to `{ items, total }` (string total → number; rowHeight
 * discarded).
 *
 * For detail endpoints, `data` is the entity directly.
 */
export class FreematicaClient extends BaseClient {
  // ---------------------------------------------------------------------------
  // Existing endpoints (v0.1.0, v0.3.0) — shape adjusted for the unwrap fix
  // ---------------------------------------------------------------------------

  /**
   * Obtener lista de material asignado a servicios.
   *
   * Endpoint: GET /pvss/v2/contratos-servicios-material
   */
  async getMaterialesAsignadosServicios(): Promise<ListResult<VoContratosServMatAsignado>> {
    const data = await this.get<FreematicaListData<VoContratosServMatAsignado>>(
      '/pvss/v2/contratos-servicios-material',
    );
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Obtener un catálogo de datos maestros.
   */
  async getMasterData(catalog: MasterDataCatalog): Promise<ListResult<MasterDataItem>> {
    const endpoint = CATALOG_ENDPOINTS[catalog];
    const data = await this.get<FreematicaListData<MasterDataItem>>(endpoint);
    return { items: data.items, total: Number(data.total) };
  }

  // ---------------------------------------------------------------------------
  // Clientes (v0.4.0)
  // ---------------------------------------------------------------------------

  /** Lista paginada de clientes. */
  async listClientes(opts: ListOptions = {}): Promise<ListResult<Cliente>> {
    return this.listResource<Cliente>('/pgrl/v2/clientes', opts);
  }

  /** Detalle de un cliente por `idReg` opaco. */
  async getCliente(idReg: string): Promise<Cliente> {
    return this.get<Cliente>(`/pgrl/v2/clientes/${encodeURIComponent(idReg)}`);
  }

  // ---------------------------------------------------------------------------
  // Contactos clientes (v0.4.0)
  // ---------------------------------------------------------------------------

  /** Lista paginada de contactos de clientes. */
  async listContactosClientes(opts: ListOptions = {}): Promise<ListResult<ContactoCliente>> {
    return this.listResource<ContactoCliente>('/pgrl/v2/contactos-clientes', opts);
  }

  // ---------------------------------------------------------------------------
  // Oportunidades de negocio (v0.4.0)
  // ---------------------------------------------------------------------------

  /** Lista paginada de oportunidades de negocio. */
  async listOportunidadesNegocio(opts: ListOptions = {}): Promise<ListResult<OportunidadNegocio>> {
    return this.listResource<OportunidadNegocio>('/pcrm/v2/oportunidades-negocio', opts);
  }

  /** Detalle de una oportunidad por `idReg` opaco. */
  async getOportunidadNegocio(idReg: string): Promise<OportunidadNegocio> {
    return this.get<OportunidadNegocio>(
      `/pcrm/v2/oportunidades-negocio/${encodeURIComponent(idReg)}`,
    );
  }

  /**
   * Datos ampliados de una oportunidad por `idReg` opaco.
   *
   * Puede devolver `not_found` si la oportunidad no tiene datos ampliados.
   * El caller debe manejar el `FreematicaError` con código `not_found`.
   */
  async getOportunidadNegocioDatosAmpliados(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pcrm/v2/oportunidades-negocio/${encodeURIComponent(idReg)}/datos-ampliados`,
    );
  }

  // ---------------------------------------------------------------------------
  // Cartera de clientes (v0.5.0)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de documentos de cartera de clientes con filtros FIQL.
   *
   * Endpoint: GET /pcar/v1/cartera-clientes
   *
   * Construye la FIQL a partir de los filtros tipados y la añade como `rquery`
   * usando `appendRquery()` (patrón canónico del foundation TD-117).
   *
   * El filtro `soloImpagados=true` genera `CARCL_FECIMPAG!=null`, donde el
   * valor `'null'` es la convención centinela de Freemática para indicar "sin
   * valor" en campos de fecha opcionales (assumption empírica: observado en
   * datos reales de la API; documentado para futuras implementaciones).
   * El operador `ne` se pasa vía `buildFiql` para garantizar escaping
   * consistente con el resto de filtros.
   *
   * El filtro `estado` mapea a los valores numéricos de `CARCL_SITCAR`
   * (1=pendiente, 2=cancelado, 3=derivado).
   *
   * @param opts - Filtros tipados del schema `ListCarteraFiltersSchema`.
   * @returns Lista paginada de documentos de cartera.
   */
  async listCarteraClientes(opts: ListCarteraFilters = {}): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('/pcar/v1/cartera-clientes', 'http://x');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    // Build FIQL parts. Each scalar filter is a separate buildFiql call so that
    // two range constraints on the same field (e.g. CARCL_FECDOC =ge= X and
    // CARCL_FECDOC =le= Y) don't overwrite each other in a single object.
    const parts: string[] = [];

    // Equality filters (all go into one group → joined with AND)
    const eqGroup: Record<string, import('./fiql-builder.js').FiqlValue | undefined> = {};
    if (opts.empresa !== undefined) eqGroup['CARCL_EMP'] = opts.empresa;
    if (opts.codCliente !== undefined) eqGroup['CARCL_CODAUX'] = opts.codCliente;
    if (opts.grupoCliente !== undefined) eqGroup['CARCL_GRUPAUX'] = opts.grupoCliente;
    if (opts.representante !== undefined) eqGroup['CARCL_CODREP'] = opts.representante;
    if (opts.formaPago !== undefined) eqGroup['CARCL_CODFPAG'] = opts.formaPago;
    if (opts.modoPago !== undefined) eqGroup['CARCL_CODMPAG'] = opts.modoPago;
    if (opts.estado !== undefined) eqGroup['CARCL_SITCAR'] = ESTADO_CARTERA_FIQL_MAP[opts.estado];
    if (opts.referencia !== undefined) eqGroup['CARCL_REFCAR'] = opts.referencia;

    const eqFiql = buildFiql(eqGroup);
    if (eqFiql) parts.push(eqFiql);

    // Range filters: each gets its own buildFiql call to preserve both endpoints
    if (opts.fechaDocDesde !== undefined) parts.push(buildFiql({ CARCL_FECDOC: { op: 'ge', value: opts.fechaDocDesde } }));
    if (opts.fechaDocHasta !== undefined) parts.push(buildFiql({ CARCL_FECDOC: { op: 'le', value: opts.fechaDocHasta } }));
    if (opts.fechaVencimientoDesde !== undefined) parts.push(buildFiql({ CARCL_FECVCTO: { op: 'ge', value: opts.fechaVencimientoDesde } }));
    if (opts.fechaVencimientoHasta !== undefined) parts.push(buildFiql({ CARCL_FECVCTO: { op: 'le', value: opts.fechaVencimientoHasta } }));

    // soloImpagados: 'null' es el centinela de Freemática para fecha sin valor.
    // Se pasa por buildFiql (op 'ne') igual que el resto de filtros para
    // garantizar escaping uniforme y legibilidad del código.
    if (opts.soloImpagados === true) {
      parts.push(buildFiql({ CARCL_FECIMPAG: { op: 'ne', value: 'null' } }));
    }

    appendRquery(url, parts.join(';'));

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Detalle de un documento de cartera de clientes por `idReg` opaco.
   *
   * Endpoint: GET /pcar/v1/cartera-clientes/{idreg}
   *
   * @param idReg - Identificador opaco (base64) del documento.
   * @returns Documento de cartera completo.
   */
  async getCarteraCliente(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pcar/v1/cartera-clientes/${encodeURIComponent(idReg)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Facturas de ventas (v0.5.0)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de cabeceras de facturas de ventas con filtros FIQL.
   *
   * Endpoint: GET /pven/v1/facturas-cabecera
   *
   * @param opts - Filtros tipados del schema `ListFacturasCabeceraFiltersSchema`.
   * @returns Lista paginada de cabeceras de facturas.
   */
  async listFacturasCabecera(opts: ListFacturasCabeceraFilters = {}): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('/pven/v1/facturas-cabecera', 'http://x');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    const fiqlParts: string[] = [];

    // Standard equality filters
    const eqGroup: Record<string, import('./fiql-builder.js').FiqlValue | undefined> = {};
    if (opts.empresa !== undefined) eqGroup['FVC_EMP'] = opts.empresa;
    if (opts.codCliente !== undefined) eqGroup['FVC_CODAUX'] = opts.codCliente;
    if (opts.representante !== undefined) eqGroup['FVC_CODREP'] = opts.representante;
    if (opts.serie !== undefined) eqGroup['FVC_SERFAC'] = opts.serie;
    if (opts.numFactura !== undefined) eqGroup['FVC_NUMFAC'] = opts.numFactura;
    if (opts.formaPago !== undefined) eqGroup['FVC_CODFPAG'] = opts.formaPago;
    if (opts.delegacion !== undefined) eqGroup['FVC_DELEG'] = opts.delegacion;

    const eqFiql = buildFiql(eqGroup);
    if (eqFiql) fiqlParts.push(eqFiql);

    // Date range filters
    if (opts.fechaFacturaDesde !== undefined) fiqlParts.push(buildFiql({ FVC_FECFAC: { op: 'ge', value: opts.fechaFacturaDesde } }));
    if (opts.fechaFacturaHasta !== undefined) fiqlParts.push(buildFiql({ FVC_FECFAC: { op: 'le', value: opts.fechaFacturaHasta } }));

    // Boolean: traspasadoContabilidad
    if (opts.traspasadoContabilidad !== undefined) {
      fiqlParts.push(buildFiql({ FVC_TRSCONT: opts.traspasadoContabilidad ? 'S' : 'N' }));
    }

    appendRquery(url, fiqlParts.join(';'));

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Detalle de una factura de ventas (cabecera) por `idReg` opaco.
   *
   * Endpoint: GET /pven/v1/facturas-cabecera/{idreg}
   *
   * @param idReg - Identificador opaco (base64) de la factura.
   * @returns Factura cabecera completa.
   */
  async getFacturaCabecera(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pven/v1/facturas-cabecera/${encodeURIComponent(idReg)}`,
    );
  }

  /**
   * Lista paginada de líneas de una factura de ventas con filtros FIQL.
   *
   * Endpoint: GET /pven/v1/facturas-cabecera/{idreg}/lineas
   *
   * @param idReg - idReg opaco de la factura cabecera.
   * @param opts - Filtros tipados del schema `ListFacturaLineasFiltersSchema`.
   * @returns Lista paginada de líneas de factura.
   */
  async listFacturaLineas(idReg: string, opts: ListFacturaLineasFilters = {}): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL(`/pven/v1/facturas-cabecera/${encodeURIComponent(idReg)}/lineas`, 'http://x');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    const fiqlGroup: Record<string, import('./fiql-builder.js').FiqlValue | undefined> = {};
    if (opts.codArticulo !== undefined) fiqlGroup['FVL_CODART'] = opts.codArticulo;
    if (opts.codFamilia !== undefined) fiqlGroup['FVL_CODFAM'] = opts.codFamilia;
    if (opts.codSubfamilia !== undefined) fiqlGroup['FVL_CODSFAM'] = opts.codSubfamilia;
    if (opts.delegacion !== undefined) fiqlGroup['FVL_DELEG'] = opts.delegacion;

    appendRquery(url, buildFiql(fiqlGroup));

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Lista paginada de líneas de IVA de una factura de ventas con filtros FIQL.
   *
   * Endpoint: GET /pven/v1/facturas-cabecera/{idreg}/iva
   *
   * @param idReg - idReg opaco de la factura cabecera.
   * @param opts - Filtros tipados del schema `ListFacturaIvaFiltersSchema`.
   * @returns Lista paginada de líneas de IVA.
   */
  async listFacturaIva(idReg: string, opts: ListFacturaIvaFilters = {}): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL(`/pven/v1/facturas-cabecera/${encodeURIComponent(idReg)}/iva`, 'http://x');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    const fiqlGroup: Record<string, import('./fiql-builder.js').FiqlValue | undefined> = {};
    if (opts.tipoIva !== undefined) fiqlGroup['FVI_TIPIVA'] = opts.tipoIva;

    appendRquery(url, buildFiql(fiqlGroup));

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Lista paginada de vencimientos de una factura de ventas con filtros FIQL.
   *
   * Endpoint: GET /pven/v1/facturas-cabecera/{idreg}/vencimientos
   *
   * @param idReg - idReg opaco de la factura cabecera.
   * @param opts - Filtros tipados del schema `ListFacturaVencimientosFiltersSchema`.
   * @returns Lista paginada de vencimientos.
   */
  async listFacturaVencimientos(idReg: string, opts: ListFacturaVencimientosFilters = {}): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL(`/pven/v1/facturas-cabecera/${encodeURIComponent(idReg)}/vencimientos`, 'http://x');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    const fiqlParts: string[] = [];
    if (opts.modoPago !== undefined) fiqlParts.push(buildFiql({ FVV_CODMPAG: opts.modoPago }));
    if (opts.fechaVencimientoDesde !== undefined) fiqlParts.push(buildFiql({ FVV_FECVCTO: { op: 'ge', value: opts.fechaVencimientoDesde } }));
    if (opts.fechaVencimientoHasta !== undefined) fiqlParts.push(buildFiql({ FVV_FECVCTO: { op: 'le', value: opts.fechaVencimientoHasta } }));

    appendRquery(url, fiqlParts.join(';'));

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async listResource<T>(path: string, opts: ListOptions): Promise<ListResult<T>> {
    const params = new URLSearchParams();
    if (opts.items !== undefined) params.set('items', String(opts.items));
    if (opts.page !== undefined) params.set('page', String(opts.page));
    const query = params.toString();
    const url = query ? `${path}?${query}` : path;
    const data = await this.get<FreematicaListData<T>>(url);
    return { items: data.items, total: Number(data.total) };
  }
}
