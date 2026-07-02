import { BaseClient, FreematicaError } from './base-client.js';
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
import {
  buildEstadoPedidoFiql,
  type ListPedidosCompraFilters,
} from '../schemas/pedidos-compras.js';
import type { FreematicaListData } from '../types/api-envelope.js';
import type { Cliente } from '../types/clientes.js';
import type { ContactoCliente } from '../types/contactos-clientes.js';
import type { MasterDataItem } from '../types/master-data.js';
import type { OportunidadNegocio } from '../types/oportunidades-negocio.js';
import type {
  VoContrato,
  VoContratoServicio,
  VoContratosOpcionales,
  VoContratosServMatAsignado,
  VoServiciosFac,
  VoServiciosFacTxt,
  VoServiciosHistPr,
} from '../types/contratos.js';
import { logger } from '../logger.js';
import { loadMaxResponseSizeMb } from '../utils/size-guardrail.js';

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
  // PRL — Prevención de Riesgos Laborales (v0.5.0)
  // ---------------------------------------------------------------------------

  /**
   * Opciones de filtro para getFichaPrevCliente.
   *
   * Los query params mapean directamente a los parámetros nativos del endpoint
   * GET /pprl/v2/ficha-prev-cliente. NO se usa FIQL en este endpoint.
   */

  /**
   * Obtiene la ficha de PRL de un cliente.
   *
   * Endpoint: GET /pprl/v2/ficha-prev-cliente
   *
   * Los filtros se envían como query params nativos (codCli, grpCli, locServ,
   * codigo). La validación de "al menos uno" es responsabilidad del caller
   * (la tool lo hace via Zod .refine()).
   *
   * @param opts - Filtros: codCliente, grupoCliente, codLocalizacionServicio, codigoFicha.
   * @returns Lista de fichas PRL que coinciden con los filtros.
   */
  async getFichaPrevCliente(opts: {
    codCliente?: string;
    grupoCliente?: number;
    codLocalizacionServicio?: number;
    codigoFicha?: string;
  }): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('placeholder://x/pprl/v2/ficha-prev-cliente');
    if (opts.codCliente !== undefined) url.searchParams.set('codCli', opts.codCliente);
    if (opts.grupoCliente !== undefined) url.searchParams.set('grpCli', String(opts.grupoCliente));
    if (opts.codLocalizacionServicio !== undefined)
      url.searchParams.set('locServ', String(opts.codLocalizacionServicio));
    if (opts.codigoFicha !== undefined) url.searchParams.set('codigo', opts.codigoFicha);
    const qs = url.searchParams.toString();
    const path = qs ? `/pprl/v2/ficha-prev-cliente?${qs}` : '/pprl/v2/ficha-prev-cliente';
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
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

  /**
   * Opciones de filtro para listVigilanciaSalud.
   */

  /**
   * Lista paginada de registros de Vigilancia de la Salud.
   *
   * Endpoint: GET /pprl/v1/vigilancia-salud
   *
   * `idRegPersona` se envía como query param nativo. El resto de filtros se
   * codifican en FIQL y se envían como `rquery`.
   *
   * @param opts - Opciones de paginación y filtrado.
   * @returns Lista paginada de registros VS.
   */
  async listVigilanciaSalud(opts: {
    page?: number;
    items?: number;
    idRegPersona?: string;
    empresa?: string;
    delegacion?: string;
    codPersona?: string;
    tipoRevision?: string;
    resultado?: string;
    fechaCitaDesde?: string;
    fechaCitaHasta?: string;
  }): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('placeholder://x/pprl/v1/vigilancia-salud');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));
    if (opts.idRegPersona !== undefined) url.searchParams.set('idRegPersona', opts.idRegPersona);

    // Filtros FIQL
    const fiqlParts: Record<string, unknown> = {};
    if (opts.empresa !== undefined) fiqlParts['PERVS_EMP'] = opts.empresa;
    if (opts.delegacion !== undefined) fiqlParts['PERVS_DELEG'] = opts.delegacion;
    if (opts.codPersona !== undefined) fiqlParts['PERVS_PERSO'] = opts.codPersona;
    if (opts.tipoRevision !== undefined) fiqlParts['PERVS_TIPO_REVISION'] = opts.tipoRevision;
    if (opts.resultado !== undefined) fiqlParts['PERVS_RESULTADO'] = opts.resultado;
    if (opts.fechaCitaDesde !== undefined)
      fiqlParts['PERVS_FCH_CITA'] = { op: 'ge' as const, value: opts.fechaCitaDesde };
    // If both desde and hasta, we need to combine with AND
    const fiqlParts2: Record<string, unknown> = {};
    if (opts.fechaCitaHasta !== undefined)
      fiqlParts2['PERVS_FCH_CITA'] = { op: 'le' as const, value: opts.fechaCitaHasta };

    const fiql1 = buildFiql(fiqlParts as Parameters<typeof buildFiql>[0]);
    const fiql2 = buildFiql(fiqlParts2 as Parameters<typeof buildFiql>[0]);
    const combinedFiql = [fiql1, fiql2].filter(Boolean).join(';');
    appendRquery(url, combinedFiql);

    const qs = url.searchParams.toString();
    const path = qs ? `/pprl/v1/vigilancia-salud?${qs}` : '/pprl/v1/vigilancia-salud';
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

  /**
   * Detalle de un registro de Vigilancia de la Salud por `idReg` opaco.
   *
   * Endpoint: GET /pprl/v1/vigilancia-salud/{idreg}
   *
   * @param idReg - Identificador opaco del registro.
   * @returns Objeto con todos los campos del registro VS.
   */
  async getVigilanciaSalud(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pprl/v1/vigilancia-salud/${encodeURIComponent(idReg)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Personal — RRHH (v0.5.0)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de personas (empleados) con filtros FIQL opcionales.
   *
   * Endpoint: GET /pers/v2/personal
   *
   * El filtro `activo` (boolean) se traduce a `VSSPER_ACTIVO==S` (true) o
   * `VSSPER_ACTIVO==N` (false). Las búsquedas por `nombre` y `apellido` usan
   * el operador de igualdad estándar FIQL (el servidor aplica LIKE internamente
   * para estos campos).
   *
   * @param opts - Opciones de paginación y filtrado.
   * @returns Lista paginada de personas.
   */
  async listPersonal(opts: {
    page?: number;
    items?: number;
    empresa?: string;
    delegacion?: string;
    codPersona?: string;
    nombre?: string;
    apellido?: string;
    nif?: string;
    situacion?: string;
    departamento?: string;
    seccion?: string;
    activo?: boolean;
  }): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('placeholder://x/pers/v2/personal');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    const fiqlGroup: Record<string, unknown> = {};
    if (opts.empresa !== undefined) fiqlGroup['VSSPER_EMP'] = opts.empresa;
    if (opts.delegacion !== undefined) fiqlGroup['VSSPER_DELEG'] = opts.delegacion;
    if (opts.codPersona !== undefined) fiqlGroup['VSSPER_COD'] = opts.codPersona;
    if (opts.nombre !== undefined) fiqlGroup['VSSPER_NOM'] = opts.nombre;
    if (opts.apellido !== undefined) fiqlGroup['VSSPER_APELL1'] = opts.apellido;
    if (opts.nif !== undefined) fiqlGroup['VSSPER_NIF'] = opts.nif;
    if (opts.situacion !== undefined) fiqlGroup['VSSPER_SIT'] = opts.situacion;
    if (opts.departamento !== undefined) fiqlGroup['VSSPER_DPTO'] = opts.departamento;
    if (opts.seccion !== undefined) fiqlGroup['VSSPER_SECCION'] = opts.seccion;
    if (opts.activo !== undefined) fiqlGroup['VSSPER_ACTIVO'] = opts.activo ? 'S' : 'N';

    appendRquery(url, buildFiql(fiqlGroup as Parameters<typeof buildFiql>[0]));

    const qs = url.searchParams.toString();
    const path = qs ? `/pers/v2/personal?${qs}` : '/pers/v2/personal';
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Detalle de una persona por `idReg` opaco.
   *
   * Endpoint: GET /pers/v2/personal/{idreg}
   *
   * @param idReg - Identificador opaco de la persona.
   * @returns Objeto con todos los campos de la persona.
   */
  async getPersona(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pers/v2/personal/${encodeURIComponent(idReg)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Calendarios laborales (v0.5.0)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de calendarios laborales.
   *
   * Endpoint: GET /pgrl/v1/calendarios
   *
   * @param opts - Opciones de paginación.
   * @returns Lista paginada de calendarios.
   */
  async listCalendarios(opts: ListOptions = {}): Promise<ListResult<Record<string, unknown>>> {
    return this.listResource<Record<string, unknown>>('/pgrl/v1/calendarios', opts);
  }

  /**
   * Lista paginada de periodos de un calendario laboral.
   *
   * Endpoint: GET /pgrl/v1/calendarios/{idreg}/periodos
   *
   * @param idCalendario - idReg opaco del calendario.
   * @param opts - Opciones de paginación.
   * @returns Lista paginada de periodos del calendario.
   */
  async listCalendarioPeriodos(
    idCalendario: string,
    opts: ListOptions = {},
  ): Promise<ListResult<Record<string, unknown>>> {
    return this.listResource<Record<string, unknown>>(
      `/pgrl/v1/calendarios/${encodeURIComponent(idCalendario)}/periodos`,
      opts,
    );
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

  // ---------------------------------------------------------------------------
  // Pedidos de compra (v0.5.1)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de pedidos de compra con diseño mixto de filtros.
   *
   * Endpoint: GET /pcmp/v2/pedidos
   *
   * DISEÑO MIXTO: el endpoint combina 4 query params nativos con filtros FIQL
   * adicionales vía `rquery`.
   *
   * Filtros que van como **query params nativos** (NO FIQL):
   * - `empresa` (4c) → `codEmpresa`
   * - `codProveedor` (≤10c) → `codProveedor`
   * - `fechaPedidoDesde` (ISO date) → `desdeFecha`
   * - `fechaPedidoHasta` (ISO date) → `hastaFecha`
   *
   * Filtros que van como **FIQL en `rquery`** (campos `ALCC_*`):
   * - `numPedido` → `ALCC_NUMDOC==N`
   * - `codDocumento` → `ALCC_CODDOC==XXXX`
   * - `delegacion` → `ALCC_DELEG==XXXX`
   * - `formaPago` → `ALCC_FPAGO==XXX`
   * - `tipoIva` → `ALCC_TIPO_IVA==XXXX`
   * - `codCliente` → `ALCC_COD_CLIENTE==X`
   * - `codInstalador` → `ALCC_COD_INSTALADOR==X`
   * - `codMantenedor` → `ALCC_COD_MANTENEDOR==X`
   * - `fechaEntregaDesde` → `ALCC_FCHENTREGA=ge=YYYY-MM-DD`
   * - `fechaEntregaHasta` → `ALCC_FCHENTREGA=le=YYYY-MM-DD`
   * - `referencia` → `ALCC_REFERENCIA==X`
   * - `estado` → expresión compuesta sobre `ALCC_PED_BLOQ` y `ALCC_PED_RECIB`
   *   (ver `buildEstadoPedidoFiql` y comentario empírico en `EstadoPedidoEnum`)
   *
   * @param opts - Filtros tipados del schema `ListPedidosCompraFiltersSchema`.
   * @returns Lista paginada de pedidos de compra.
   */
  async listPedidosCompra(opts: ListPedidosCompraFilters = {}): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('https://placeholder/pcmp/v2/pedidos');

    // Paginación
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    // Query params nativos (NO FIQL)
    if (opts.empresa !== undefined) url.searchParams.set('codEmpresa', opts.empresa);
    if (opts.codProveedor !== undefined) url.searchParams.set('codProveedor', opts.codProveedor);
    if (opts.fechaPedidoDesde !== undefined) url.searchParams.set('desdeFecha', opts.fechaPedidoDesde);
    if (opts.fechaPedidoHasta !== undefined) url.searchParams.set('hastaFecha', opts.fechaPedidoHasta);

    // Filtros FIQL — cada parte se genera por separado y se une con ";"
    const fiqlParts: string[] = [];

    // Scalar equality filters: agrupar en un objeto y construir de una vez
    const eqGroup: Record<string, import('./fiql-builder.js').FiqlValue | undefined> = {};
    if (opts.codDocumento !== undefined) eqGroup['ALCC_CODDOC'] = opts.codDocumento;
    if (opts.delegacion !== undefined) eqGroup['ALCC_DELEG'] = opts.delegacion;
    if (opts.formaPago !== undefined) eqGroup['ALCC_FPAGO'] = opts.formaPago;
    if (opts.tipoIva !== undefined) eqGroup['ALCC_TIPO_IVA'] = opts.tipoIva;
    if (opts.codCliente !== undefined) eqGroup['ALCC_COD_CLIENTE'] = opts.codCliente;
    if (opts.codInstalador !== undefined) eqGroup['ALCC_COD_INSTALADOR'] = opts.codInstalador;
    if (opts.codMantenedor !== undefined) eqGroup['ALCC_COD_MANTENEDOR'] = opts.codMantenedor;
    if (opts.referencia !== undefined) eqGroup['ALCC_REFERENCIA'] = opts.referencia;
    // numPedido es number → convertir a string para FIQL
    if (opts.numPedido !== undefined) eqGroup['ALCC_NUMDOC'] = String(opts.numPedido);

    const eqFiql = buildFiql(eqGroup);
    if (eqFiql) fiqlParts.push(eqFiql);

    // Date range filters for fechaEntrega (same field, two possible operators)
    if (opts.fechaEntregaDesde !== undefined) {
      fiqlParts.push(buildFiql({ ALCC_FCHENTREGA: { op: 'ge', value: opts.fechaEntregaDesde } }));
    }
    if (opts.fechaEntregaHasta !== undefined) {
      fiqlParts.push(buildFiql({ ALCC_FCHENTREGA: { op: 'le', value: opts.fechaEntregaHasta } }));
    }

    // Estado — genera expresión FIQL compuesta sobre ALCC_PED_BLOQ + ALCC_PED_RECIB
    if (opts.estado !== undefined) {
      fiqlParts.push(buildEstadoPedidoFiql(opts.estado));
    }

    appendRquery(url, fiqlParts.join(';'));

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Detalle de un pedido de compra por `idReg` opaco.
   *
   * Endpoint: GET /pcmp/v2/pedidos/{idreg}
   *
   * La respuesta es un objeto compuesto `{ VoPedidosCompraCab, cabecera_proveedor, lineas[] }`
   * que se devuelve sin aplanar para conservar la estructura original del API.
   *
   * @param idReg - Identificador opaco (puede contener caracteres como "==" de base64).
   * @returns Objeto compuesto con la cabecera, datos del proveedor y líneas del pedido.
   */
  async getPedidoCompra(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pcmp/v2/pedidos/${encodeURIComponent(idReg)}`,
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
  // Facturas electrónicas (Facturae/EDICOM/FACe) (v0.5.1 / TD-154)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de facturas electrónicas con filtros nativos (NO FIQL).
   *
   * Endpoint: GET /pven/v1/facturas
   *
   * Diferente de listFacturasCabecera: expone las facturas firmadas/enviadas vía
   * Facturae, EDICOM y/o FACe. Los filtros son query params nativos del API.
   *
   * @param opts - Filtros nativos: empresa, codCliente, fechaDesde/Hasta, estado, leido + paginación.
   * @returns Lista paginada de facturas electrónicas con campos FACED_*.
   */
  async listFacturasElectronicas(
    opts: import('../schemas/facturas-electronicas.js').ListFacturasElectronicasFilters,
  ): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('https://placeholder/pven/v1/facturas');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));
    if (opts.empresa !== undefined) url.searchParams.set('empresa', opts.empresa);
    if (opts.codCliente !== undefined) url.searchParams.set('cliente', opts.codCliente);
    if (opts.fechaDesde !== undefined) url.searchParams.set('fechaIni', opts.fechaDesde);
    if (opts.fechaHasta !== undefined) url.searchParams.set('fechaFin', opts.fechaHasta);
    if (opts.estado !== undefined) url.searchParams.set('estado', opts.estado);
    if (opts.leido !== undefined) url.searchParams.set('leido', opts.leido ? '1' : '0');
    if (opts.order !== undefined) url.searchParams.set('order', opts.order);

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  // ---------------------------------------------------------------------------
  // Albaranes de ventas (v0.5.1 / TD-155)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de albaranes de ventas con filtros nativos del endpoint.
   *
   * Endpoint: GET /pven/v2/albaranes-ventas
   *
   * El endpoint usa exclusivamente query params nativos para los filtros
   * principales (no FIQL). `codEmpresa` es obligatorio según el spec OpenAPI.
   */
  async listAlbaranesVentas(opts: {
    page?: number;
    items?: number;
    empresa: string;
    delegacion?: string;
    codCliente?: string;
    codDocumento?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    order?: string;
  }): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('https://placeholder/pven/v2/albaranes-ventas');

    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    url.searchParams.set('codEmpresa', opts.empresa);
    if (opts.delegacion !== undefined) url.searchParams.set('codDelegacion', opts.delegacion);
    if (opts.codCliente !== undefined) url.searchParams.set('codCliente', opts.codCliente);
    if (opts.codDocumento !== undefined) url.searchParams.set('codDocumento', opts.codDocumento);
    if (opts.fechaDesde !== undefined) url.searchParams.set('desdeFecha', opts.fechaDesde);
    if (opts.fechaHasta !== undefined) url.searchParams.set('hastaFecha', opts.fechaHasta);
    if (opts.order !== undefined) url.searchParams.set('order', opts.order);

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Detalle de una factura electrónica por `idReg` opaco.
   *
   * Endpoint: GET /pven/v1/facturas/{idreg}
   *
   * @param idReg - Identificador opaco (base64) de la factura electrónica.
   * @returns Objeto con los campos de la factura electrónica.
   */
  async getFacturaElectronica(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pven/v1/facturas/${encodeURIComponent(idReg)}`,
    );
  }

  /**
   * Recupera el documento (PDF o XML Facturae firmado) de una factura electrónica.
   *
   * Endpoint: GET /pven/v1/facturas/{idreg}/documento
   *
   * La API devuelve un JSON (VoFacturasDocumento) con los documentos codificados en base64
   * en los campos FACED_DOCUMENTO_PDF, FACED_DOCUMENTO_XML, etc.
   *
   * Si el tamaño del JSON supera FREEMATICA_MAX_RESPONSE_SIZE_MB, la tool aplica el
   * guardrail de tamaño y devuelve `{ truncated: true, warning, sizeBytes }` sin el cuerpo.
   *
   * @param idReg - Identificador opaco de la factura.
   * @param opts - Opciones: documentType (tipo de documento), actualizaLeido (marcar como leído).
   * @returns Objeto VoFacturasDocumento con campos FACED_DOCUMENTO_*.
   */
  async getFacturaDocumento(
    idReg: string,
    opts: { documentType?: string; actualizaLeido?: boolean } = {},
  ): Promise<FacturaDocumentoResult> {
    const maxMb = loadMaxResponseSizeMb();
    const maxBytes = maxMb * 1024 * 1024;

    const url = new URL(`https://placeholder/pven/v1/facturas/${encodeURIComponent(idReg)}/documento`);
    if (opts.documentType !== undefined) url.searchParams.set('documentType', opts.documentType);
    if (opts.actualizaLeido !== undefined) url.searchParams.set('actualiza-leido', String(opts.actualizaLeido));

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<Record<string, unknown>>(path);

    // Validación de tamaño: los documentos base64 pueden ser grandes
    const serialized = JSON.stringify(data);
    const sizeBytes = Buffer.byteLength(serialized, 'utf8');

    if (sizeBytes > maxBytes) {
      logger.warn(
        { sizeBytes, maxBytes, maxMb, idReg },
        'getFacturaDocumento: respuesta excede MAX_RESPONSE_SIZE_MB, aplicando guardrail',
      );
      return {
        truncated: true,
        warning: [
          `El documento supera el límite de ${maxMb} MB (${Math.round(sizeBytes / 1024 / 1024 * 10) / 10} MB).`,
          `Para descargar el documento, usa la URL del sistema Freemática directamente.`,
        ].join(' '),
        sizeBytes,
      };
    }

    return { truncated: false, ...data };
  }

  /**
   * Log de auditoría de una factura electrónica (envío, recepción, aceptación AAPP, etc.).
   *
   * Endpoint: GET /pven/v1/facturas/{idreg}/log
   *
   * @param idReg - Identificador opaco de la factura.
   * @param opts - Opciones de paginación.
   * @returns Lista paginada de eventos de auditoría con campos FVCTRLE_*.
   */
  async getFacturaLog(idReg: string, opts: ListOptions = {}): Promise<ListResult<Record<string, unknown>>> {
    return this.listResource<Record<string, unknown>>(
      `/pven/v1/facturas/${encodeURIComponent(idReg)}/log`,
      opts,
    );
  }

  /**
   * Configuración de la integración EDICOM (empresa, aplicación, URLs, credenciales).
   *
   * Endpoint: GET /pven/v1/facturas/edicominfo
   *
   * Devuelve una lista de configuraciones EDICOM (campos EDICOM_*).
   * NOTA: incluye campos sensibles (EDICOM_USER, EDICOM_PASSWORD). Usar con precaución.
   *
   * @param opts - Opciones de paginación.
   * @returns Lista de configuraciones EDICOM con campos EDICOM_*.
   */
  async getEdicomInfo(opts: ListOptions = {}): Promise<ListResult<Record<string, unknown>>> {
    return this.listResource<Record<string, unknown>>(
      '/pven/v1/facturas/edicominfo',
      opts,
    );
  }

  /**
   * Descarga masiva de documentos de facturas electrónicas (PDF/XML/ERROR).
   *
   * Endpoint: GET /pven/v1/facturas/download
   *
   * Permite recuperar múltiples documentos filtrando por identificadores y tipo.
   * Los documentos se devuelven con campos VoEFraDoc (empresa, serie, numFra, documentoPdf, etc.).
   *
   * @param opts - Filtros: documents (IDs separados por comas), documentType (PDF/XML/ERROR).
   * @returns Lista de documentos con campos VoEFraDoc.
   */
  async listFacturasDocumentos(
    opts: import('../schemas/facturas-electronicas.js').ListFacturasDocumentosFilters = {},
  ): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('https://placeholder/pven/v1/facturas/download');
    if (opts.documents !== undefined) url.searchParams.set('documents', opts.documents);
    if (opts.documentType !== undefined) url.searchParams.set('documentType', opts.documentType);

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  // ---------------------------------------------------------------------------
  // Albaranes de ventas — detalle (v0.5.1 / TD-155)
  // ---------------------------------------------------------------------------

  /**
   * Detalle de un albarán de venta por `idReg` opaco.
   *
   * Endpoint: GET /pven/v2/albaranes-ventas/{idReg}
   *
   * @param idReg - Identificador opaco (base64) del albarán.
   * @returns Objeto completo del albarán de venta.
   */
  async getAlbaranVenta(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pven/v2/albaranes-ventas/${encodeURIComponent(idReg)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Albaranes-facturas (v0.5.1 / TD-155)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de vinculaciones albarán↔factura.
   *
   * Endpoint: GET /pven/v2/albaranes-facturas
   *
   * El filtro `idReg` es un query param nativo. Los filtros empresa, serie,
   * numFactura y codCliente se envían como FIQL en el parámetro `rQuery`.
   *
   * Mapeo de filtros FIQL:
   * | opts.empresa    | FVCA_CODEMP   |
   * | opts.serie      | FVCA_SERIEFRA |
   * | opts.numFactura | FVCA_NUMFRA   |
   * | opts.codCliente | FVCA_CODCLI   |
   *
   * @param opts - Opciones de paginación y filtros.
   * @returns Lista paginada de vinculaciones albarán-factura.
   */
  async listAlbaranesFactura(opts: {
    page?: number;
    items?: number;
    idReg?: string;
    empresa?: string;
    serie?: string;
    numFactura?: string;
    codCliente?: string;
  }): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('https://placeholder/pven/v2/albaranes-facturas');

    // Paginación
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    // idReg como query param nativo
    if (opts.idReg !== undefined) url.searchParams.set('idReg', opts.idReg);

    // Filtros FIQL
    const fiqlGroup: Record<string, unknown> = {};
    if (opts.empresa !== undefined) fiqlGroup['FVCA_CODEMP'] = opts.empresa;
    if (opts.serie !== undefined) fiqlGroup['FVCA_SERIEFRA'] = opts.serie;
    if (opts.numFactura !== undefined) fiqlGroup['FVCA_NUMFRA'] = opts.numFactura;
    if (opts.codCliente !== undefined) fiqlGroup['FVCA_CODCLI'] = opts.codCliente;

    appendRquery(url, buildFiql(fiqlGroup as Parameters<typeof buildFiql>[0]));

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Detalle de una vinculación albarán↔factura por `idReg` opaco.
   *
   * Endpoint: GET /pven/v2/albaranes-facturas/{idReg}
   *
   * @param idReg - Identificador opaco (base64) del registro de vinculación.
   * @returns Objeto completo de la vinculación albarán-factura.
   */
  async getAlbaranFactura(idReg: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      `/pven/v2/albaranes-facturas/${encodeURIComponent(idReg)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Resultados de facturación — vigilancia (v0.5.1 / TD-155)
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de resultados del proceso batch de facturación de vigilancia.
   *
   * Endpoint: GET /pvss/v1/facturacion-resultados
   *
   * Todos los filtros se envían como FIQL en el parámetro `rquery`.
   * El parámetro `order` es nativo del endpoint.
   *
   * Mapeo de filtros FIQL:
   * | opts.empresa    | FACT_EMP     |
   * | opts.delegacion | FACT_DELEG   |
   * | opts.codCliente | FACT_COD_CLI |
   * | opts.calendario | FACT_CAL     |
   * | opts.mes        | FACT_MES     |
   * | opts.contrato   | FACT_CTRT    |
   * | opts.servicio   | FACT_SERV    |
   * | opts.tipoFac    | FACT_TIPFAC  |
   * | opts.traspasado | FACT_TRASP   |
   *
   * @param opts - Opciones de paginación y filtros FIQL.
   * @returns Lista paginada de resultados de facturación.
   */
  async listResultadosFacturacion(opts: {
    page?: number;
    items?: number;
    empresa?: string;
    delegacion?: string;
    codCliente?: string;
    calendario?: string;
    mes?: number;
    contrato?: string;
    servicio?: string;
    tipoFac?: string;
    traspasado?: string;
    order?: string;
  }): Promise<ListResult<Record<string, unknown>>> {
    const url = new URL('https://placeholder/pvss/v1/facturacion-resultados');

    // Paginación
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));

    // order es param nativo
    if (opts.order !== undefined) url.searchParams.set('order', opts.order);

    // Filtros FIQL
    const fiqlGroup: Record<string, unknown> = {};
    if (opts.empresa !== undefined) fiqlGroup['FACT_EMP'] = opts.empresa;
    if (opts.delegacion !== undefined) fiqlGroup['FACT_DELEG'] = opts.delegacion;
    if (opts.codCliente !== undefined) fiqlGroup['FACT_COD_CLI'] = opts.codCliente;
    if (opts.calendario !== undefined) fiqlGroup['FACT_CAL'] = opts.calendario;
    if (opts.mes !== undefined) fiqlGroup['FACT_MES'] = String(opts.mes);
    if (opts.contrato !== undefined) fiqlGroup['FACT_CTRT'] = opts.contrato;
    if (opts.servicio !== undefined) fiqlGroup['FACT_SERV'] = opts.servicio;
    if (opts.tipoFac !== undefined) fiqlGroup['FACT_TIPFAC'] = opts.tipoFac;
    if (opts.traspasado !== undefined) fiqlGroup['FACT_TRASP'] = opts.traspasado;

    appendRquery(url, buildFiql(fiqlGroup as Parameters<typeof buildFiql>[0]));

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<Record<string, unknown>>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  // ---------------------------------------------------------------------------
  // Contratos y Servicios (v0.7.0) — lectura
  // ---------------------------------------------------------------------------

  /**
   * Lista paginada de cabeceras de contratos.
   *
   * Endpoint: GET /pvss/v1/contratos
   *
   * IMPORTANTE: este endpoint IGNORA silenciosamente el query param `rQuery`
   * (verificado empíricamente contra el API real el 2026-07-02: con un filtro
   * FIQL válido devuelve el dataset completo sin error). Por eso solo se
   * exponen los filtros nativos `codEmpresa` y `codDelegacion`; cualquier otro
   * filtrado debe hacerse en cliente (ver `getContrato`).
   *
   * @param opts - Paginación + filtros nativos empresa/delegación + order.
   * @returns Lista paginada de cabeceras de contrato (campos CTRT_*).
   */
  async listContratos(
    opts: ListOptions & {
      empresa?: string;
      delegacion?: string;
      order?: string;
    } = {},
  ): Promise<ListResult<VoContrato>> {
    const url = new URL('https://placeholder/pvss/v1/contratos');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));
    if (opts.empresa !== undefined) url.searchParams.set('codEmpresa', opts.empresa);
    if (opts.delegacion !== undefined) url.searchParams.set('codDelegacion', opts.delegacion);
    if (opts.order !== undefined) url.searchParams.set('order', opts.order);

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<VoContrato>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Busca una cabecera de contrato por sus códigos naturales.
   *
   * No existe un endpoint GET singular para contratos pvss y el listado ignora
   * `rQuery`, así que se pagina el listado (items=200, máximo permitido por el
   * API) filtrando en cliente por CTRT_COD hasta encontrar la coincidencia.
   *
   * @param opts - Códigos naturales del contrato.
   * @returns Cabecera del contrato.
   * @throws FreematicaError('not_found') si no existe.
   */
  async getContrato(opts: {
    empresa: string;
    delegacion?: string;
    codContrato: string;
  }): Promise<VoContrato> {
    const PAGE_SIZE = 200;
    const MAX_PAGES = 100; // guardarraíl: 20.000 contratos

    for (let page = 1; page <= MAX_PAGES; page++) {
      const { items } = await this.listContratos({
        empresa: opts.empresa,
        delegacion: opts.delegacion,
        page,
        items: PAGE_SIZE,
      });
      const match = items.find(
        (c) =>
          String(c['CTRT_COD']) === opts.codContrato &&
          String(c['CTRT_EMP']) === opts.empresa &&
          (opts.delegacion === undefined || String(c['CTRT_DELEG']) === opts.delegacion),
      );
      if (match) return match;
      if (items.length < PAGE_SIZE) break;
    }
    throw new FreematicaError(
      'not_found',
      `Contrato no encontrado: empresa=${opts.empresa} delegacion=${opts.delegacion ?? '*'} codContrato=${opts.codContrato}`,
    );
  }

  /**
   * Lista paginada de servicios de un contrato.
   *
   * Endpoint: GET /pvss/v1/contratos/{idContrato}/servicios
   *
   * @param idContrato - idReg opaco del contrato (Base64 "EMP__DELEG__COD").
   * @param opts - Paginación + order.
   * @returns Lista paginada de servicios (campos CTRTS_*).
   */
  async listServiciosContrato(
    idContrato: string,
    opts: ListOptions & { order?: string } = {},
  ): Promise<ListResult<VoContratoServicio>> {
    const url = new URL(
      `https://placeholder/pvss/v1/contratos/${encodeURIComponent(idContrato)}/servicios`,
    );
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));
    if (opts.order !== undefined) url.searchParams.set('order', opts.order);

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<VoContratoServicio>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Detalle de un servicio de contrato por `idReg` opaco.
   *
   * Endpoint: GET /pvss/v2/contratos-servicios/{idreg}
   *
   * @param idReg - idReg opaco del servicio (Base64 "EMP__DELEG__CTRT__COD").
   * @returns Servicio completo.
   */
  async getServicioContrato(idReg: string): Promise<VoContratoServicio> {
    return this.get<VoContratoServicio>(
      `/pvss/v2/contratos-servicios/${encodeURIComponent(idReg)}`,
    );
  }

  /**
   * Lista paginada de opcionales de contratos.
   *
   * Endpoint: GET /ppre/v2/contratos/opcionales
   *
   * @param opts - Paginación + order.
   * @returns Lista paginada de opcionales (campos CON2_*).
   */
  async listContratosOpcionales(
    opts: ListOptions & { order?: string } = {},
  ): Promise<ListResult<VoContratosOpcionales>> {
    const url = new URL('https://placeholder/ppre/v2/contratos/opcionales');
    if (opts.items !== undefined) url.searchParams.set('items', String(opts.items));
    if (opts.page !== undefined) url.searchParams.set('page', String(opts.page));
    if (opts.order !== undefined) url.searchParams.set('order', opts.order);

    const path = url.pathname + (url.search ? url.search : '');
    const data = await this.get<FreematicaListData<VoContratosOpcionales>>(path);
    return { items: data.items, total: Number(data.total) };
  }

  /**
   * Detalle de un registro de opcionales de contrato por `idReg` opaco.
   *
   * Endpoint: GET /ppre/v2/contratos/opcionales/{idReg}
   */
  async getContratoOpcionales(idReg: string): Promise<VoContratosOpcionales> {
    return this.get<VoContratosOpcionales>(
      `/ppre/v2/contratos/opcionales/${encodeURIComponent(idReg)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Contratos y Servicios (v0.7.0) — escritura (create/update, sin delete)
  //
  // Todas las operaciones de escritura se registran en el log (nivel info con
  // la operación y claves del registro; nivel debug con el body completo) para
  // soportar auditoría y rollback manual.
  // ---------------------------------------------------------------------------

  /**
   * Alta de cabecera de contrato.
   *
   * Endpoint: POST /pvss/v2/contratos — body VoContratos.
   * Campos requeridos por el API: CTRT_DELEG, CTRT_DES, CTRT_FECHA, CTRT_COD_CLI.
   *
   * @param body - Campos CTRT_* del contrato.
   * @returns El contrato creado (VoContratos).
   */
  async createContrato(body: VoContrato): Promise<VoContrato> {
    this.logWrite('createContrato', 'POST /pvss/v2/contratos', body);
    return this.post<VoContrato>('/pvss/v2/contratos', body);
  }

  /**
   * Actualización de cabecera de contrato.
   *
   * Endpoint: PUT /pvss/v2/contratos/{idReg} — body VoContratos.
   *
   * @param idReg - idReg opaco del contrato.
   * @param body - Campos CTRT_* a actualizar.
   * @returns Respuesta del API.
   */
  async updateContrato(idReg: string, body: VoContrato): Promise<VoContrato> {
    this.logWrite('updateContrato', `PUT /pvss/v2/contratos/${idReg}`, body);
    return this.put<VoContrato>(`/pvss/v2/contratos/${encodeURIComponent(idReg)}`, body);
  }

  /**
   * Alta de un servicio en un contrato.
   *
   * Endpoint: POST /pvss/v2/contratos/{idReg}/servicios — body VoServicios.
   * Campos requeridos por el API: CTRTS_EMP, CTRTS_DELEG, CTRTS_CTRT (los
   * mismos valores codificados en el idReg del contrato).
   *
   * @param idContrato - idReg opaco del contrato.
   * @param body - Campos CTRTS_* del servicio.
   * @returns El servicio creado (VoServicios).
   */
  async createServicioContrato(
    idContrato: string,
    body: VoContratoServicio,
  ): Promise<VoContratoServicio> {
    this.logWrite(
      'createServicioContrato',
      `POST /pvss/v2/contratos/${idContrato}/servicios`,
      body,
    );
    return this.post<VoContratoServicio>(
      `/pvss/v2/contratos/${encodeURIComponent(idContrato)}/servicios`,
      body,
    );
  }

  /**
   * Actualiza fechas de inicio y fin de un servicio.
   *
   * Endpoint: PUT /pvss/v2/contratos/{idContrato}/servicio/{idServicio}.
   * Según el spec, este endpoint solo actualiza fecha inicio y fecha fin.
   *
   * @param idContrato - idReg opaco del contrato.
   * @param idServicio - idReg opaco del servicio.
   * @param body - Campos CTRTS_* (fechas) a actualizar.
   * @returns Respuesta del API.
   */
  async updateServicioFechas(
    idContrato: string,
    idServicio: string,
    body: VoContratoServicio,
  ): Promise<VoContratoServicio> {
    this.logWrite(
      'updateServicioFechas',
      `PUT /pvss/v2/contratos/${idContrato}/servicio/${idServicio}`,
      body,
    );
    return this.put<VoContratoServicio>(
      `/pvss/v2/contratos/${encodeURIComponent(idContrato)}/servicio/${encodeURIComponent(idServicio)}`,
      body,
    );
  }

  /**
   * Actualiza los datos de facturación de un servicio.
   *
   * Endpoint: PUT /pvss/v2/contratos/{idContrato}/servicios-facturacion/{idServicio}.
   *
   * @param idContrato - idReg opaco del contrato.
   * @param idServicio - idReg opaco del servicio.
   * @param body - Campos CTRTF_* a actualizar.
   * @returns Respuesta del API.
   */
  async updateServicioFacturacion(
    idContrato: string,
    idServicio: string,
    body: VoServiciosFac,
  ): Promise<VoServiciosFac> {
    this.logWrite(
      'updateServicioFacturacion',
      `PUT /pvss/v2/contratos/${idContrato}/servicios-facturacion/${idServicio}`,
      body,
    );
    return this.put<VoServiciosFac>(
      `/pvss/v2/contratos/${encodeURIComponent(idContrato)}/servicios-facturacion/${encodeURIComponent(idServicio)}`,
      body,
    );
  }

  /**
   * Alta de un texto de facturación de un servicio.
   *
   * Endpoint: POST /pvss/v2/contratos/{idContrato}/servicios-facturacion-txt/{idServicio}.
   *
   * @param idContrato - idReg opaco del contrato.
   * @param idServicio - idReg opaco del servicio.
   * @param body - Campos CTRTFL_* del texto.
   * @returns Respuesta del API.
   */
  async createServicioFacturacionTxt(
    idContrato: string,
    idServicio: string,
    body: VoServiciosFacTxt,
  ): Promise<VoServiciosFacTxt> {
    this.logWrite(
      'createServicioFacturacionTxt',
      `POST /pvss/v2/contratos/${idContrato}/servicios-facturacion-txt/${idServicio}`,
      body,
    );
    return this.post<VoServiciosFacTxt>(
      `/pvss/v2/contratos/${encodeURIComponent(idContrato)}/servicios-facturacion-txt/${encodeURIComponent(idServicio)}`,
      body,
    );
  }

  /**
   * Alta de un registro de histórico de precios de un servicio.
   *
   * Endpoint: POST /pvss/v2/contratos/{idContrato}/servicios-historico-precios/{idServicio}.
   *
   * @param idContrato - idReg opaco del contrato.
   * @param idServicio - idReg opaco del servicio.
   * @param body - Campos SERVHPR_* del histórico.
   * @returns Respuesta del API (VoServiciosHistPr).
   */
  async createServicioHistoricoPrecios(
    idContrato: string,
    idServicio: string,
    body: VoServiciosHistPr,
  ): Promise<VoServiciosHistPr> {
    this.logWrite(
      'createServicioHistoricoPrecios',
      `POST /pvss/v2/contratos/${idContrato}/servicios-historico-precios/${idServicio}`,
      body,
    );
    return this.post<VoServiciosHistPr>(
      `/pvss/v2/contratos/${encodeURIComponent(idContrato)}/servicios-historico-precios/${encodeURIComponent(idServicio)}`,
      body,
    );
  }

  /**
   * Actualiza un registro de histórico de precios de un servicio.
   *
   * Endpoint: PUT /pvss/v2/contratos/{idContrato}/servicios-historico-precios/{idServicio}.
   *
   * @param idContrato - idReg opaco del contrato.
   * @param idServicio - idReg opaco del servicio.
   * @param body - Campos SERVHPR_* a actualizar.
   * @returns Respuesta del API.
   */
  async updateServicioHistoricoPrecios(
    idContrato: string,
    idServicio: string,
    body: VoServiciosHistPr,
  ): Promise<VoServiciosHistPr> {
    this.logWrite(
      'updateServicioHistoricoPrecios',
      `PUT /pvss/v2/contratos/${idContrato}/servicios-historico-precios/${idServicio}`,
      body,
    );
    return this.put<VoServiciosHistPr>(
      `/pvss/v2/contratos/${encodeURIComponent(idContrato)}/servicios-historico-precios/${encodeURIComponent(idServicio)}`,
      body,
    );
  }

  /**
   * Alta de un registro de opcionales de contrato.
   *
   * Endpoint: POST /ppre/v2/contratos/opcionales — body VoContratosOpcionales.
   * Campos requeridos por el API: CON2_CODEMP, CON2_DELEG, CON2_TIPOCONT,
   * CON2_NUMCONT, CON2_FCHCONT.
   *
   * @param body - Campos CON2_* del registro.
   * @returns El registro creado.
   */
  async createContratoOpcionales(body: VoContratosOpcionales): Promise<VoContratosOpcionales> {
    this.logWrite('createContratoOpcionales', 'POST /ppre/v2/contratos/opcionales', body);
    return this.post<VoContratosOpcionales>('/ppre/v2/contratos/opcionales', body);
  }

  /**
   * Actualiza un registro de opcionales de contrato.
   *
   * Endpoint: PUT /ppre/v2/contratos/opcionales/{idReg}.
   *
   * @param idReg - idReg opaco del registro de opcionales.
   * @param body - Campos CON2_* a actualizar.
   * @returns Respuesta del API.
   */
  async updateContratoOpcionales(
    idReg: string,
    body: VoContratosOpcionales,
  ): Promise<VoContratosOpcionales> {
    this.logWrite(
      'updateContratoOpcionales',
      `PUT /ppre/v2/contratos/opcionales/${idReg}`,
      body,
    );
    return this.put<VoContratosOpcionales>(
      `/ppre/v2/contratos/opcionales/${encodeURIComponent(idReg)}`,
      body,
    );
  }

  /**
   * Log de auditoría de operaciones de escritura.
   *
   * Nivel info: operación + endpoint + claves del body (sin valores).
   * Nivel debug: body completo, para poder reconstruir la operación.
   */
  private logWrite(operation: string, endpoint: string, body: Record<string, unknown>): void {
    logger.info({ operation, endpoint, fields: Object.keys(body) }, 'freematica write');
    logger.debug({ operation, endpoint, body }, 'freematica write body');
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

/**
 * Resultado de getFacturaDocumento.
 *
 * - Si truncated=false: incluye todos los campos VoFacturasDocumento (FACED_DOCUMENTO_PDF, etc.).
 * - Si truncated=true: incluye solo `truncated`, `warning` y `sizeBytes` (sin el cuerpo del documento).
 */
export type FacturaDocumentoResult =
  | ({ truncated: false } & Record<string, unknown>)
  | { truncated: true; warning: string; sizeBytes: number };

// ---------------------------------------------------------------------------
// Helpers privados del módulo
// ---------------------------------------------------------------------------

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
