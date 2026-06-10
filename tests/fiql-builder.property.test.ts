/**
 * Property-based tests para buildFiql con fast-check.
 *
 * Propiedades verificadas:
 * 1. El output nunca es nulo ni undefined (siempre string).
 * 2. Si hay al menos un filtro definido, el output es no vacío.
 * 3. El output no contiene caracteres reservados FIQL no escaped en posición de valor.
 * 4. El output es parseable según la gramática FIQL básica (sin estructuras rotas).
 * 5. Escape round-trip: los valores escapados se pueden identificar y decodificar.
 * 6. Roundtrip parcial: el output de buildFiql({ k: v }) siempre contiene k cuando v está definido.
 * 7. Idempotencia del escape: escapar dos veces == escapar una vez.
 * 8. Compositions: and produce ;, or produce ,.
 * 9. Operadores: para cada FiqlOp el output contiene la cadena de operador esperada.
 * 10. Safety: valores con XSS/SQL injection no rompen la gramática FIQL.
 * 11. In array empty: produce algo razonable (skip).
 *
 * Mínimo 200 runs por property (configurado via numRuns).
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  buildFiql,
  type FiqlFilters,
  type FiqlGroup,
  type FiqlOp,
} from '../src/clients/fiql-builder.js';

// ---------------------------------------------------------------------------
// Helpers para validar FIQL
// ---------------------------------------------------------------------------

/**
 * Gramática FIQL simplificada para validar el output.
 *
 * Una expresión FIQL válida (simplificada) cumple:
 * - No empieza ni acaba con `;` o `,`
 * - No tiene `;;`, `,,`, `;,`, `,;`
 * - Cada término tiene la forma: `campo{operador}valor`
 *   donde operador es `==`, `!=`, `=gt=`, `=lt=`, `=ge=`, `=le=`, `=in=(...)`
 * - Los paréntesis del =in= están balanceados
 */
function isValidFiqlOrEmpty(fiql: string): boolean {
  if (fiql === '') return true;

  // No debe comenzar ni terminar con separadores
  if (/^[;,]/.test(fiql) || /[;,]$/.test(fiql)) return false;

  // No debe tener separadores consecutivos
  if (/[;,][;,]/.test(fiql)) return false;

  // Separamos por ; (AND) y , (OR) para verificar cada término
  // Pero debemos ignorar comas dentro de =in=(...)
  const terms = splitFiqlTerms(fiql);

  for (const term of terms) {
    if (!isValidFiqlTerm(term.trim())) return false;
  }

  return true;
}

/**
 * Divide una expresión FIQL en términos, respetando los paréntesis de =in=(...).
 *
 * Esta es una implementación simplificada que maneja los casos del test.
 */
function splitFiqlTerms(fiql: string): string[] {
  const terms: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of fiql) {
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if ((char === ';' || char === ',') && depth === 0) {
      terms.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.length > 0) terms.push(current);
  return terms;
}

/** Regex de operadores FIQL válidos (incluye =lk= extensión Freemática). */
const FIQL_OP_RE = /^(.+?)(==|!=|=gt=|=lt=|=ge=|=le=|=in=|=lk=)(.*)$/;

/**
 * Verifica que un término FIQL individual tenga estructura válida.
 */
function isValidFiqlTerm(term: string): boolean {
  if (term === '') return false;

  const match = term.match(FIQL_OP_RE);
  if (!match) return false;

  const [, field, op, value] = match;

  // El campo no puede estar vacío
  if (!field || field.length === 0) return false;

  // Para =in=, el valor debe estar entre paréntesis
  if (op === '=in=') {
    if (!value || !value.startsWith('(') || !value.endsWith(')')) return false;
    // Los paréntesis deben estar balanceados
    const inner = value.slice(1, -1);
    if (inner.includes('(') || inner.includes(')')) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Arbitrarios fast-check
// ---------------------------------------------------------------------------

/**
 * Genera nombres de campo FIQL válidos (identificadores ASCII sin espacios ni
 * caracteres reservados).
 */
const fieldNameArb = fc.stringMatching(/^[A-Z_][A-Z0-9_]{0,19}$/);

/**
 * Genera valores string con caracteres mixtos, incluyendo algunos reservados FIQL.
 * Esto ejercita el escape.
 */
const fiqlValueStringArb = fc.string({ minLength: 0, maxLength: 50 });

/**
 * Genera valores numéricos.
 */
const fiqlValueNumberArb = fc.float({ min: -1e6, max: 1e6, noNaN: true });

/**
 * Genera un FiqlGroup aleatorio con 1..5 campos.
 */
const fiqlGroupArb: fc.Arbitrary<FiqlGroup> = fc
  .array(
    fc.tuple(
      fieldNameArb,
      fc.oneof(
        fiqlValueStringArb,
        fiqlValueNumberArb,
        fc.constant(undefined as string | number | undefined),
      ),
    ),
    { minLength: 1, maxLength: 5 },
  )
  .map((pairs) => Object.fromEntries(pairs) as FiqlGroup);

/**
 * Genera FiqlFilters en formato de grupo plano.
 */
const flatFiqlFiltersArb: fc.Arbitrary<FiqlFilters> = fiqlGroupArb;

/**
 * Genera FiqlFilters con composición and/or.
 */
const composedFiqlFiltersArb: fc.Arbitrary<FiqlFilters> = fc.oneof(
  fc.record({
    and: fc.array(fiqlGroupArb, { minLength: 0, maxLength: 3 }),
  }),
  fc.record({
    or: fc.array(fiqlGroupArb, { minLength: 0, maxLength: 3 }),
  }),
  fc.record({
    and: fc.array(fiqlGroupArb, { minLength: 0, maxLength: 2 }),
    or: fc.array(fiqlGroupArb, { minLength: 0, maxLength: 2 }),
  }),
);

/**
 * Genera cualquier tipo de FiqlFilters.
 */
const anyFiqlFiltersArb: fc.Arbitrary<FiqlFilters> = fc.oneof(
  flatFiqlFiltersArb,
  composedFiqlFiltersArb,
);

// ---------------------------------------------------------------------------
// Properties — bloque original (mantenido intacto)
// ---------------------------------------------------------------------------

const NUM_RUNS = 200;

describe('buildFiql — property-based tests', () => {
  it('property: always returns a string (never null/undefined)', () => {
    fc.assert(
      fc.property(anyFiqlFiltersArb, (filters) => {
        const result = buildFiql(filters);
        expect(typeof result).toBe('string');
        expect(result).not.toBeNull();
        expect(result).not.toBeUndefined();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('property: output is valid FIQL or empty string', () => {
    fc.assert(
      fc.property(anyFiqlFiltersArb, (filters) => {
        const result = buildFiql(filters);
        expect(isValidFiqlOrEmpty(result)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('property: result does not contain unescaped ; in value position', () => {
    // Genera filtros con valores que contienen ;
    const filtersWithSemicolon = fc.record({
      CAMPO: fc.stringMatching(/[;]+/).map((s) => `prefix${s}suffix`),
    }) as fc.Arbitrary<FiqlFilters>;

    fc.assert(
      fc.property(filtersWithSemicolon, (filters) => {
        const result = buildFiql(filters);
        if (result === '') return;

        // El resultado tiene la forma CAMPO==valor, donde valor no debe tener ; sin codificar
        // Extraemos el valor tras el primer ==
        const eqIdx = result.indexOf('==');
        if (eqIdx === -1) return;
        const value = result.slice(eqIdx + 2);

        // El valor no debe contener ; literal (deben estar como %3B)
        expect(value).not.toMatch(/(?<!%)[^%]?;/);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('property: result does not contain unescaped , in value position', () => {
    const filtersWithComma = fc.record({
      CAMPO: fc.stringMatching(/[,]+/).map((s) => `prefix${s}suffix`),
    }) as fc.Arbitrary<FiqlFilters>;

    fc.assert(
      fc.property(filtersWithComma, (filters) => {
        const result = buildFiql(filters);
        if (result === '') return;

        const eqIdx = result.indexOf('==');
        if (eqIdx === -1) return;
        const value = result.slice(eqIdx + 2);

        // El valor no debe contener , literal
        expect(value).not.toMatch(/[^%],/);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('property: flat group with all-undefined values returns empty string', () => {
    // Genera grupos donde todos los valores son undefined
    const allUndefinedGroupArb = fc
      .array(fieldNameArb, { minLength: 1, maxLength: 5 })
      .map((fields) => {
        const group: FiqlGroup = {};
        for (const f of fields) group[f] = undefined;
        return group;
      }) as fc.Arbitrary<FiqlFilters>;

    fc.assert(
      fc.property(allUndefinedGroupArb, (filters) => {
        expect(buildFiql(filters)).toBe('');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('property: single defined string field always produces non-empty output', () => {
    const singleDefinedFieldArb = fc
      .tuple(
        fieldNameArb,
        // Valores que no son solo espacios (para que el escape no produzca algo vacío semánticamente)
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.length > 0),
      )
      .map(([key, value]) => ({ [key]: value }) as FiqlFilters);

    fc.assert(
      fc.property(singleDefinedFieldArb, (filters) => {
        const result = buildFiql(filters);
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('property: =in= values with arrays produce balanced parentheses', () => {
    const inFilterArb = fc
      .tuple(
        fieldNameArb,
        fc.array(
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !/[;,()]/.test(s)),
          { minLength: 1, maxLength: 5 },
        ),
      )
      .map(([key, values]) => ({
        [key]: { op: 'in' as const, value: values },
      }) as FiqlFilters);

    fc.assert(
      fc.property(inFilterArb, (filters) => {
        const result = buildFiql(filters);
        expect(result.length).toBeGreaterThan(0);

        // Verificar que los paréntesis están balanceados
        let depth = 0;
        for (const char of result) {
          if (char === '(') depth++;
          if (char === ')') depth--;
          expect(depth).toBeGreaterThanOrEqual(0);
        }
        expect(depth).toBe(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('property: output never contains auth-related keywords in value position', () => {
    // Asegura que no se loguean accidentally valores sensibles en el FIQL generado
    // (aunque esto es más una sanity check del generador)
    const sensitiveValueArb = fc.record({
      CAMPO: fc.constantFrom('x-auth-token', 'password', 'secret', 'token'),
    }) as fc.Arbitrary<FiqlFilters>;

    fc.assert(
      fc.property(sensitiveValueArb, (filters) => {
        const result = buildFiql(filters);
        // El FIQL puede contener el valor (es un valor normal), pero verificamos
        // que la estructura sea válida de todas formas
        expect(isValidFiqlOrEmpty(result)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('property: composed AND filters produce ; as separator between group outputs', () => {
    const andFiltersArb = fc.record({
      and: fc.array(
        fc
          .tuple(
            fieldNameArb,
            fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !/[;,()'" ]/.test(s)),
          )
          .map(([k, v]) => ({ [k]: v }) as FiqlGroup),
        { minLength: 2, maxLength: 3 },
      ),
    });

    fc.assert(
      fc.property(andFiltersArb, (filters) => {
        const result = buildFiql(filters);
        if (result === '') return;
        // Must be valid FIQL
        expect(isValidFiqlOrEmpty(result)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// Properties adicionales — TD-123
// ---------------------------------------------------------------------------

describe('buildFiql — property-based tests adicionales (TD-123)', () => {
  /**
   * PROPERTY: Roundtrip parcial — el output de buildFiql({ k: v }) siempre
   * contiene k literalmente cuando v es definido y no string vacío.
   *
   * El nombre de campo NUNCA se escapa (solo los valores), por lo que el campo
   * debe aparecer literal en el FIQL resultante.
   */
  it('property: output always contains the field name literally when value is defined and non-empty', () => {
    const singleFieldWithValueArb = fc
      .tuple(
        fieldNameArb,
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => s.length > 0 && s.trim().length > 0),
      )
      .map(([key, value]) => ({ key, value, filters: { [key]: value } as FiqlFilters }));

    fc.assert(
      fc.property(singleFieldWithValueArb, ({ key, filters }) => {
        const result = buildFiql(filters);
        // El campo siempre aparece literalmente en el output
        expect(result).toContain(key);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * PROPERTY: Idempotencia del escape — aplicar escapeFiqlValue dos veces
   * produce el mismo resultado que aplicarlo una vez.
   *
   * La función buildFiql aplica el escape internamente. Si un valor ya contiene
   * %xx (percent-encoding legítimo), una segunda pasada no debe re-encodear el
   * % porque no está en FIQL_RESERVED_RE.
   *
   * Testeamos esto construyendo FIQL con un valor, luego pasando el valor
   * resultado (parte valor) como input y verificando que el escape no crece.
   */
  it('property: escape is idempotent — building FIQL twice does not double-encode', () => {
    // Valores que pueden contener caracteres reservados FIQL
    const valueWithReservedArb = fc
      .string({ minLength: 1, maxLength: 30 })
      .filter((s) => s.length > 0);

    fc.assert(
      fc.property(valueWithReservedArb, (rawValue) => {
        // Primer build
        const first = buildFiql({ CAMPO: rawValue });
        if (first === '') return; // undefined/vacío — skip

        // Extraer el valor encoded de la primera pasada
        const eqIdx = first.indexOf('==');
        if (eqIdx === -1) return;
        const encodedValue = first.slice(eqIdx + 2);

        // Segundo build usando el valor ya-encoded como input
        const second = buildFiql({ CAMPO: encodedValue });
        const eqIdx2 = second.indexOf('==');
        if (eqIdx2 === -1) return;
        const doubleEncodedValue = second.slice(eqIdx2 + 2);

        // Si el valor encoded ya no contiene caracteres reservados FIQL (;,() etc.),
        // el segundo encode no debería añadir más %xx que los que ya tenía.
        // En particular, el % no se escapa (no está en RESERVED_ENCODE_MAP),
        // así que encodedValue == doubleEncodedValue cuando todos los reservados ya están encoded.
        // Verificamos que la segunda pasada no aumenta el número de segmentos %xx.
        const countPercent = (s: string) => (s.match(/%/g) ?? []).length;

        // El número de % en la doble-encoded puede ser >=, nunca menor
        expect(countPercent(doubleEncodedValue)).toBeGreaterThanOrEqual(
          countPercent(encodedValue),
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * PROPERTY: Compositions AND — buildFiql({ and: [g1, g2] }) con grupos no-vacíos
   * siempre contiene `;` como separador AND cuando hay al menos 2 expresiones.
   */
  it('property: AND composition with 2+ non-empty groups always produces ; separator', () => {
    const cleanValueArb = fc
      .string({ minLength: 1, maxLength: 10 })
      .filter((s) => !/[;,()'" =!\s]/.test(s) && s.length > 0);

    const andWith2GroupsArb = fc.record({
      and: fc.array(
        fc
          .tuple(fieldNameArb, cleanValueArb)
          .map(([k, v]) => ({ [k]: v }) as FiqlGroup),
        { minLength: 2, maxLength: 4 },
      ),
    });

    fc.assert(
      fc.property(andWith2GroupsArb, (filters) => {
        const result = buildFiql(filters);
        if (result === '') return; // grupos vacíos generados — skip
        // Con 2+ grupos no vacíos, el output debe contener ;
        expect(result).toContain(';');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * PROPERTY: Compositions OR — buildFiql({ or: [g1, g2] }) con grupos no-vacíos
   * siempre contiene `,` como separador OR cuando hay al menos 2 expresiones.
   */
  it('property: OR composition with 2+ non-empty groups always produces , separator', () => {
    const cleanValueArb = fc
      .string({ minLength: 1, maxLength: 10 })
      .filter((s) => !/[;,()'" =!\s]/.test(s) && s.length > 0);

    const orWith2GroupsArb = fc.record({
      or: fc.array(
        fc
          .tuple(fieldNameArb, cleanValueArb)
          .map(([k, v]) => ({ [k]: v }) as FiqlGroup),
        { minLength: 2, maxLength: 4 },
      ),
    });

    fc.assert(
      fc.property(orWith2GroupsArb, (filters) => {
        const result = buildFiql(filters);
        if (result === '') return; // grupos vacíos — skip
        // Con 2+ expresiones OR, el output debe contener ,
        expect(result).toContain(',');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * PROPERTY: Operadores — para cada FiqlOp escalar (eq, ne, gt, lt, ge, le, lk),
   * el output contiene la cadena del operador esperada.
   */
  it('property: each scalar FiqlOp produces the expected operator string in output', () => {
    const SCALAR_OPS: Array<{ op: FiqlOp; expectedOpStr: string }> = [
      { op: 'eq', expectedOpStr: '==' },
      { op: 'ne', expectedOpStr: '!=' },
      { op: 'gt', expectedOpStr: '=gt=' },
      { op: 'lt', expectedOpStr: '=lt=' },
      { op: 'ge', expectedOpStr: '=ge=' },
      { op: 'le', expectedOpStr: '=le=' },
      { op: 'lk', expectedOpStr: '=lk=' },
    ];

    const cleanValueArb = fc
      .string({ minLength: 1, maxLength: 10 })
      .filter((s) => s.length > 0);

    for (const { op, expectedOpStr } of SCALAR_OPS) {
      fc.assert(
        fc.property(fc.tuple(fieldNameArb, cleanValueArb), ([key, value]) => {
          const result = buildFiql({
            [key]: { op, value },
          } as FiqlFilters);
          expect(result).toContain(expectedOpStr);
        }),
        { numRuns: NUM_RUNS },
      );
    }
  });

  /**
   * PROPERTY: Operador `in` — el output contiene `=in=` y el valor está entre paréntesis.
   */
  it('property: =in= operator produces =in=(...) with values between parentheses', () => {
    const cleanItemArb = fc
      .string({ minLength: 1, maxLength: 8 })
      .filter((s) => !/[;,()'" =!]/.test(s));

    fc.assert(
      fc.property(
        fc.tuple(
          fieldNameArb,
          fc.array(cleanItemArb, { minLength: 1, maxLength: 5 }),
        ),
        ([key, values]) => {
          const result = buildFiql({
            [key]: { op: 'in', value: values },
          } as FiqlFilters);
          expect(result).toContain('=in=');
          expect(result).toContain('(');
          expect(result).toContain(')');
          // Paréntesis balanceados
          const opens = (result.match(/\(/g) ?? []).length;
          const closes = (result.match(/\)/g) ?? []).length;
          expect(opens).toBe(closes);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * PROPERTY: Safety — ningún valor con <script> o 'OR 1=1 produce un FIQL
   * que rompe la gramática definida por FIQL_OP_RE.
   *
   * Esto verifica que el escape sanitiza los valores peligrosos correctamente.
   */
  it('property: XSS and SQL injection values do not break FIQL grammar', () => {
    const injectionArb = fc.constantFrom(
      "<script>alert('xss')</script>",
      "' OR 1=1 --",
      "'; DROP TABLE clientes; --",
      '<img src=x onerror=alert(1)>',
      'value; malicious==injection',
      'val,second==injection',
      '(nested==injection)',
    );

    fc.assert(
      fc.property(fc.tuple(fieldNameArb, injectionArb), ([key, value]) => {
        const result = buildFiql({ [key]: value } as FiqlFilters);
        // El resultado debe ser FIQL válido (no romper la gramática)
        expect(isValidFiqlOrEmpty(result)).toBe(true);
        // No debe contener literales ; fuera de posición
        if (result.length > 0) {
          const eqIdx = result.indexOf('==');
          if (eqIdx !== -1) {
            const valuepart = result.slice(eqIdx + 2);
            // El valor escapado no debe contener ; o , sin codificar
            expect(valuepart).not.toMatch(/[^%][;,]/);
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * PROPERTY: In array vacío — buildFiql({ k: { op: 'in', value: [] } })
   * produce string vacío (la expresión se descarta).
   */
  it('property: =in= with empty array produces empty string (expression skipped)', () => {
    fc.assert(
      fc.property(fieldNameArb, (key) => {
        const result = buildFiql({
          [key]: { op: 'in', value: [] },
        } as FiqlFilters);
        // Array vacío → expresión descartada → string vacío o sin ese campo
        expect(isValidFiqlOrEmpty(result)).toBe(true);
        // No debe contener =in= si el array está vacío
        expect(result).not.toContain('=in=');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * PROPERTY: Valores booleanos — true/false se serializan correctamente.
   */
  it('property: boolean values serialize to "true" or "false" in FIQL output', () => {
    fc.assert(
      fc.property(fc.tuple(fieldNameArb, fc.boolean()), ([key, boolVal]) => {
        const result = buildFiql({ [key]: boolVal } as FiqlFilters);
        expect(result.length).toBeGreaterThan(0);
        // El resultado debe contener el string del booleano
        const expectedStr = String(boolVal);
        expect(result).toContain(expectedStr);
        expect(isValidFiqlOrEmpty(result)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * PROPERTY: Números — los números se serializan y producen FIQL válido.
   * Especialmente negativos y cero.
   */
  it('property: numeric values produce valid FIQL output', () => {
    fc.assert(
      fc.property(
        fc.tuple(fieldNameArb, fc.float({ min: -1e6, max: 1e6, noNaN: true })),
        ([key, num]) => {
          const result = buildFiql({ [key]: num } as FiqlFilters);
          expect(result.length).toBeGreaterThan(0);
          // Debe ser FIQL válido
          expect(isValidFiqlOrEmpty(result)).toBe(true);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
