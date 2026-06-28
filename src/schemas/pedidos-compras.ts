import { z } from 'zod';
import { PaginationSchema } from './pagination.js';

/**
 * Enum lógico del estado de un pedido de compra.
 *
 * Mapeo a FIQL sobre los campos `ALCC_PED_BLOQ` y `ALCC_PED_RECIB`:
 *
 * - `pendiente`  → `ALCC_PED_BLOQ=='';ALCC_PED_RECIB==''`
 *   (ambos campos vacíos — pedido abierto, ni bloqueado ni recibido)
 * - `bloqueado`  → `ALCC_PED_BLOQ!=''`
 *   (campo ALCC_PED_BLOQ tiene algún valor centinela)
 * - `recibido`   → `ALCC_PED_RECIB!=''`
 *   (campo ALCC_PED_RECIB tiene algún valor centinela)
 *
 * ASUNCIÓN EMPÍRICA — convención nullable en Freemática FIQL:
 * La API de Freemática no expone IS NULL nativo en FIQL. La convención
 * observada en otras tablas del sistema (ver TD-118: ASI_BORR, CARCL_FECIMPAG)
 * es representar el valor nulo/ausente como cadena vacía `''` en expresiones
 * `==` / `!=`. Para ALCC_PED_BLOQ y ALCC_PED_RECIB:
 *   - bloqueado=true  → `ALCC_PED_BLOQ!=''`  (campo tiene valor → bloqueado)
 *   - recibido=true   → `ALCC_PED_RECIB!=''` (campo tiene valor → recibido)
 *   - pendiente       → ambos campos vacíos
 *
 * Esta convención NO ha sido verificada contra la API real de Freemática.
 * Si en pruebas funcionales el filtro no actúa correctamente, puede que el
 * centinela sea el literal `null` (como en CARCL_FECIMPAG), un valor 'S'/'N'
 * o un valor numérico '1'/'0'. Documentado para futura verificación empírica.
 *
 * TODO(TD-152): verificar contra API real cuando esté disponible.
 */
export const EstadoPedidoEnum = z.enum(['pendiente', 'bloqueado', 'recibido']);

export type EstadoPedido = z.infer<typeof EstadoPedidoEnum>;

/**
 * Genera la expresión FIQL para el filtro de estado de pedido de compra.
 *
 * El estado se mapea a expresiones FIQL sobre `ALCC_PED_BLOQ` y `ALCC_PED_RECIB`.
 * Ver `EstadoPedidoEnum` para la documentación completa de la convención.
 *
 * @param estado - Valor del enum de estado.
 * @returns Expresión FIQL para incluir en `rquery` (sin `rquery=`).
 */
export function buildEstadoPedidoFiql(estado: EstadoPedido): string {
  switch (estado) {
    case 'pendiente':
      return "ALCC_PED_BLOQ=='';ALCC_PED_RECIB==''";
    case 'bloqueado':
      return "ALCC_PED_BLOQ!=''";
    case 'recibido':
      return "ALCC_PED_RECIB!=''";
  }
}

/**
 * Filtros tipados para `freematica_list_pedidos_compra`.
 *
 * El endpoint GET /pcmp/v2/pedidos tiene un diseño mixto:
 * - 4 filtros como **query params nativos** (no FIQL): codEmpresa, desdeFecha, hastaFecha, codProveedor.
 * - El resto de filtros via **rQuery** (FIQL) con campos ALCC_*.
 *
 * Mapeo completo:
 * | Filtro lógico        | Destino             | Campo API              |
 * |----------------------|---------------------|------------------------|
 * | empresa (4c)         | query param nativo  | codEmpresa             |
 * | codProveedor (10c)   | query param nativo  | codProveedor           |
 * | fechaPedidoDesde     | query param nativo  | desdeFecha             |
 * | fechaPedidoHasta     | query param nativo  | hastaFecha             |
 * | numPedido            | FIQL rquery         | ALCC_NUMDOC            |
 * | codDocumento (4c)    | FIQL rquery         | ALCC_CODDOC            |
 * | delegacion (4c)      | FIQL rquery         | ALCC_DELEG             |
 * | formaPago (3c)       | FIQL rquery         | ALCC_FPAGO             |
 * | tipoIva (4c)         | FIQL rquery         | ALCC_TIPO_IVA          |
 * | codCliente (10c)     | FIQL rquery         | ALCC_COD_CLIENTE       |
 * | codInstalador        | FIQL rquery         | ALCC_COD_INSTALADOR    |
 * | codMantenedor        | FIQL rquery         | ALCC_COD_MANTENEDOR    |
 * | fechaEntregaDesde    | FIQL rquery         | ALCC_FCHENTREGA =ge=   |
 * | fechaEntregaHasta    | FIQL rquery         | ALCC_FCHENTREGA =le=   |
 * | referencia (40c)     | FIQL rquery         | ALCC_REFERENCIA        |
 * | estado               | FIQL rquery compuesta| ALCC_PED_BLOQ + ALCC_PED_RECIB |
 */
export const ListPedidosCompraFiltersSchema = {
  ...PaginationSchema,

  // -------------------------------------------------------------------------
  // Filtros nativos (query params, NO FIQL)
  // -------------------------------------------------------------------------

  empresa: z
    .string()
    .length(4)
    .optional()
    .describe(
      'Código de empresa Freemática, exactamente 4 caracteres. ' +
      'Se envía como query param nativo `codEmpresa` (NO FIQL). Ej.: "1000".',
    ),

  codProveedor: z
    .string()
    .min(1)
    .max(10)
    .optional()
    .describe(
      'Código natural del proveedor, hasta 10 caracteres. ' +
      'Se envía como query param nativo `codProveedor` (NO FIQL). Ej.: "P001".',
    ),

  fechaPedidoDesde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato ISO YYYY-MM-DD')
    .optional()
    .describe(
      'Fecha inicio del rango de búsqueda por fecha de pedido (ISO YYYY-MM-DD). ' +
      'Se envía como query param nativo `desdeFecha` (NO FIQL). Ej.: "2025-01-01".',
    ),

  fechaPedidoHasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato ISO YYYY-MM-DD')
    .optional()
    .describe(
      'Fecha fin del rango de búsqueda por fecha de pedido (ISO YYYY-MM-DD). ' +
      'Se envía como query param nativo `hastaFecha` (NO FIQL). Ej.: "2025-12-31".',
    ),

  // -------------------------------------------------------------------------
  // Filtros FIQL (via rquery con campos ALCC_*)
  // -------------------------------------------------------------------------

  numPedido: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Número de pedido (hasta 8 dígitos). ' +
      'FIQL: ALCC_NUMDOC==N. Ej.: 12345678.',
    ),

  codDocumento: z
    .string()
    .length(4)
    .optional()
    .describe(
      'Código de tipo de documento, exactamente 4 caracteres. ' +
      'FIQL: ALCC_CODDOC==XXXX. Ej.: "PCMP".',
    ),

  delegacion: z
    .string()
    .length(4)
    .optional()
    .describe(
      'Código de delegación, exactamente 4 caracteres. ' +
      'FIQL: ALCC_DELEG==XXXX. Ej.: "MAD1".',
    ),

  formaPago: z
    .string()
    .length(3)
    .optional()
    .describe(
      'Código de forma de pago, exactamente 3 caracteres. ' +
      'FIQL: ALCC_FPAGO==XXX. Ej.: "TRF".',
    ),

  tipoIva: z
    .string()
    .length(4)
    .optional()
    .describe(
      'Código de tipo de IVA, exactamente 4 caracteres. ' +
      'FIQL: ALCC_TIPO_IVA==XXXX. Ej.: "GEN1".',
    ),

  codCliente: z
    .string()
    .min(1)
    .max(10)
    .optional()
    .describe(
      'Código natural del cliente asociado al pedido, hasta 10 caracteres. ' +
      'FIQL: ALCC_COD_CLIENTE==X. Ej.: "0001000".',
    ),

  codInstalador: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Código del instalador asociado al pedido. ' +
      'FIQL: ALCC_COD_INSTALADOR==X.',
    ),

  codMantenedor: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Código del mantenedor asociado al pedido. ' +
      'FIQL: ALCC_COD_MANTENEDOR==X.',
    ),

  fechaEntregaDesde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato ISO YYYY-MM-DD')
    .optional()
    .describe(
      'Fecha inicio del rango de fecha de entrega del pedido (ISO YYYY-MM-DD). ' +
      'FIQL: ALCC_FCHENTREGA=ge=YYYY-MM-DD. Ej.: "2025-01-01".',
    ),

  fechaEntregaHasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato ISO YYYY-MM-DD')
    .optional()
    .describe(
      'Fecha fin del rango de fecha de entrega del pedido (ISO YYYY-MM-DD). ' +
      'FIQL: ALCC_FCHENTREGA=le=YYYY-MM-DD. Ej.: "2025-12-31".',
    ),

  referencia: z
    .string()
    .min(1)
    .max(40)
    .optional()
    .describe(
      'Referencia exacta del pedido (hasta 40 caracteres). ' +
      'FIQL: ALCC_REFERENCIA==X (match exacto). Ej.: "REF-2025-001".',
    ),

  estado: EstadoPedidoEnum
    .optional()
    .describe(
      'Estado del pedido de compra. Valores: ' +
      '"pendiente" (ni bloqueado ni recibido → ALCC_PED_BLOQ==\'\';ALCC_PED_RECIB==\'\'), ' +
      '"bloqueado" (ALCC_PED_BLOQ!= \'\'), ' +
      '"recibido" (ALCC_PED_RECIB!=\'\'). ' +
      'NOTA EMPÍRICA: convención de campo vacío como centinela de "sin valor" en Freemática FIQL; ' +
      'verificar contra API real si el filtro no produce resultados esperados.',
    ),
};

/** Tipo inferido de los filtros de listado de pedidos de compra. */
export type ListPedidosCompraFilters = {
  [K in keyof typeof ListPedidosCompraFiltersSchema]?: z.infer<(typeof ListPedidosCompraFiltersSchema)[K]>;
};
