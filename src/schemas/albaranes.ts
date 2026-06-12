import { z } from 'zod';
import { PaginationSchema } from './pagination.js';

// ---------------------------------------------------------------------------
// Albaranes de ventas (GET /pven/v2/albaranes-ventas)
// ---------------------------------------------------------------------------
//
// Mapeo de filtros → query params del endpoint:
//
// Los params con (*) se envían como query params NATIVOS (no FIQL).
// El endpoint albaranes-ventas usa exclusivamente params nativos para todos
// sus filtros (no expone `rQuery` para los filtros principales).
//
// | Filtro lógico        | Param nativo   | Campo response |
// |----------------------|----------------|----------------|
// | empresa (*)          | codEmpresa     | ALVC_CODEMP    |
// | delegacion           | codDelegacion  | ALVC_DELEG     |
// | codCliente           | codCliente     | ALVC_CODCLI    |
// | codDocumento         | codDocumento   | ALVC_CODDOC    |
// | fechaDesde           | desdeFecha     | ALVC_FCHDOC    |
// | fechaHasta           | hastaFecha     | ALVC_FCHDOC    |
// | (orden)              | order          | —              |
// | page / items         | page / items   | —              |

/**
 * Filtros tipados para `freematica_list_albaranes_ventas`.
 *
 * El endpoint GET /pven/v2/albaranes-ventas usa exclusivamente query params
 * nativos. `codEmpresa` es obligatorio según el spec OpenAPI.
 *
 * Mapeo:
 * | Filtro       | Query param    |
 * |--------------|----------------|
 * | empresa      | codEmpresa     |
 * | delegacion   | codDelegacion  |
 * | codCliente   | codCliente     |
 * | codDocumento | codDocumento   |
 * | fechaDesde   | desdeFecha     |
 * | fechaHasta   | hastaFecha     |
 * | order        | order          |
 */
export const ListAlbaranesVentasFiltersSchema = {
  ...PaginationSchema,
  empresa: z
    .string()
    .min(1)
    .max(4)
    .describe('Código de empresa Freemática (ALVC_CODEMP). Ej.: "1". Requerido por el endpoint.'),
  delegacion: z
    .string()
    .min(1)
    .optional()
    .describe('Código de delegación (ALVC_DELEG). Se envía como codDelegacion.'),
  codCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del cliente (ALVC_CODCLI). Se envía como codCliente.'),
  codDocumento: z
    .string()
    .min(1)
    .optional()
    .describe('Código de documento/serie del albarán (ALVC_CODDOC). Se envía como codDocumento.'),
  fechaDesde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD')
    .optional()
    .describe('Fecha inicio del albarán (ALVC_FCHDOC). Formato YYYY-MM-DD. Se envía como desdeFecha.'),
  fechaHasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD')
    .optional()
    .describe('Fecha fin del albarán (ALVC_FCHDOC). Formato YYYY-MM-DD. Se envía como hastaFecha.'),
  order: z
    .string()
    .min(1)
    .optional()
    .describe('Campo de ordenación (ej: "ALVC_FCHDOC DESC"). Valor libre enviado como param nativo.'),
};

export type ListAlbaranesVentasFilters = {
  page?: number;
  items?: number;
  empresa: string;
  delegacion?: string;
  codCliente?: string;
  codDocumento?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  order?: string;
};

// ---------------------------------------------------------------------------
// Albaranes-facturas (GET /pven/v2/albaranes-facturas)
// ---------------------------------------------------------------------------
//
// Vinculación albarán ↔ factura. Este endpoint expone muy pocos filtros:
// - `idReg`   (query param nativo) — ID opaco del registro de vinculación
// - `rQuery`  (FIQL) — para filtros sobre campos FVCA_*
//
// Campos del response (prefijo FVCA_*):
// | Campo FIQL       | Semántica                       |
// |------------------|---------------------------------|
// | FVCA_CODEMP      | Empresa                         |
// | FVCA_SERIEFRA    | Serie de factura                |
// | FVCA_NUMFRA      | Número de factura               |
// | FVCA_CODCLI      | Código de cliente               |
// | FVCA_NUMALB      | Número de albarán               |
// | FVCA_FCHALB      | Fecha del albarán               |
// | FVCA_NUMPED      | Número de pedido relacionado    |
// | FVCA_FCHPED      | Fecha del pedido                |
// | FVCA_FCHFAC      | Fecha de factura                |
// | FVCA_CODDOC      | Código de documento             |
//
// Filtros propuestos:
// - `idReg`       → query param nativo (caso principal)
// - `empresa`     → FIQL FVCA_CODEMP==X
// - `serie`       → FIQL FVCA_SERIEFRA==X
// - `numFactura`  → FIQL FVCA_NUMFRA==N  (string, aunque el campo es integer)
// - `codCliente`  → FIQL FVCA_CODCLI==X

/**
 * Filtros tipados para `freematica_list_albaranes_factura`.
 *
 * Endpoint: GET /pven/v2/albaranes-facturas
 *
 * El filtro `idReg` es un query param nativo. El resto se pasan como FIQL
 * en el parámetro `rQuery`.
 *
 * Mapeo:
 * | Filtro      | Mecanismo | Campo         |
 * |-------------|-----------|---------------|
 * | idReg       | nativo    | —             |
 * | empresa     | FIQL      | FVCA_CODEMP   |
 * | serie       | FIQL      | FVCA_SERIEFRA |
 * | numFactura  | FIQL      | FVCA_NUMFRA   |
 * | codCliente  | FIQL      | FVCA_CODCLI   |
 */
export const ListAlbaranesFacturaFiltersSchema = {
  ...PaginationSchema,
  idReg: z
    .string()
    .min(1)
    .optional()
    .describe('ID opaco del registro de vinculación albarán-factura. Se envía como query param nativo.'),
  empresa: z
    .string()
    .min(1)
    .max(4)
    .optional()
    .describe('Código de empresa (FVCA_CODEMP). Filtro FIQL.'),
  serie: z
    .string()
    .min(1)
    .optional()
    .describe('Serie de la factura (FVCA_SERIEFRA). Filtro FIQL.'),
  numFactura: z
    .string()
    .min(1)
    .optional()
    .describe('Número de factura (FVCA_NUMFRA). Filtro FIQL.'),
  codCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código del cliente (FVCA_CODCLI). Filtro FIQL.'),
};

export type ListAlbaranesFacturaFilters = {
  page?: number;
  items?: number;
  idReg?: string;
  empresa?: string;
  serie?: string;
  numFactura?: string;
  codCliente?: string;
};

// ---------------------------------------------------------------------------
// Resultados de facturación (GET /pvss/v1/facturacion-resultados)
// ---------------------------------------------------------------------------
//
// Resultados del proceso batch de facturación automática desde vigilancia.
// Este endpoint solo expone `rquery`/`rQuery` (FIQL) + `page` + `order`.
//
// Campos del response (prefijo FACT_*):
// | Campo FIQL       | Semántica                          |
// |------------------|------------------------------------|
// | FACT_EMP         | Empresa                            |
// | FACT_DELEG       | Delegación                         |
// | FACT_CAL         | Calendario (año)                   |
// | FACT_MES         | Mes del proceso                    |
// | FACT_CTRT        | Contrato de servicios              |
// | FACT_SERV        | Servicio                           |
// | FACT_TIPFAC      | Tipo de facturación                |
// | FACT_COD_CLI     | Código de cliente                  |
// | FACT_TRASP       | Estado de traspaso                 |
// | FACT_NUMDOC      | Número de documento generado       |
// | FACT_PORC_FAC    | Porcentaje de facturación          |

/**
 * Filtros tipados para `freematica_list_resultados_facturacion`.
 *
 * Endpoint: GET /pvss/v1/facturacion-resultados
 *
 * Todos los filtros se envían como FIQL en el parámetro `rquery`.
 *
 * Mapeo:
 * | Filtro      | Campo FIQL   |
 * |-------------|--------------|
 * | empresa     | FACT_EMP     |
 * | delegacion  | FACT_DELEG   |
 * | codCliente  | FACT_COD_CLI |
 * | calendario  | FACT_CAL     |
 * | mes         | FACT_MES     |
 * | contrato    | FACT_CTRT    |
 * | servicio    | FACT_SERV    |
 * | tipoFac     | FACT_TIPFAC  |
 * | traspasado  | FACT_TRASP   |
 * | order       | order        |
 */
export const ListResultadosFacturacionFiltersSchema = {
  ...PaginationSchema,
  empresa: z
    .string()
    .min(1)
    .max(4)
    .optional()
    .describe('Código de empresa (FACT_EMP). Filtro FIQL.'),
  delegacion: z
    .string()
    .min(1)
    .optional()
    .describe('Código de delegación (FACT_DELEG). Filtro FIQL.'),
  codCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código del cliente (FACT_COD_CLI). Filtro FIQL.'),
  calendario: z
    .string()
    .min(1)
    .optional()
    .describe('Año del calendario de facturación (FACT_CAL). Filtro FIQL. Ej.: "2024".'),
  mes: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe('Mes del proceso de facturación (FACT_MES, 1-12). Filtro FIQL.'),
  contrato: z
    .string()
    .min(1)
    .optional()
    .describe('Código de contrato de servicios (FACT_CTRT). Filtro FIQL.'),
  servicio: z
    .string()
    .min(1)
    .optional()
    .describe('Código de servicio (FACT_SERV). Filtro FIQL.'),
  tipoFac: z
    .string()
    .min(1)
    .optional()
    .describe('Tipo de facturación (FACT_TIPFAC). Filtro FIQL.'),
  traspasado: z
    .string()
    .min(1)
    .optional()
    .describe('Estado de traspaso de la facturación (FACT_TRASP). Filtro FIQL. Ej.: "S" (sí), "N" (no).'),
  order: z
    .string()
    .min(1)
    .optional()
    .describe('Campo de ordenación (ej: "FACT_MES DESC"). Param nativo order.'),
};

export type ListResultadosFacturacionFilters = {
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
};
