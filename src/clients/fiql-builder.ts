/**
 * FIQL (Feed Item Query Language) builder para el API de Freemática.
 *
 * FIQL es un lenguaje de consulta basado en texto para filtrar recursos REST,
 * definido en draft-nottingham-atompub-fiql (https://tools.ietf.org/id/draft-nottingham-atompub-fiql-00.txt).
 *
 * Operadores soportados:
 *   - `==`   igual (eq)
 *   - `!=`   distinto (ne)
 *   - `=gt=` mayor que
 *   - `=lt=` menor que
 *   - `=ge=` mayor o igual
 *   - `=le=` menor o igual
 *   - `=in=` in list  (valor: array → `=in=(v1,v2,v3)`)
 *   - `;`    AND (combina expresiones)
 *   - `,`    OR  (combina expresiones)
 *
 * Caracteres que requieren escape en valores FIQL:
 *   `;` `,` `(` `)` `"` `'` espacios → percent-encoding (%3B, %2C, %28, %29, %22, %27, %20)
 *   `=` → %3D  (evita ambigüedad con operadores FIQL del tipo `=op=`)
 *   `!` → %21  (evita ambigüedad con el operador `!=`)
 *   El `==` en un valor se convierte en `%3D%3D` automáticamente.
 */

/** Operadores escalares soportados. */
export type FiqlOp = 'eq' | 'ne' | 'gt' | 'lt' | 'ge' | 'le' | 'in';

/** Valor escalar (primitivo o con operador explícito). */
export type FiqlValue =
  | string
  | number
  | boolean
  | { op: FiqlOp; value: string | number | string[] | number[] };

/** Un grupo plano de key → FiqlValue (se tratan como AND entre sí). */
export type FiqlGroup = Record<string, FiqlValue | undefined>;

/**
 * Entrada del builder. Puede ser:
 * - Un grupo plano `{ campo: valor, ... }` → se combinan con AND (`;`)
 * - Un objeto con `and` o `or` que contiene arrays de grupos → composición explícita
 */
export type FiqlFilters =
  | FiqlGroup
  | { and?: FiqlGroup[]; or?: FiqlGroup[] };

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const OP_MAP: Record<FiqlOp, string> = {
  eq: '==',
  ne: '!=',
  gt: '=gt=',
  lt: '=lt=',
  ge: '=ge=',
  le: '=le=',
  in: '=in=',
};

/**
 * Caracteres reservados en FIQL que deben ser percent-encoded dentro de valores.
 *
 * Según la gramática FIQL, los caracteres `;` `,` `(` `)` son delimitadores
 * de la expresión. Las comillas `"` y `'` se usan en comparadores. El espacio
 * también debe codificarse. Los caracteres `=` y `!` forman los operadores
 * FIQL (`==`, `!=`, `=gt=`, etc.) y DEBEN escaparse en valores para evitar
 * ambigüedad semántica en el parser del servidor.
 *
 * Ejemplos de ambigüedad sin escape:
 *   `CAMPO==x=gt=0`  → parser puede interpretar `x=gt=0` como sub-operador
 *   `CAMPO==123==EVIL` → parser puede ver un doble operador
 */
const FIQL_RESERVED_RE = /[;,()"' =!]/g;

const RESERVED_ENCODE_MAP: Record<string, string> = {
  ';': '%3B',
  ',': '%2C',
  '(': '%28',
  ')': '%29',
  '"': '%22',
  "'": '%27',
  ' ': '%20',
  '=': '%3D',
  '!': '%21',
};

/**
 * Escapa caracteres reservados FIQL en un valor escalar.
 *
 * Los únicos caracteres que se encodean son los que tienen significado
 * estructural en FIQL. El resto se deja tal cual para evitar doble-encoding
 * con los valores que ya contienen percent-encoding legítimo.
 *
 * @param raw - Valor a escapar (string).
 * @returns Valor con caracteres reservados percent-encoded.
 */
function escapeFiqlValue(raw: string): string {
  return raw.replace(FIQL_RESERVED_RE, (ch) => RESERVED_ENCODE_MAP[ch] ?? ch);
}

/**
 * Convierte un valor primitivo a string FIQL escapado.
 *
 * @param val - Primitivo (`string | number | boolean`).
 * @returns Representación FIQL del valor.
 */
function primitiveToFiql(val: string | number | boolean): string {
  return escapeFiqlValue(String(val));
}

/**
 * Genera una expresión FIQL simple para `campo operador valor`.
 *
 * @param key - Nombre del campo.
 * @param fiqlValue - Valor o descriptor con operador.
 * @returns Expresión FIQL (ej. `COD_CLI==123`) o `null` si el valor es
 *          `undefined` o no aplica.
 */
function buildExpression(key: string, fiqlValue: FiqlValue): string {
  if (typeof fiqlValue === 'object' && fiqlValue !== null && 'op' in fiqlValue) {
    const { op, value } = fiqlValue;
    const fiqlOp = OP_MAP[op];

    if (op === 'in') {
      const arr = Array.isArray(value) ? value : [value];
      if (arr.length === 0) return '';
      const encoded = arr.map((v) => escapeFiqlValue(String(v))).join(',');
      return `${key}${fiqlOp}(${encoded})`;
    }

    const scalar = Array.isArray(value) ? value[0] : value;
    return `${key}${fiqlOp}${primitiveToFiql(scalar as string | number | boolean)}`;
  }

  // Primitivo → operador por defecto es `==`
  return `${key}==${primitiveToFiql(fiqlValue as string | number | boolean)}`;
}

/**
 * Convierte un grupo de filtros planos a una lista de expresiones FIQL
 * (omite las claves con valor `undefined`).
 *
 * @param group - Mapa de campo → valor.
 * @returns Array de expresiones FIQL individuales.
 */
function groupToExpressions(group: FiqlGroup): string[] {
  const expressions: string[] = [];
  for (const [key, value] of Object.entries(group)) {
    if (value === undefined) continue;
    const expr = buildExpression(key, value);
    if (expr) expressions.push(expr);
  }
  return expressions;
}

/**
 * Detecta si el objeto es una composición `{ and?, or? }` o un grupo plano.
 *
 * La detección es estricta: para ser considerada composición, las claves
 * `and`/`or` DEBEN tener un valor `Array` (o `undefined`). Si `and`/`or`
 * contienen un valor no-array (ej. `string`, `number`) se tratan como
 * nombres de campo ordinarios del grupo plano, evitando el bug de type
 * confusion donde `{ and: 'string' }` iteraría char a char el string.
 *
 * ### Aclaración semántica sobre claves `and` / `or`
 *
 * Si tu modelo tiene un campo real llamado `and` o `or` con un valor escalar
 * (string/number/boolean), pásalo como grupo plano: `{ and: 'valor' }` se
 * trata como `AND==valor`. No hay ambigüedad siempre que el valor no sea un
 * Array de FiqlGroup.
 *
 * @param filters - Input del builder.
 * @returns `true` si es composición explícita con `and`/`or` en formato array.
 */
function isComposition(
  filters: FiqlFilters,
): filters is { and?: FiqlGroup[]; or?: FiqlGroup[] } {
  // Si `and` está presente pero no es array (ni undefined) → grupo plano
  if ('and' in filters && (filters as Record<string, unknown>)['and'] !== undefined && !Array.isArray((filters as Record<string, unknown>)['and'])) {
    return false;
  }
  // Si `or` está presente pero no es array (ni undefined) → grupo plano
  if ('or' in filters && (filters as Record<string, unknown>)['or'] !== undefined && !Array.isArray((filters as Record<string, unknown>)['or'])) {
    return false;
  }
  // Es composición si al menos una clave es un array
  return (
    ('and' in filters && Array.isArray((filters as Record<string, unknown>)['and'])) ||
    ('or' in filters && Array.isArray((filters as Record<string, unknown>)['or']))
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Construye una cadena FIQL a partir de un objeto de filtros tipado.
 *
 * ### Formato de entrada
 *
 * **Grupo plano** (se unen con AND):
 * ```ts
 * buildFiql({ COD_CLI: '123', ESTADO: 'activo' })
 * // → 'COD_CLI==123;ESTADO==activo'
 * ```
 *
 * **Operador explícito**:
 * ```ts
 * buildFiql({ IMPORTE: { op: 'gt', value: 1000 } })
 * // → 'IMPORTE=gt=1000'
 * ```
 *
 * **Operador IN con array**:
 * ```ts
 * buildFiql({ COD_CLI: { op: 'in', value: ['A1', 'A2'] } })
 * // → 'COD_CLI=in=(A1,A2)'
 * ```
 *
 * **Composición AND/OR**:
 * ```ts
 * buildFiql({
 *   and: [{ EMPRESA: '1' }, { DELEGACION: 'MAD' }],
 * })
 * // → 'EMPRESA==1;DELEGACION==MAD'
 *
 * buildFiql({
 *   or: [{ ESTADO: 'activo' }, { ESTADO: 'pendiente' }],
 * })
 * // → 'ESTADO==activo,ESTADO==pendiente'
 * ```
 *
 * ### Reglas
 * - Los valores `undefined` se omiten silenciosamente.
 * - Si todos los filtros son `undefined` o el objeto está vacío → retorna `""`.
 * - Los caracteres reservados FIQL (`;`, `,`, `(`, `)`, `"`, `'`, espacio, `=`, `!`)
 *   en los valores se percent-encodean automáticamente.
 * - Las claves `and`/`or` sólo activan composición si su valor es un `Array`.
 *   Si el valor es un string, number u otro tipo primitivo, se tratan como
 *   nombres de campo ordinarios (ej. `{ and: 'val' }` → `AND==val`).
 *
 * @param filters - Filtros en formato FiqlFilters.
 * @returns Cadena FIQL. Vacía si no hay ningún filtro activo.
 */
export function buildFiql(filters: FiqlFilters): string {
  if (isComposition(filters)) {
    const parts: string[] = [];

    if (filters.and && filters.and.length > 0) {
      const andExprs: string[] = [];
      for (const group of filters.and) {
        andExprs.push(...groupToExpressions(group));
      }
      if (andExprs.length > 0) {
        parts.push(andExprs.join(';'));
      }
    }

    if (filters.or && filters.or.length > 0) {
      const orExprs: string[] = [];
      for (const group of filters.or) {
        const groupExprs = groupToExpressions(group);
        if (groupExprs.length > 0) {
          orExprs.push(...groupExprs);
        }
      }
      if (orExprs.length > 0) {
        parts.push(orExprs.join(','));
      }
    }

    return parts.join(';');
  }

  // Grupo plano → AND
  const expressions = groupToExpressions(filters);
  return expressions.join(';');
}

/**
 * Añade el parámetro `rquery` a una URL si la cadena FIQL es no vacía.
 *
 * Si `fiql` es una cadena vacía, no se hace nada (no se añade el parámetro).
 *
 * @param url - Objeto URL a mutar.
 * @param fiql - Cadena FIQL generada con `buildFiql()`.
 * @example
 * const url = new URL('https://api.example.com/clientes');
 * appendRquery(url, buildFiql({ COD_CLI: '123' }));
 * // url.href → 'https://api.example.com/clientes?rquery=COD_CLI%3D%3D123'
 */
export function appendRquery(url: URL, fiql: string): void {
  if (fiql.length === 0) return;
  url.searchParams.set('rquery', fiql);
}
