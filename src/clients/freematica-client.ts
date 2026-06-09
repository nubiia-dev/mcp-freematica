import { BaseClient } from './base-client.js';
import { buildFiql, appendRquery, type FiqlGroup } from './fiql-builder.js';
import { CATALOG_ENDPOINTS, type MasterDataCatalog } from '../schemas/master-data.js';
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
      // ASI_BORR no nulo → borrador; nulo → definitivo
      // Freemática no tiene operador IS NULL en FIQL, usamos campo con valor literal
      // borrador=true  → ASI_BORR != '' (campo tiene valor)
      // borrador=false → ASI_BORR == '' (campo vacío/nulo representado como '')
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
 * @returns Límite en megabytes.
 */
function loadMaxResponseSizeMb(): number {
  const raw = process.env['FREEMATICA_MAX_RESPONSE_SIZE_MB'];
  if (raw === undefined || raw === '') return 10;
  const parsed = Number(raw);
  if (isNaN(parsed) || parsed <= 0) return 10;
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
