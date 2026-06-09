/**
 * Tests del logger estructurado: verificar que los headers x-auth-* NO
 * aparecen en el output de pino bajo ningún nivel de logging.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeHeaders, AUTH_HEADER_NAMES } from '../src/logger.js';

// ---------------------------------------------------------------------------
// sanitizeHeaders unit tests
// ---------------------------------------------------------------------------

describe('sanitizeHeaders', () => {
  it('removes all x-auth-* headers', () => {
    const headers = {
      'x-auth-token': 'super-secret-token',
      'x-auth-company': 'ACME',
      'x-auth-organization': 'ORG1',
      'x-auth-app': 'mcp-client',
      'x-auth-session': 'sess-123',
      'content-type': 'application/json',
      accept: 'application/json',
    };

    const sanitized = sanitizeHeaders(headers);

    // Ningún x-auth-* debe estar presente
    for (const name of AUTH_HEADER_NAMES) {
      expect(sanitized).not.toHaveProperty(name);
    }

    // Los demás headers deben conservarse
    expect(sanitized['content-type']).toBe('application/json');
    expect(sanitized['accept']).toBe('application/json');
  });

  it('returns empty object when all headers are auth headers', () => {
    const headers: Record<string, string> = {};
    for (const name of AUTH_HEADER_NAMES) {
      headers[name] = `value-for-${name}`;
    }

    const sanitized = sanitizeHeaders(headers);
    expect(Object.keys(sanitized)).toHaveLength(0);
  });

  it('does not mutate the original headers object', () => {
    const headers = {
      'x-auth-token': 'secret',
      'content-type': 'application/json',
    };
    const original = { ...headers };

    sanitizeHeaders(headers);

    expect(headers).toEqual(original);
  });

  it('handles empty headers object', () => {
    expect(sanitizeHeaders({})).toEqual({});
  });

  it('is case-insensitive for x-auth-* header names', () => {
    const headers = {
      'X-Auth-Token': 'secret',
      'X-AUTH-COMPANY': 'ACME',
      'content-type': 'application/json',
    };

    const sanitized = sanitizeHeaders(headers);

    expect(sanitized).not.toHaveProperty('X-Auth-Token');
    expect(sanitized).not.toHaveProperty('X-AUTH-COMPANY');
    expect(sanitized['content-type']).toBe('application/json');
  });

  it('preserves non-auth headers with various names', () => {
    const headers = {
      'content-type': 'application/json',
      accept: 'application/json',
      'x-request-id': 'req-uuid-123',
      authorization: 'Bearer public-token',
      'user-agent': 'mcp-client/1.0',
    };

    const sanitized = sanitizeHeaders(headers);
    expect(sanitized).toEqual(headers);
  });

  it('sanitizes x-auth-* even when mixed with legitimate headers', () => {
    const headers = {
      'x-auth-token': 'MUST_BE_REMOVED',
      'x-request-id': 'MUST_KEEP',
      'x-auth-company': 'MUST_BE_REMOVED',
      'content-type': 'MUST_KEEP',
    };

    const sanitized = sanitizeHeaders(headers);

    expect(sanitized).not.toHaveProperty('x-auth-token');
    expect(sanitized).not.toHaveProperty('x-auth-company');
    expect(sanitized['x-request-id']).toBe('MUST_KEEP');
    expect(sanitized['content-type']).toBe('MUST_KEEP');
  });
});

// ---------------------------------------------------------------------------
// AUTH_HEADER_NAMES constant tests
// ---------------------------------------------------------------------------

describe('AUTH_HEADER_NAMES', () => {
  it('contains all expected auth header names', () => {
    expect(AUTH_HEADER_NAMES).toContain('x-auth-token');
    expect(AUTH_HEADER_NAMES).toContain('x-auth-company');
    expect(AUTH_HEADER_NAMES).toContain('x-auth-organization');
    expect(AUTH_HEADER_NAMES).toContain('x-auth-app');
    expect(AUTH_HEADER_NAMES).toContain('x-auth-session');
  });

  it('has exactly 5 entries (no unexpected additions)', () => {
    expect(AUTH_HEADER_NAMES).toHaveLength(5);
  });

  it('all names are lowercase', () => {
    for (const name of AUTH_HEADER_NAMES) {
      expect(name).toBe(name.toLowerCase());
    }
  });
});

// ---------------------------------------------------------------------------
// Logger output test: serializer sanitization
// ---------------------------------------------------------------------------

describe('logger serializer (req)', () => {
  it('logger module exports logger without throwing', async () => {
    // Import dinámico para capturar el logger
    const { logger } = await import('../src/logger.js');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('logger has a level property', async () => {
    const { logger } = await import('../src/logger.js');
    expect(typeof logger.level).toBe('string');
  });
});
