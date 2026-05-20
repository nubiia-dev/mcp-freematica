import { z } from 'zod';

/**
 * Schema parts to paginate Freemática listing tools.
 *
 * IMPORTANT: We block `page=0` because the Freemática API treats it as
 * "return the FULL dataset" (we measured 2.5 MB responses on the clientes
 * endpoint). Pages are 1-indexed.
 *
 * `items` is capped at 50 to keep LLM context manageable.
 */
export const PaginationSchema = {
  page: z
    .number()
    .int()
    .min(1)
    .max(999)
    .default(1)
    .describe(
      'Página a recuperar (1-indexed). Default: 1. AVISO: el API trata page=0 como "devuelve TODO el dataset"; este parámetro lo bloquea al mínimo 1.',
    ),
  items: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe('Items por página. Default 20, máximo 50.'),
};
