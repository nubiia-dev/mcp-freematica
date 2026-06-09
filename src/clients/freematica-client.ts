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
