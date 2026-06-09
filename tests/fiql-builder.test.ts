import { describe, it, expect } from 'vitest';
import { buildFiql, appendRquery } from '../src/clients/fiql-builder.js';

describe('buildFiql', () => {
  // ---------------------------------------------------------------------------
  // Empty / undefined inputs
  // ---------------------------------------------------------------------------

  describe('empty inputs', () => {
    it('returns empty string for empty group', () => {
      expect(buildFiql({})).toBe('');
    });

    it('returns empty string when all values are undefined', () => {
      expect(buildFiql({ COD_CLI: undefined, ESTADO: undefined })).toBe('');
    });

    it('returns empty string for empty and/or composition', () => {
      expect(buildFiql({ and: [], or: [] })).toBe('');
    });

    it('returns empty string for composition with all-undefined groups', () => {
      expect(buildFiql({ and: [{ CAMPO: undefined }] })).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Simple equality (default operator ==)
  // ---------------------------------------------------------------------------

  describe('default operator (==)', () => {
    it('generates == for a string value', () => {
      expect(buildFiql({ COD_CLI: '123' })).toBe('COD_CLI==123');
    });

    it('generates == for a numeric value', () => {
      expect(buildFiql({ IMPORTE: 1000 })).toBe('IMPORTE==1000');
    });

    it('generates == for a boolean true', () => {
      expect(buildFiql({ ACTIVO: true })).toBe('ACTIVO==true');
    });

    it('generates == for a boolean false', () => {
      expect(buildFiql({ ACTIVO: false })).toBe('ACTIVO==false');
    });

    it('joins multiple fields with ; (AND)', () => {
      const result = buildFiql({ COD_CLI: 'A1', ESTADO: 'activo' });
      expect(result).toBe('COD_CLI==A1;ESTADO==activo');
    });

    it('skips undefined fields in a multi-field group', () => {
      const result = buildFiql({ COD_CLI: 'A1', ESTADO: undefined, NOMBRE: 'Juan' });
      expect(result).toBe('COD_CLI==A1;NOMBRE==Juan');
    });
  });

  // ---------------------------------------------------------------------------
  // Explicit operators
  // ---------------------------------------------------------------------------

  describe('explicit operators', () => {
    it('generates != for ne', () => {
      expect(buildFiql({ ESTADO: { op: 'ne', value: 'inactivo' } })).toBe('ESTADO!=inactivo');
    });

    it('generates =gt= for gt', () => {
      expect(buildFiql({ IMPORTE: { op: 'gt', value: 100 } })).toBe('IMPORTE=gt=100');
    });

    it('generates =lt= for lt', () => {
      expect(buildFiql({ IMPORTE: { op: 'lt', value: 500 } })).toBe('IMPORTE=lt=500');
    });

    it('generates =ge= for ge', () => {
      expect(buildFiql({ IMPORTE: { op: 'ge', value: 100 } })).toBe('IMPORTE=ge=100');
    });

    it('generates =le= for le', () => {
      expect(buildFiql({ IMPORTE: { op: 'le', value: 500 } })).toBe('IMPORTE=le=500');
    });

    it('generates =in=(v1,v2,v3) for in with array', () => {
      expect(buildFiql({ COD_CLI: { op: 'in', value: ['A1', 'A2', 'A3'] } }))
        .toBe('COD_CLI=in=(A1,A2,A3)');
    });

    it('generates =in=(v1) for in with single-element array', () => {
      expect(buildFiql({ COD_CLI: { op: 'in', value: ['A1'] } }))
        .toBe('COD_CLI=in=(A1)');
    });

    it('generates =in= for in with numeric array', () => {
      expect(buildFiql({ ID: { op: 'in', value: [1, 2, 3] } }))
        .toBe('ID=in=(1,2,3)');
    });

    it('returns empty string for in with empty array', () => {
      expect(buildFiql({ COD_CLI: { op: 'in', value: [] } })).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Escape of FIQL reserved characters
  // ---------------------------------------------------------------------------

  describe('FIQL character escaping', () => {
    it('escapes semicolon in values', () => {
      const result = buildFiql({ NOTA: 'hola;mundo' });
      expect(result).toBe('NOTA==hola%3Bmundo');
    });

    it('escapes comma in values', () => {
      const result = buildFiql({ NOTA: 'a,b' });
      expect(result).toBe('NOTA==a%2Cb');
    });

    it('escapes opening parenthesis in values', () => {
      const result = buildFiql({ DESCRIPCION: 'tipo(A)' });
      expect(result).toBe('DESCRIPCION==tipo%28A%29');
    });

    it('escapes closing parenthesis in values', () => {
      const result = buildFiql({ VAL: 'x)y' });
      expect(result).toBe('VAL==x%29y');
    });

    it('escapes double quotes in values', () => {
      const result = buildFiql({ NOMBRE: '"Juan"' });
      expect(result).toBe('NOMBRE==%22Juan%22');
    });

    it('escapes single quotes in values', () => {
      const result = buildFiql({ NOMBRE: "O'Brien" });
      expect(result).toBe("NOMBRE==O%27Brien");
    });

    it('escapes spaces in values', () => {
      const result = buildFiql({ NOMBRE: 'Juan Pérez' });
      expect(result).toBe('NOMBRE==Juan%20Pérez');
    });

    it('escapes multiple reserved chars in one value', () => {
      const result = buildFiql({ VAL: 'a;b,c(d)' });
      expect(result).toBe('VAL==a%3Bb%2Cc%28d%29');
    });

    it('escapes reserved chars in =in= array values', () => {
      const result = buildFiql({ TAG: { op: 'in', value: ['a;b', 'c,d'] } });
      expect(result).toBe('TAG=in=(a%3Bb,c%2Cd)');
    });

    it('leaves non-reserved chars unchanged', () => {
      const result = buildFiql({ COD: 'ABC-123_XYZ' });
      expect(result).toBe('COD==ABC-123_XYZ');
    });

    it('handles unicode characters without escaping', () => {
      const result = buildFiql({ NOMBRE: 'Ángel' });
      expect(result).toBe('NOMBRE==Ángel');
    });

    // Critical fix: = and ! must be escaped to prevent FIQL operator injection
    it('escapes = in values (prevents operator injection like ==EVIL)', () => {
      const result = buildFiql({ CAMPO: '123==EVIL' });
      expect(result).toBe('CAMPO==123%3D%3DEVIL');
    });

    it('escapes = in values (prevents FIQL operator misread like x=gt=0)', () => {
      const result = buildFiql({ CAMPO: 'x=gt=0' });
      expect(result).toBe('CAMPO==x%3Dgt%3D0');
    });

    it('escapes ! in values (prevents != operator injection)', () => {
      const result = buildFiql({ CAMPO: 'a!=b' });
      expect(result).toBe('CAMPO==a%21%3Db');
    });

    it('escapes combined ==, !=, =gt= in one value', () => {
      const val = '==!=x=gt=';
      const result = buildFiql({ OP: val });
      expect(result).toBe('OP==%3D%3D%21%3Dx%3Dgt%3D');
    });
  });

  // ---------------------------------------------------------------------------
  // AND / OR composition
  // ---------------------------------------------------------------------------

  describe('AND composition', () => {
    it('joins single-field groups with ;', () => {
      const result = buildFiql({ and: [{ EMPRESA: '1' }, { DELEGACION: 'MAD' }] });
      expect(result).toBe('EMPRESA==1;DELEGACION==MAD');
    });

    it('handles single group in and', () => {
      expect(buildFiql({ and: [{ COD_CLI: 'A1' }] })).toBe('COD_CLI==A1');
    });

    it('skips undefined values in and groups', () => {
      const result = buildFiql({ and: [{ COD_CLI: 'A1' }, { ESTADO: undefined }] });
      expect(result).toBe('COD_CLI==A1');
    });
  });

  describe('OR composition', () => {
    it('joins single-field groups with ,', () => {
      const result = buildFiql({ or: [{ ESTADO: 'activo' }, { ESTADO: 'pendiente' }] });
      expect(result).toBe('ESTADO==activo,ESTADO==pendiente');
    });

    it('handles single group in or', () => {
      expect(buildFiql({ or: [{ COD_CLI: 'A1' }] })).toBe('COD_CLI==A1');
    });
  });

  describe('AND + OR composition', () => {
    it('combines and and or with ;', () => {
      const result = buildFiql({
        and: [{ EMPRESA: '1' }],
        or: [{ ESTADO: 'activo' }, { ESTADO: 'pendiente' }],
      });
      expect(result).toBe('EMPRESA==1;ESTADO==activo,ESTADO==pendiente');
    });
  });

  // ---------------------------------------------------------------------------
  // Type confusion guard: and/or with non-array values (Critical fix)
  // ---------------------------------------------------------------------------

  describe('type guard: and/or with non-array values are treated as field names', () => {
    /**
     * Antes del fix, `{ and: 'COD_CLI==injection' }` pasaba isComposition()
     * y luego `for (const group of filters.and)` iteraba el string char a char,
     * produciendo basura silenciosa como `0==C;0==O;0==D;...`.
     *
     * Ahora: si `and`/`or` tienen un valor non-array, se tratan como campo
     * plano ordinario.
     */
    it('treats { and: string } as a plain field (NOT composition)', () => {
      // El campo "and" con valor string se trata como campo plano
      const result = buildFiql({ and: 'valor' } as Parameters<typeof buildFiql>[0]);
      // Debe producir una expresión simple campo==valor, no basura
      expect(result).toBe('and==valor');
    });

    it('does not iterate string char by char when and: string is passed', () => {
      // Regresión contra el bug original: char-by-char iteration
      const result = buildFiql({ and: 'COD_CLI%3D%3Dinjection' } as Parameters<typeof buildFiql>[0]);
      // Debe ser una sola expresión, no decenas de 0==C;0==O;...
      expect(result.split(';').length).toBe(1);
    });

    it('treats { or: number } as a plain field (NOT composition)', () => {
      const result = buildFiql({ or: 123 } as Parameters<typeof buildFiql>[0]);
      expect(result).toBe('or==123');
    });

    it('{ and: [...] } still works as composition (correct array path)', () => {
      const result = buildFiql({ and: [{ CAMPO: 'val' }] });
      expect(result).toBe('CAMPO==val');
    });

    it('{ or: [...] } still works as composition (correct array path)', () => {
      const result = buildFiql({ or: [{ ESTADO: 'activo' }, { ESTADO: 'baja' }] });
      expect(result).toBe('ESTADO==activo,ESTADO==baja');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles numeric zero as value', () => {
      expect(buildFiql({ IMPORTE: 0 })).toBe('IMPORTE==0');
    });

    it('handles empty string value', () => {
      expect(buildFiql({ NOMBRE: '' })).toBe('NOMBRE==');
    });

    it('handles boolean false as value', () => {
      expect(buildFiql({ ACTIVO: false })).toBe('ACTIVO==false');
    });

    it('handles large numeric values', () => {
      expect(buildFiql({ IMPORTE: 9_999_999.99 })).toBe('IMPORTE==9999999.99');
    });
  });
});

// ---------------------------------------------------------------------------
// appendRquery
// ---------------------------------------------------------------------------

describe('appendRquery', () => {
  it('adds rquery param when fiql is non-empty', () => {
    const url = new URL('https://api.example.com/clientes');
    appendRquery(url, 'COD_CLI==123');
    expect(url.searchParams.get('rquery')).toBe('COD_CLI==123');
  });

  it('does not add rquery when fiql is empty', () => {
    const url = new URL('https://api.example.com/clientes');
    appendRquery(url, '');
    expect(url.searchParams.has('rquery')).toBe(false);
  });

  it('overwrites existing rquery param', () => {
    const url = new URL('https://api.example.com/clientes?rquery=old');
    appendRquery(url, 'COD_CLI==456');
    expect(url.searchParams.get('rquery')).toBe('COD_CLI==456');
  });

  it('preserves other query params', () => {
    const url = new URL('https://api.example.com/clientes?page=2&items=10');
    appendRquery(url, 'ESTADO==activo');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('items')).toBe('10');
    expect(url.searchParams.get('rquery')).toBe('ESTADO==activo');
  });
});
