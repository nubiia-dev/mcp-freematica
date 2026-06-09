import { BaseClient } from './base-client.js';
import { buildFiql, appendRquery } from './fiql-builder.js';
import { CATALOG_ENDPOINTS, type MasterDataCatalog } from '../schemas/master-data.js';
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
  // Facturas de compras (v0.5.0)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de facturas de compras con filtros FIQL + query params nativos.
   *
   * El campo `exportado` es un enum nativo del endpoint (no FIQL): `all` | `not_exported`.
   * El resto de filtros se envían mediante el query param `rquery` (FIQL).
   *
   * Endpoint: GET /pcmp/v2/facturas-compras
   */
  async listFacturasCompras(
    opts: ListOptions & {
      fechaDesde?: string;
      fechaHasta?: string;
      empresa?: string;
      codProveedor?: string;
      serie?: string;
      numFactura?: string;
      formaPago?: string;
      traspasadoContabilidad?: boolean;
      delegacion?: string;
      lineaNegocio?: string;
      exportado?: 'all' | 'not_exported';
    } = {},
  ): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('https://placeholder/pcmp/v2/facturas-compras');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));
    if (opts.exportado !== undefined) url.searchParams.set('exportado', opts.exportado);

    const fiql = buildFiql({
      FCC_CODEMP: opts.empresa,
      FCC_CODPRO: opts.codProveedor,
      FCC_FCHFAC: opts.fechaDesde !== undefined
        ? { op: 'ge', value: opts.fechaDesde }
        : undefined,
      ...(opts.fechaHasta !== undefined
        ? { FCC_FCHFAC_HASTA: { op: 'le', value: opts.fechaHasta } }
        : {}),
      FCC_SERIEFRA: opts.serie,
      FCC_NUMFRA: opts.numFactura,
      FCC_FPAGO: opts.formaPago,
      FCC_TRASP_CONTAB:
        opts.traspasadoContabilidad !== undefined
          ? String(opts.traspasadoContabilidad)
          : undefined,
      FCC_DELEG: opts.delegacion,
      FCC_LIN_NEGOCIO: opts.lineaNegocio,
    });
    appendRquery(url, fiql);

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Detalle de una factura de compra por `idReg` opaco.
   *
   * Endpoint: GET /pcmp/v2/facturas-compras/{idReg}
   */
  async getFacturaCompra(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pcmp/v2/facturas-compras/${encodeURIComponent(idReg)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Proveedores (v0.5.0)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de proveedores con filtros FIQL.
   *
   * El filtro `activo` mapea a FECHA_BAJA:
   * - `true`  → FECHA_BAJA es nula (proveedor activo). Se usa el operador `=is-null=true` si el
   *             API lo soporta; como fallback se omite el filtro y se filtra post-process.
   *             En Freemática el convenio estándar es: activo=true → `FECHA_BAJA==null` (FIQL `==null`).
   * - `false` → FECHA_BAJA tiene valor (proveedor de baja).
   *
   * El filtro `nombre` usa operador FIQL `=lk=` para búsqueda parcial (LIKE).
   *
   * Endpoint: GET /pgrl/v2/proveedores
   */
  async listProveedores(
    opts: ListOptions & {
      codProveedor?: string;
      grupoProveedor?: string;
      nif?: string;
      nombre?: string;
      activo?: boolean;
      tipoIdent?: string;
      codProvincia?: string;
      codPais?: string;
    } = {},
  ): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('https://placeholder/pgrl/v2/proveedores');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    // Construir filtros FIQL — activo se traduce a FECHA_BAJA
    const filters: Record<string, unknown> = {
      COD_PRO: opts.codProveedor,
      COD_GRUPO_PRO: opts.grupoProveedor,
      NIF: opts.nif,
      CMP_TIPO_IDENT: opts.tipoIdent,
      COD_PROVINCIA: opts.codProvincia,
      COD_PAIS: opts.codPais,
    };

    if (opts.nombre !== undefined) {
      filters['NOMBRE_PRO'] = { op: 'lk', value: opts.nombre };
    }

    if (opts.activo === true) {
      // Activos: FECHA_BAJA nula. FIQL: FECHA_BAJA==null
      filters['FECHA_BAJA'] = 'null';
    } else if (opts.activo === false) {
      // Dados de baja: FECHA_BAJA tiene valor (not null). FIQL: FECHA_BAJA!=null
      filters['FECHA_BAJA'] = { op: 'ne', value: 'null' };
    }

    const fiql = buildFiql(filters as Parameters<typeof buildFiql>[0]);
    appendRquery(url, fiql);

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Detalle de un proveedor por `idReg` opaco.
   *
   * Endpoint: GET /pgrl/v2/proveedores/{idReg}
   */
  async getProveedor(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pgrl/v2/proveedores/${encodeURIComponent(idReg)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Localizaciones (v0.5.0)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de localizaciones de cobro de clientes.
   *
   * Filtros soportados: codCliente (COD_CLI), grupoCliente (GRUPO_CLI), formaPago (COD_FORMA_COBRO).
   *
   * Endpoint: GET /pgrl/v2/localizaciones-cobro-clientes
   */
  async listLocalizacionesCobroClientes(
    opts: ListOptions & {
      codCliente?: string;
      grupoCliente?: string;
      formaPago?: string;
    } = {},
  ): Promise<ListResult<Record<string, unknown>>> {
    return this.listResourceWithFiql('/pgrl/v2/localizaciones-cobro-clientes', opts, {
      COD_CLI: opts.codCliente,
      GRUPO_CLI: opts.grupoCliente,
      COD_FORMA_COBRO: opts.formaPago,
    });
  }

  /**
   * Lista paginada de localizaciones de pago de proveedores.
   *
   * Filtros soportados: codProveedor (COD_PRO), grupoProveedor (COD_GRUPO_PRO), formaPago (COD_FORMA_PAGO).
   *
   * Endpoint: GET /pgrl/v2/localizaciones-pago-proveedores
   */
  async listLocalizacionesPagoProveedores(
    opts: ListOptions & {
      codProveedor?: string;
      grupoProveedor?: string;
      formaPago?: string;
    } = {},
  ): Promise<ListResult<Record<string, unknown>>> {
    return this.listResourceWithFiql('/pgrl/v2/localizaciones-pago-proveedores', opts, {
      COD_PRO: opts.codProveedor,
      COD_GRUPO_PRO: opts.grupoProveedor,
      COD_FORMA_PAGO: opts.formaPago,
    });
  }

  /**
   * Lista paginada de localizaciones de servicio de clientes.
   *
   * Filtros soportados: codCliente (COD_CLI), grupoCliente (GRUPO_CLI), codPais (COD_PAIS),
   * codProvincia (COD_PROVINCIA), representante (COD_REPRES), activo (FECHA_BAJA nulo/no nulo).
   *
   * Endpoint: GET /pgrl/v2/localizaciones-servicio-clientes
   */
  async listLocalizacionesServicioClientes(
    opts: ListOptions & {
      codCliente?: string;
      grupoCliente?: string;
      codPais?: string;
      codProvincia?: string;
      representante?: string;
      activo?: boolean;
    } = {},
  ): Promise<ListResult<Record<string, unknown>>> {
    const fiqlFilters: Record<string, unknown> = {
      COD_CLI: opts.codCliente,
      GRUPO_CLI: opts.grupoCliente,
      COD_PAIS: opts.codPais,
      COD_PROVINCIA: opts.codProvincia,
      COD_REPRES: opts.representante,
    };

    if (opts.activo === true) {
      fiqlFilters['FECHA_BAJA'] = 'null';
    } else if (opts.activo === false) {
      fiqlFilters['FECHA_BAJA'] = { op: 'ne', value: 'null' };
    }

    return this.listResourceWithFiql(
      '/pgrl/v2/localizaciones-servicio-clientes',
      opts,
      fiqlFilters as Record<string, string | undefined>,
    );
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

  /**
   * Helper genérico para endpoints de lista que soportan paginación + filtros FIQL
   * vía query param `rquery`.
   *
   * @param path - Path base del endpoint (sin query string).
   * @param opts - Opciones de paginación.
   * @param fiqlFields - Mapa de nombre de campo FIQL → valor. Los valores `undefined` se omiten.
   * @returns Lista de items con total.
   */
  private async listResourceWithFiql<T>(
    path: string,
    opts: ListOptions,
    fiqlFields: Record<string, unknown>,
  ): Promise<ListResult<T>> {
    const url = new URL(`https://placeholder${path}`);
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    const fiql = buildFiql(fiqlFields as Parameters<typeof buildFiql>[0]);
    appendRquery(url, fiql);

    const fullPath = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<T>>(fullPath);
    return { items: data.items, total: Number(data.total) };
  }
}
