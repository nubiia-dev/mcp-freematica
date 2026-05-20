import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { PaginationSchema } from '../../src/schemas/pagination.js';

const Combined = z.object(PaginationSchema);

describe('PaginationSchema', () => {
  it('applies defaults when nothing is provided', () => {
    const result = Combined.parse({});
    expect(result.page).toBe(1);
    expect(result.items).toBe(20);
  });

  it('accepts page=1 and items=50 (boundary)', () => {
    expect(() => Combined.parse({ page: 1, items: 50 })).not.toThrow();
  });

  it('rejects page=0 (API treats as "all", we block it)', () => {
    expect(() => Combined.parse({ page: 0, items: 10 })).toThrow();
  });

  it('rejects page=-1', () => {
    expect(() => Combined.parse({ page: -1, items: 10 })).toThrow();
  });

  it('rejects non-integer page', () => {
    expect(() => Combined.parse({ page: 1.5, items: 10 })).toThrow();
  });

  it('rejects items=0', () => {
    expect(() => Combined.parse({ page: 1, items: 0 })).toThrow();
  });

  it('rejects items=51 (max 50)', () => {
    expect(() => Combined.parse({ page: 1, items: 51 })).toThrow();
  });

  it('rejects negative items', () => {
    expect(() => Combined.parse({ page: 1, items: -5 })).toThrow();
  });
});
