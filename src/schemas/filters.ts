import { z } from 'zod';
import { PaginationSchema } from './pagination.js';

/**
 * Rango de fechas opcional en formato ISO 8601 (YYYY-MM-DD o ISO datetime).
 *
 * Ambos extremos son opcionales: se puede usar sólo `fechaDesde`, sólo
 * `fechaHasta`, o ambos para un rango cerrado.
 *
 * @example
 * // Sólo desde:
 * { fechaDesde: '2024-01-01' }
 * // Rango cerrado:
 * { fechaDesde: '2024-01-01', fechaHasta: '2024-12-31' }
 */
export const DateRangeSchema = z.object({
  fechaDesde: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/,
      'Debe ser una fecha ISO 8601 (YYYY-MM-DD o ISO datetime)',
    )
    .optional()
    .describe('Fecha inicio del rango en formato ISO 8601 (YYYY-MM-DD). Inclusive.'),
  fechaHasta: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/,
      'Debe ser una fecha ISO 8601 (YYYY-MM-DD o ISO datetime)',
    )
    .optional()
    .describe('Fecha fin del rango en formato ISO 8601 (YYYY-MM-DD). Inclusive.'),
});

export type DateRange = z.infer<typeof DateRangeSchema>;

/**
 * Filtros de identidad para entidades de Freemática.
 *
 * Permite filtrar por cliente, grupo de clientes, proveedor o grupo de
 * proveedores. Todos los campos son opcionales y se combinan con AND cuando
 * se usan junto con `BaseFiltersSchema`.
 *
 * Los códigos deben ser los códigos naturales del API de Freemática (ej.
 * `COD_CLI`, `GRUPO_CLI`, `COD_PRO`, `GRUPO_PRO`).
 */
export const IdentityFiltersSchema = z.object({
  codCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del cliente (COD_CLI en Freemática).'),
  grupoCliente: z
    .string()
    .min(1)
    .optional()
    .describe('Código de grupo de clientes (GRUPO_CLI en Freemática).'),
  codProveedor: z
    .string()
    .min(1)
    .optional()
    .describe('Código natural del proveedor (COD_PRO en Freemática).'),
  grupoProveedor: z
    .string()
    .min(1)
    .optional()
    .describe('Código de grupo de proveedores (GRUPO_PRO en Freemática).'),
});

export type IdentityFilters = z.infer<typeof IdentityFiltersSchema>;

/**
 * Schema base para tools que necesitan paginación + rango de fechas + filtros
 * de identidad.
 *
 * Combina `PaginationSchema` + `DateRangeSchema` + `IdentityFiltersSchema`
 * para que las tools que necesiten filtros tengan un único punto de importación.
 *
 * @example
 * // Usar en el registro de una tool:
 * import { BaseFiltersSchema } from '../schemas/filters.js';
 * server.tool('mi_tool', desc, BaseFiltersSchema, ...);
 */
export const BaseFiltersSchema = z.object({
  ...PaginationSchema,
  ...DateRangeSchema.shape,
  ...IdentityFiltersSchema.shape,
});

export type BaseFilters = z.infer<typeof BaseFiltersSchema>;
