import { z } from 'zod';
import { PaginationSchema } from './pagination.js';

/**
 * Filtros tipados para `freematica_list_facturas_cabecera`.
 *
 * Todos los campos son opcionales y se combinan con AND en la FIQL generada
 * (`rquery`). El campo de paginación hereda de `PaginationSchema`.
 *
 * Mapeo de filtros → campos FIQL de Freemática:
 * | Filtro lógico              | Campo FIQL       |
 * |----------------------------|------------------|
 * | empresa                    | FVC_CODEMP          |
 * | codCliente                 | FVC_CODCLI       |
 * | representante              | FVC_CODREPRES       |
 * | fechaFacturaDesde          | FVC_FCHFAC =ge=  |
 * | fechaFacturaHasta          | FVC_FCHFAC =lt= (día siguiente; =le= responde 500) |
 *
 * fechaFacturaDesde y fechaFacturaHasta son EXCLUYENTES entre sí: el API
 * devuelve 0 filas si se combinan dos condiciones de rango sobre el mismo
 * campo (verificado en producción).
 * | serie                      | FVC_SERIEFRA       |
 * | numFactura                 | FVC_NUMFRA       |
 * | formaPago                  | FVC_FPAGO      |
 * | traspasadoContabilidad     | FVC_TRASP_CONTAB      |
 * | delegacion                 | FVC_DELEG        |
 */
export const ListFacturasCabeceraFiltersSchema = {
  ...PaginationSchema,
  empresa: z
    .string()
    .min(1)
    .optional()
    .describe('Código de empresa Freemática (FVC_CODEMP). Ej.: "1".'),
  codCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del cliente facturado (FVC_CODCLI).'),
  representante: z
    .string()
    .min(1)
    .optional()
    .describe('Código del representante/comercial (FVC_CODREPRES).'),
  fechaFacturaDesde: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD',
    )
    .optional()
    .describe('Fecha inicio de la factura (FVC_FCHFAC). Formato YYYY-MM-DD. Inclusive. EXCLUYENTE con fechaFacturaHasta: usa solo uno de los dos por consulta (limitación del API).'),
  fechaFacturaHasta: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD',
    )
    .optional()
    .describe('Fecha fin de la factura (FVC_FCHFAC). Formato YYYY-MM-DD. Inclusive. EXCLUYENTE con fechaFacturaDesde: usa solo uno de los dos por consulta (limitación del API).'),
  serie: z
    .string()
    .min(1)
    .optional()
    .describe('Serie de facturación (FVC_SERIEFRA). Ej.: "A", "B".'),
  numFactura: z
    .string()
    .min(1)
    .optional()
    .describe('Número de factura exacto (FVC_NUMFRA).'),
  formaPago: z
    .string()
    .min(1)
    .optional()
    .describe('Código de forma de pago (FVC_FPAGO). Ej.: "REC", "TRF".'),
  traspasadoContabilidad: z
    .boolean()
    .optional()
    .describe(
      'Si true, filtra facturas ya traspasadas a contabilidad (FVC_TRASP_CONTAB). Si false, las no traspasadas.',
    ),
  delegacion: z
    .string()
    .min(1)
    .optional()
    .describe('Código de delegación (FVC_DELEG).'),
};

export type ListFacturasCabeceraFilters = {
  page?: number;
  items?: number;
  empresa?: string;
  codCliente?: string;
  representante?: string;
  fechaFacturaDesde?: string;
  fechaFacturaHasta?: string;
  serie?: string;
  numFactura?: string;
  formaPago?: string;
  traspasadoContabilidad?: boolean;
  delegacion?: string;
};

/**
 * Filtros tipados para `freematica_list_factura_lineas`.
 *
 * Mapeo de filtros → campos FIQL de Freemática (prefijo `FVL_`):
 * | Filtro lógico  | Campo FIQL       |
 * |----------------|------------------|
 * | codArticulo    | FVL_CODARTIC       |
 * | codFamilia     | FVL_COD_FAMILIA       |
 * | codSubfamilia  | FVL_COD_SUBFAM      |
 * | delegacion     | FVL_DELEG        |
 */
export const ListFacturaLineasFiltersSchema = {
  ...PaginationSchema,
  codArticulo: z
    .string()
    .min(1)
    .optional()
    .describe('Código de artículo (FVL_CODARTIC).'),
  codFamilia: z
    .string()
    .min(1)
    .optional()
    .describe('Código de familia de artículo (FVL_COD_FAMILIA).'),
  codSubfamilia: z
    .string()
    .min(1)
    .optional()
    .describe('Código de subfamilia de artículo (FVL_COD_SUBFAM).'),
  delegacion: z
    .string()
    .min(1)
    .optional()
    .describe('Código de delegación (FVL_DELEG).'),
};

export type ListFacturaLineasFilters = {
  page?: number;
  items?: number;
  codArticulo?: string;
  codFamilia?: string;
  codSubfamilia?: string;
  delegacion?: string;
};

/**
 * Filtros tipados para `freematica_list_factura_iva`.
 *
 * Mapeo de filtros → campos FIQL de Freemática (prefijo `FVI_`):
 * | Filtro lógico  | Campo FIQL  |
 * |----------------|-------------|
 * | tipoIva        | FVI_TIPO_IVA  |
 */
export const ListFacturaIvaFiltersSchema = {
  ...PaginationSchema,
  tipoIva: z
    .string()
    .min(1)
    .optional()
    .describe('Tipo de IVA (FVI_TIPO_IVA). Ej.: "21", "10", "4".'),
};

export type ListFacturaIvaFilters = {
  page?: number;
  items?: number;
  tipoIva?: string;
};

/**
 * Filtros tipados para `freematica_list_factura_vencimientos`.
 *
 * Mapeo de filtros → campos FIQL de Freemática (prefijo `FVV_`):
 * | Filtro lógico             | Campo FIQL       |
 * |---------------------------|------------------|
 * | fechaVencimientoDesde     | FVV_FCH_VTO =ge= |
 * | fechaVencimientoHasta     | FVV_FCH_VTO =le= |
 * | modoPago                  | FVV_MODOPAGO      |
 */
export const ListFacturaVencimientosFiltersSchema = {
  ...PaginationSchema,
  fechaVencimientoDesde: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD',
    )
    .optional()
    .describe('Fecha inicio de vencimiento (FVV_FCH_VTO). Formato YYYY-MM-DD. Inclusive.'),
  fechaVencimientoHasta: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD',
    )
    .optional()
    .describe('Fecha fin de vencimiento (FVV_FCH_VTO). Formato YYYY-MM-DD. Inclusive.'),
  modoPago: z
    .string()
    .min(1)
    .optional()
    .describe('Código de modo de pago (FVV_MODOPAGO). Ej.: "TRF", "CHQ".'),
};

export type ListFacturaVencimientosFilters = {
  page?: number;
  items?: number;
  fechaVencimientoDesde?: string;
  fechaVencimientoHasta?: string;
  modoPago?: string;
};
