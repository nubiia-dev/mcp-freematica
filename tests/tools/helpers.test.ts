import { describe, it, expect } from 'vitest';
import { ok, error } from '../../src/tools/helpers.js';
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
