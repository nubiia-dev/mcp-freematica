/**
 * Item de un catálogo de datos maestros de Freemática.
 *
 * El shape exacto varía por catálogo (algunos exponen `{ idreg, codigo, nombre }`,
 * otros tienen campos específicos). Se mantiene como `Record<string, unknown>`
 * hasta que se vean respuestas reales y se decida si tiparlos por catálogo o
 * con un shape común mínimo.
 */
export type MasterDataItem = Record<string, unknown>;
