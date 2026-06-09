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
 * | empresa                    | FVC_EMP          |
 * | codCliente                 | FVC_CODAUX       |
 * | representante              | FVC_CODREP       |
 * | fechaFacturaDesde          | FVC_FECFAC =ge=  |
 * | fechaFacturaHasta          | FVC_FECFAC =le=  |
 * | serie                      | FVC_SERFAC       |
 * | numFactura                 | FVC_NUMFAC       |
 * | formaPago                  | FVC_CODFPAG      |
 * | traspasadoContabilidad     | FVC_TRSCONT      |
 * | delegacion                 | FVC_DELEG        |
 */
export const ListFacturasCabeceraFiltersSchema = {
  ...PaginationSchema,
  empresa: z
    .string()
    .min(1)
    .optional()
    .describe('Código de empresa Freemática (FVC_EMP). Ej.: "1".'),
  codCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del cliente facturado (FVC_CODAUX).'),
  representante: z
    .string()
    .min(1)
    .optional()
    .describe('Código del representante/comercial (FVC_CODREP).'),
  fechaFacturaDesde: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD',
    )
    .optional()
    .describe('Fecha inicio de la factura (FVC_FECFAC). Formato YYYY-MM-DD. Inclusive.'),
  fechaFacturaHasta: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD',
    )
    .optional()
    .describe('Fecha fin de la factura (FVC_FECFAC). Formato YYYY-MM-DD. Inclusive.'),
  serie: z
    .string()
    .min(1)
    .optional()
    .describe('Serie de facturación (FVC_SERFAC). Ej.: "A", "B".'),
  numFactura: z
    .string()
    .min(1)
    .optional()
    .describe('Número de factura exacto (FVC_NUMFAC).'),
  formaPago: z
    .string()
    .min(1)
    .optional()
    .describe('Código de forma de pago (FVC_CODFPAG). Ej.: "REC", "TRF".'),
  traspasadoContabilidad: z
    .boolean()
    .optional()
    .describe(
      'Si true, filtra facturas ya traspasadas a contabilidad (FVC_TRSCONT). Si false, las no traspasadas.',
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
 * | codArticulo    | FVL_CODART       |
 * | codFamilia     | FVL_CODFAM       |
 * | codSubfamilia  | FVL_CODSFAM      |
 * | delegacion     | FVL_DELEG        |
 */
export const ListFacturaLineasFiltersSchema = {
  ...PaginationSchema,
  codArticulo: z
    .string()
    .min(1)
    .optional()
    .describe('Código de artículo (FVL_CODART).'),
  codFamilia: z
    .string()
    .min(1)
    .optional()
    .describe('Código de familia de artículo (FVL_CODFAM).'),
  codSubfamilia: z
    .string()
    .min(1)
    .optional()
    .describe('Código de subfamilia de artículo (FVL_CODSFAM).'),
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
 * | tipoIva        | FVI_TIPIVA  |
 */
export const ListFacturaIvaFiltersSchema = {
  ...PaginationSchema,
  tipoIva: z
    .string()
    .min(1)
    .optional()
    .describe('Tipo de IVA (FVI_TIPIVA). Ej.: "21", "10", "4".'),
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
 * | fechaVencimientoDesde     | FVV_FECVCTO =ge= |
 * | fechaVencimientoHasta     | FVV_FECVCTO =le= |
 * | modoPago                  | FVV_CODMPAG      |
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
    .describe('Fecha inicio de vencimiento (FVV_FECVCTO). Formato YYYY-MM-DD. Inclusive.'),
  fechaVencimientoHasta: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD',
    )
    .optional()
    .describe('Fecha fin de vencimiento (FVV_FECVCTO). Formato YYYY-MM-DD. Inclusive.'),
  modoPago: z
    .string()
    .min(1)
    .optional()
    .describe('Código de modo de pago (FVV_CODMPAG). Ej.: "TRF", "CHQ".'),
};

export type ListFacturaVencimientosFilters = {
  page?: number;
  items?: number;
  fechaVencimientoDesde?: string;
  fechaVencimientoHasta?: string;
  modoPago?: string;
};
