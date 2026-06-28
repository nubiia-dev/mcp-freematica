import { z } from 'zod';
import { PaginationSchema } from './pagination.js';

/**
 * Estado del documento de cartera de clientes.
 *
 * Se mapea al campo `CARCL_SITCAR` del API de Freemática:
 * - `pendiente` → `CARCL_SITCAR==1`
 * - `cancelado`  → `CARCL_SITCAR==2`
 * - `derivado`   → `CARCL_SITCAR==3`
 */
export const EstadoCarteraEnum = z.enum(['pendiente', 'cancelado', 'derivado']);

export type EstadoCartera = z.infer<typeof EstadoCarteraEnum>;

/** Mapa de enum lógico → valor numérico FIQL en `CARCL_SITCAR`. */
export const ESTADO_CARTERA_FIQL_MAP: Record<EstadoCartera, string> = {
  pendiente: '1',
  cancelado: '2',
  derivado: '3',
};

/**
 * Filtros tipados para `freematica_list_cartera_clientes`.
 *
 * Todos los campos son opcionales y se combinan con AND en la FIQL generada
 * (`rquery`). El campo de paginación hereda de `PaginationSchema`.
 *
 * Mapeo de filtros → campos FIQL de Freemática:
 * | Filtro lógico           | Campo FIQL      |
 * |-------------------------|-----------------|
 * | empresa                 | CARCL_EMP       |
 * | codCliente              | CARCL_CODAUX    |
 * | grupoCliente            | CARCL_GRUPAUX   |
 * | representante           | CARCL_CODREP    |
 * | formaPago               | CARCL_CODFPAG   |
 * | modoPago                | CARCL_CODMPAG   |
 * | fechaDocDesde           | CARCL_FECDOC =ge= |
 * | fechaDocHasta           | CARCL_FECDOC =le= |
 * | fechaVencimientoDesde   | CARCL_FECVCTO =ge= |
 * | fechaVencimientoHasta   | CARCL_FECVCTO =le= |
 * | estado                  | CARCL_SITCAR==N |
 * | soloImpagados           | CARCL_FECIMPAG!=null |
 * | referencia              | CARCL_REFCAR    |
 */
export const ListCarteraFiltersSchema = {
  ...PaginationSchema,
  empresa: z
    .string()
    .min(1)
    .optional()
    .describe('Código de empresa Freemática (CARCL_EMP). Ej.: "1".'),
  codCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del cliente (CARCL_CODAUX). Ej.: "0001000".'),
  grupoCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código de grupo de clientes (CARCL_GRUPAUX).'),
  representante: z
    .string()
    .min(1)
    .optional()
    .describe('Código del representante/comercial asignado (CARCL_CODREP).'),
  formaPago: z
    .string()
    .min(1)
    .optional()
    .describe('Código de forma de pago (CARCL_CODFPAG). Ej.: "REC".'),
  modoPago: z
    .string()
    .min(1)
    .optional()
    .describe('Código de modo de pago (CARCL_CODMPAG). Ej.: "TRF".'),
  fechaDocDesde: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD',
    )
    .optional()
    .describe('Fecha inicio del documento (CARCL_FECDOC). Formato YYYY-MM-DD. Inclusive.'),
  fechaDocHasta: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD',
    )
    .optional()
    .describe('Fecha fin del documento (CARCL_FECDOC). Formato YYYY-MM-DD. Inclusive.'),
  fechaVencimientoDesde: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD',
    )
    .optional()
    .describe('Fecha inicio de vencimiento (CARCL_FECVCTO). Formato YYYY-MM-DD. Inclusive.'),
  fechaVencimientoHasta: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD',
    )
    .optional()
    .describe('Fecha fin de vencimiento (CARCL_FECVCTO). Formato YYYY-MM-DD. Inclusive.'),
  estado: EstadoCarteraEnum.optional().describe(
    'Estado del documento de cartera: "pendiente" (CARCL_SITCAR=1), "cancelado" (CARCL_SITCAR=2), "derivado" (CARCL_SITCAR=3).',
  ),
  soloImpagados: z
    .boolean()
    .optional()
    .describe(
      'Si true, filtra sólo los documentos con impago (CARCL_FECIMPAG no nulo). Si false o no se pasa, devuelve todos.',
    ),
  referencia: z
    .string()
    .min(1)
    .optional()
    .describe('Referencia exacta del documento de cartera (CARCL_REFCAR).'),
};

export type ListCarteraFilters = {
  page?: number;
  items?: number;
  empresa?: string;
  codCliente?: string;
  grupoCliente?: string;
  representante?: string;
  formaPago?: string;
  modoPago?: string;
  fechaDocDesde?: string;
  fechaDocHasta?: string;
  fechaVencimientoDesde?: string;
  fechaVencimientoHasta?: string;
  estado?: EstadoCartera;
  soloImpagados?: boolean;
  referencia?: string;
};
