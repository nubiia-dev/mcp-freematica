import { BaseClient } from './base-client.js';
import { buildFiql, appendRquery, type FiqlGroup } from './fiql-builder.js';
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
import { logger } from '../logger.js';

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
  // Contabilidad — cuentas contables (v0.5.0)
  // ---------------------------------------------------------------------------

  /**
   * Lista de cuentas del plan contable.
   *
   * Endpoint: GET /pcon/v2/cuentas
   *
   * Los filtros opcionales se mapean a una expresión FIQL y se pasan como
   * query param `rquery`. El prefijoCuenta usa operador `=ge=` / `=lt=` para
   * emular un prefix match sobre COD_CTA (rango léxico).
   *
   * @param opts - Filtros opcionales: codPlan, prefijoCuenta, activa, grupoCuenta.
   */
  async listCuentasContables(opts: CuentasContablesOptions = {}): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('https://placeholder/pcon/v2/cuentas');
    const filters: Record<string, unknown> = {};
    if (opts.codPlan !== undefined) filters['COD_PLAN'] = opts.codPlan;
    if (opts.activa !== undefined) filters['CTA_ACTIVA'] = opts.activa ? '1' : '0';
    if (opts.grupoCuenta !== undefined) filters['COD_GRUPO_CTA'] = opts.grupoCuenta;

    const andGroups: FiqlGroup[] = [];
    if (Object.keys(filters).length > 0) {
      andGroups.push(filters as FiqlGroup);
    }

    // Prefix match sobre COD_CTA: COD_CTA >= prefix AND COD_CTA < prefix_next
    if (opts.prefijoCuenta !== undefined) {
      const prefix = opts.prefijoCuenta;
      const nextPrefix = buildNextPrefix(prefix);
      andGroups.push({ COD_CTA: { op: 'ge', value: prefix } });
      if (nextPrefix !== null) {
        andGroups.push({ COD_CTA: { op: 'lt', value: nextPrefix } });
      }
    }

    const fiql = andGroups.length > 0 ? buildFiql({ and: andGroups }) : '';
    appendRquery(url, fiql);
    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  // ---------------------------------------------------------------------------
  // Contabilidad — cuentas analíticas (v0.5.0)
  // ---------------------------------------------------------------------------

  /**
   * Lista de cuentas analíticas.
   *
   * Endpoint: GET /pcon/v2/cuentas-analiticas
   *
   * @param opts - Filtros opcionales: codPlan, prefijoCuenta, activa, grupoCuenta, area, delegacion.
   */
  async listCuentasAnaliticas(opts: CuentasAnaliticasOptions = {}): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('https://placeholder/pcon/v2/cuentas-analiticas');
    const filters: Record<string, unknown> = {};
    if (opts.codPlan !== undefined) filters['COD_PLAN'] = opts.codPlan;
    if (opts.activa !== undefined) filters['CTA_ACTIVA_ANL'] = opts.activa ? '1' : '0';
    if (opts.grupoCuenta !== undefined) filters['COD_GRUPO_ANL'] = opts.grupoCuenta;
    if (opts.area !== undefined) filters['AREA_ANL'] = opts.area;
    if (opts.delegacion !== undefined) filters['DELEG'] = opts.delegacion;

    const andGroups: FiqlGroup[] = [];
    if (Object.keys(filters).length > 0) {
      andGroups.push(filters as FiqlGroup);
    }

    // Prefix match sobre COD_CTA_ANL
    if (opts.prefijoCuenta !== undefined) {
      const prefix = opts.prefijoCuenta;
      const nextPrefix = buildNextPrefix(prefix);
      andGroups.push({ COD_CTA_ANL: { op: 'ge', value: prefix } });
      if (nextPrefix !== null) {
        andGroups.push({ COD_CTA_ANL: { op: 'lt', value: nextPrefix } });
      }
    }

    const fiql = andGroups.length > 0 ? buildFiql({ and: andGroups }) : '';
    appendRquery(url, fiql);
    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  // ---------------------------------------------------------------------------
  // Contabilidad — export asientos (v0.5.0)
  // ---------------------------------------------------------------------------

  /**
   * Exporta asientos contables de Freemática.
   *
   * Endpoint: GET /pcon/v2/export-asientos
   *
   * Los parámetros `empresa`, `cal` y `periodo` son query params nativos.
   * Los filtros `fechaDesde`, `fechaHasta`, `diario` y `borrador` se envían
   * como expresión FIQL en el param `rquery`.
   *
   * Protección de tamaño: si el JSON serializado supera
   * `FREEMATICA_MAX_RESPONSE_SIZE_MB` (default 10 MB), los items se truncan
   * y se añade un campo `warning` a la respuesta.
   *
   * @param opts - Opciones de exportación.
   * @returns Resultado con `items`, `total`, y opcionalmente `truncated`+`warning`.
   */
  async exportAsientos(opts: ExportAsientosOptions): Promise<ExportAsientosResult> {
    const maxMb = loadMaxResponseSizeMb();
    const maxBytes = maxMb * 1024 * 1024;

    // Construir URL con params nativos
    const url = new URL('https://placeholder/pcon/v2/export-asientos');
    url.searchParams.set('empresa', opts.empresa);
    url.searchParams.set('cal', opts.cal);
    if (opts.periodo !== undefined) url.searchParams.set('periodo', opts.periodo);

    // Construir FIQL para filtros adicionales
    const andGroups: FiqlGroup[] = [];
    if (opts.fechaDesde !== undefined) {
      andGroups.push({ ASI_FCHASI: { op: 'ge', value: opts.fechaDesde } });
    }
    if (opts.fechaHasta !== undefined) {
      andGroups.push({ ASI_FCHASI: { op: 'le', value: opts.fechaHasta } });
    }
    if (opts.diario !== undefined) {
      andGroups.push({ ASI_DIARIO: opts.diario });
    }
    if (opts.borrador !== undefined) {
      /**
       * ASUNCIÓN EMPÍRICA — convención para campo nullable en Freemática FIQL
       *
       * La API de Freemática no expone un operador IS NULL nativo en FIQL. La
       * convención observada en otras tablas del sistema es representar el valor
       * nulo/ausente como cadena vacía `''` en las expresiones `=eq=` / `=ne=`.
       *
       * Para `ASI_BORR`:
       *   - borrador=true  → `ASI_BORR!=''`  (campo tiene algún valor → asiento en borrador)
       *   - borrador=false → `ASI_BORR==''`  (campo vacío / null → asiento definitivo)
       *
       * Esta convención NO ha sido verificada contra la API real de Freemática.
       * Si en pruebas funcionales el filtro no funciona correctamente, puede que
       * el centinela sea el literal `null` en lugar de `''`, o que el campo
       * use un valor boolean/entero como en CTA_ACTIVA.
       *
       * TODO(TD-???): verificar contra API real cuando esté disponible.
       */
      andGroups.push({ ASI_BORR: { op: opts.borrador ? 'ne' : 'eq', value: '' } });
    }

    const fiql = andGroups.length > 0 ? buildFiql({ and: andGroups }) : '';
    appendRquery(url, fiql);

    const path = url.pathname + url.search;
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);

    const items = data.items;
    const total = Number(data.total);

    // Validación de tamaño máximo
    const serialized = JSON.stringify(items);
    const byteSize = Buffer.byteLength(serialized, 'utf8');

    if (byteSize > maxBytes) {
      logger.warn(
        {
          byteSize,
          maxBytes,
          maxMb,
          totalItems: items.length,
          empresa: opts.empresa,
          cal: opts.cal,
        },
        'export-asientos: respuesta excede MAX_RESPONSE_SIZE_MB, truncando',
      );

      // Truncar items hasta que quepan en el límite
      const truncatedItems = truncateItemsToLimit(items, maxBytes);

      return {
        items: truncatedItems,
        total,
        truncated: true,
        warning: [
          `La respuesta ha sido truncada porque superaba el límite de ${maxMb} MB.`,
          `Items devueltos: ${truncatedItems.length} de ${items.length} totales.`,
          `Usa rangos de fecha cortos (fechaDesde + fechaHasta) para obtener datos completos.`,
        ].join(' '),
      };
    }

    return { items, total, truncated: false };
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

    // Construir grupos AND para el filtro de fecha (ambos usan FCC_FCHFAC con distinto operador).
    // FCC_FCHFAC_HASTA NO existe en el schema Freemática; no se puede usar como campo sintético.
    // La solución correcta es la composición AND: dos expresiones con el mismo campo real.
    const dateGroups: import('./fiql-builder.js').FiqlGroup[] = [];
    if (opts.fechaDesde !== undefined) {
      dateGroups.push({ FCC_FCHFAC: { op: 'ge', value: opts.fechaDesde } });
    }
    if (opts.fechaHasta !== undefined) {
      dateGroups.push({ FCC_FCHFAC: { op: 'le', value: opts.fechaHasta } });
    }

    // Resto de filtros escalares en un grupo plano
    const scalarGroup: import('./fiql-builder.js').FiqlGroup = {
      FCC_CODEMP: opts.empresa,
      FCC_CODPRO: opts.codProveedor,
      FCC_SERIEFRA: opts.serie,
      FCC_NUMFRA: opts.numFactura,
      FCC_FPAGO: opts.formaPago,
      FCC_TRASP_CONTAB:
        opts.traspasadoContabilidad !== undefined
          ? String(opts.traspasadoContabilidad)
          : undefined,
      FCC_DELEG: opts.delegacion,
      FCC_LIN_NEGOCIO: opts.lineaNegocio,
    };

    const fiql = buildFiql({ and: [...dateGroups, scalarGroup] });
    appendRquery(url, fiql);

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
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
   * Detalle de una factura de compra por `idReg` opaco.
   *
   * Endpoint: GET /pcmp/v2/facturas-compras/{idReg}
   */
  async getFacturaCompra(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pcmp/v2/facturas-compras/${encodeURIComponent(idReg)}`,
    );
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
      fiqlFilters as Parameters<typeof buildFiql>[0],
    );
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

// ---------------------------------------------------------------------------
// Interfaces de opciones para contabilidad
// ---------------------------------------------------------------------------

/** Filtros para listCuentasContables. */
export interface CuentasContablesOptions {
  codPlan?: string;
  prefijoCuenta?: string;
  activa?: boolean;
  grupoCuenta?: string;
}

/** Filtros para listCuentasAnaliticas. */
export interface CuentasAnaliticasOptions {
  codPlan?: string;
  prefijoCuenta?: string;
  activa?: boolean;
  grupoCuenta?: string;
  area?: string;
  delegacion?: string;
}

/** Opciones para exportAsientos. */
export interface ExportAsientosOptions {
  empresa: string;
  cal: string;
  periodo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  diario?: string;
  borrador?: boolean;
}

/** Resultado de exportAsientos. */
export interface ExportAsientosResult extends ListResult<Record<string, unknown>> {
  truncated: boolean;
  warning?: string;
}

// ---------------------------------------------------------------------------
// Helpers privados del módulo
// ---------------------------------------------------------------------------

/**
 * Lee el límite de respuesta en MB desde la variable de entorno
 * `FREEMATICA_MAX_RESPONSE_SIZE_MB`. Si no está definida o es inválida,
 * devuelve el default de 10 MB.
 *
 * Esta función aplica las mismas restricciones que el schema Zod definido en
 * `config.ts` para `FREEMATICA_MAX_RESPONSE_SIZE_MB` (min: 1, max: 500, int):
 * - Debe ser un número entero.
 * - Debe estar en el rango [1, 500].
 * Si cualquiera de esas condiciones falla, se devuelve el default de 10 MB.
 *
 * @returns Límite en megabytes (entero en [1, 500]).
 */
function loadMaxResponseSizeMb(): number {
  const raw = process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'];
  if (raw === undefined || raw === '') return 10;
  const parsed = Number(raw);
  if (isNaN(parsed) || !Number.isInteger(parsed) || parsed < 1 || parsed > 500) return 10;
  return parsed;
}

/**
 * Calcula el siguiente prefijo léxico para emular un prefix match FIQL.
 *
 * Para un prefijo como "430", el rango [430, 431) captura todos los valores
 * que comienzan por "430". Si el último carácter es el carácter máximo
 * unicode (U+FFFF), no se puede calcular un límite superior, por lo que se
 * devuelve `null` (sólo se aplica el límite inferior).
 *
 * @param prefix - Prefijo a extender.
 * @returns Siguiente prefijo léxico, o `null` si no aplica.
 */
function buildNextPrefix(prefix: string): string | null {
  if (prefix.length === 0) return null;
  const last = prefix.charCodeAt(prefix.length - 1);
  if (last >= 0xfffe) return null;
  return prefix.slice(0, -1) + String.fromCharCode(last + 1);
}

/**
 * Trunca un array de items para que su JSON serializado no supere `maxBytes`.
 *
 * Utiliza búsqueda binaria para encontrar eficientemente el número máximo de
 * items que caben dentro del límite.
 *
 * @param items - Items originales.
 * @param maxBytes - Límite en bytes.
 * @returns Subarray de items que cabe dentro del límite.
 */
function truncateItemsToLimit(
  items: Record<string, unknown>[],
  maxBytes: number,
): Record<string, unknown>[] {
  if (items.length === 0) return [];

  // Búsqueda binaria: encuentra el máximo n tal que JSON([0..n-1]) <= maxBytes
  let lo = 0;
  let hi = items.length;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const size = Buffer.byteLength(JSON.stringify(items.slice(0, mid + 1)), 'utf8');
    if (size <= maxBytes) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return items.slice(0, lo);
}
