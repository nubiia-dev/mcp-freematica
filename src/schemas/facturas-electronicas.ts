import { z } from 'zod';
import { PaginationSchema } from './pagination.js';

/**
 * Filtros para `freematica_list_facturas_electronicas`.
 *
 * Todos los filtros son opcionales. Los filtros nativos del endpoint GET /pven/v1/facturas
 * se envían como query params directos (no FIQL), según la especificación OpenAPI de Freemática.
 *
 * Mapeo de filtros → query params nativos de Freemática:
 * | Filtro lógico           | Query param     | Notas                              |
 * |-------------------------|-----------------|-------------------------------------|
 * | empresa                 | empresa         | Código de empresa                   |
 * | codCliente              | cliente         | Código natural del cliente          |
 * | fechaDesde              | fechaIni        | ISO 8601 YYYY-MM-DD                 |
 * | fechaHasta              | fechaFin        | ISO 8601 YYYY-MM-DD                 |
 * | estado                  | estado          | String (p.ej. "ENVIADA", "ACEPTADA")|
 * | leido                   | leido           | Boolean nativo                      |
 * | page                    | page            | Paginación 1-indexed                |
 * | items                   | items           | Items por página                    |
 * | order                   | order           | Orden de resultados                 |
 */
export const ListFacturasElectronicasFiltersSchema = {
  ...PaginationSchema,
  empresa: z
    .string()
    .min(1)
    .optional()
    .describe('Código de empresa Freemática (query param "empresa"). Ej.: "1".'),
  codCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del cliente (query param "cliente" en Freemática).'),
  fechaDesde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD')
    .optional()
    .describe('Fecha inicio de la factura electrónica (query param "fechaIni"). Formato YYYY-MM-DD. Inclusive.'),
  fechaHasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe ser una fecha en formato ISO 8601 YYYY-MM-DD')
    .optional()
    .describe('Fecha fin de la factura electrónica (query param "fechaFin"). Formato YYYY-MM-DD. Inclusive.'),
  estado: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Estado de la factura electrónica (query param "estado"). Valores posibles según configuración Freemática ' +
      '(p.ej. "ENVIADA", "ACEPTADA", "RECHAZADA"). Consultar con el administrador los valores disponibles.',
    ),
  leido: z
    .boolean()
    .optional()
    .describe('Filtra por leído/no leído (query param "leido"). true = leídas, false = no leídas.'),
  order: z
    .string()
    .optional()
    .describe('Orden de resultados (query param "order"). Ej.: "FACED_FCHFAC desc".'),
};

export type ListFacturasElectronicasFilters = {
  page?: number;
  items?: number;
  empresa?: string;
  codCliente?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  leido?: boolean;
  order?: string;
};

/**
 * Filtros para `freematica_list_facturas_documentos`.
 *
 * Endpoint: GET /pven/v1/facturas/download
 *
 * | Filtro lógico    | Query param    | Notas                                           |
 * |------------------|----------------|-------------------------------------------------|
 * | documents        | documents      | Identificadores de documentos a descargar       |
 * | documentType     | documentType   | Tipo de documento: "PDF", "XML", "ERROR"        |
 */
export const ListFacturasDocumentosFiltersSchema = {
  documents: z
    .string()
    .optional()
    .describe('Identificadores de documentos separados por comas (query param "documents").'),
  documentType: z
    .enum(['PDF', 'XML', 'ERROR'])
    .optional()
    .describe('Tipo de documento a descargar: "PDF" | "XML" | "ERROR" (query param "documentType").'),
};

export type ListFacturasDocumentosFilters = {
  documents?: string;
  documentType?: 'PDF' | 'XML' | 'ERROR';
};
