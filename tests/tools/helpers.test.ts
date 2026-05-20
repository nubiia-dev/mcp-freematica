import { describe, it, expect } from 'vitest';
import { ok, error, okList } from '../../src/tools/helpers.js';
import { FreematicaError } from '../../src/clients/base-client.js';

describe('ok', () => {
  it('wraps data in MCP content array as JSON text', () => {
    const result = ok({ count: 2, items: [1, 2] });
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ count: 2, items: [1, 2] }, null, 2) }],
    });
    expect(result.isError).toBeUndefined();
  });
});

describe('error', () => {
  it('wraps code + message with isError=true', () => {
    const result = error('forbidden', 'nope');
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({ error: 'forbidden', message: 'nope' });
  });

  it('accepts a FreematicaError instance', () => {
    const result = error(new FreematicaError('not_found', 'gone'));
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({ error: 'not_found', message: 'gone' });
  });

  it('falls back to unexpected_error for unknown errors', () => {
    const result = error(new Error('boom'));
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('unexpected_error');
    expect(parsed.message).toContain('boom');
  });
});

describe('okList', () => {
  it('wraps list payload with items, count, total, page, items_per_page', () => {
    const result = okList({
      items: [{ a: 1 }, { a: 2 }],
      total: 100,
      page: 2,
      itemsPerPage: 10,
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: [{ a: 1 }, { a: 2 }],
      count: 2,
      total: 100,
      page: 2,
      items_per_page: 10,
    });
  });

  it('omits page/items_per_page when not provided', () => {
    const result = okList({ items: [], total: 0 });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      items: [],
      count: 0,
      total: 0,
      page: undefined,
      items_per_page: undefined,
    });
  });
});
