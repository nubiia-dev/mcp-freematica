/**
 * Wrapper universal que devuelve el API REST de Freemática en TODAS las
 * respuestas. El `BaseClient` desempaqueta automáticamente este envelope
 * y propaga `data` al método caller.
 *
 * `errorCode` viene como string (p.ej. "200", "404", "500"). Si es distinto
 * de "200" el `BaseClient` lanza `FreematicaError` con un código mapeado.
 */
export interface FreematicaEnvelope<T> {
  errorCode: string;
  errorMessage: string;
  data: T;
}

/**
 * Shape del campo `data` en endpoints de listado.
 *
 * `total` viene como string del API (típicamente "2007"). El método cliente
 * lo convierte a `number` antes de exponerlo.
 *
 * `rowHeight` es metadata interno del API (parece UI-related); el cliente
 * lo descarta.
 */
export interface FreematicaListData<T> {
  total: string;
  items: T[];
  rowHeight: number;
}
