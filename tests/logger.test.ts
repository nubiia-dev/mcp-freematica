/**
 * Tests del logger estructurado: verificar que los headers x-auth-* NO
 * aparecen en el output de pino bajo ningún nivel de logging.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Writable } from 'node:stream';
import { sanitizeHeaders, AUTH_HEADER_NAMES, createLogger } from '../src/logger.js';

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

// ---------------------------------------------------------------------------
// createLogger: injectable stream factory
// ---------------------------------------------------------------------------

describe('createLogger (injectable stream)', () => {
  let chunks: string[];
  let destStream: Writable;

  beforeEach(() => {
    chunks = [];
    destStream = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void) {
        chunks.push(chunk.toString());
        callback();
      },
    });
  });

  it('creates a functional logger that writes to the provided stream', () => {
    const testLogger = createLogger(destStream);
    testLogger.info('test message');
    // Pino may buffer — flush is synchronous for in-process streams
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('test message');
  });

  it('does NOT emit x-auth-token in log output when logging req with headers', () => {
    // This is the end-to-end sanitization test:
    // Even if someone logs { headers: { 'x-auth-token': 'SECRET123' } },
    // the req serializer must strip it before output.
    const testLogger = createLogger(destStream);
    testLogger.info(
      {
        req: {
          method: 'GET',
          path: '/clientes',
          headers: {
            'x-auth-token': 'SECRET123',
            'x-auth-company': 'CONFIDENTIAL_COMPANY',
            'content-type': 'application/json',
          },
        },
      },
      'outgoing request',
    );

    const output = chunks.join('');
    // Verify sensitive tokens never appear in output
    expect(output).not.toContain('SECRET123');
    expect(output).not.toContain('CONFIDENTIAL_COMPANY');
    // Non-auth headers should be present
    expect(output).toContain('application/json');
  });

  it('does NOT emit any x-auth-* header value in output', () => {
    const testLogger = createLogger(destStream);
    const sensitiveHeaders: Record<string, string> = {
      'x-auth-token': 'TOKEN_VALUE_123',
      'x-auth-company': 'COMPANY_VALUE_456',
      'x-auth-organization': 'ORG_VALUE_789',
      'x-auth-app': 'APP_VALUE_000',
      'x-auth-session': 'SESSION_VALUE_111',
    };

    testLogger.info(
      { req: { method: 'POST', path: '/data', headers: sensitiveHeaders } },
      'request with all auth headers',
    );

    const output = chunks.join('');
    for (const val of Object.values(sensitiveHeaders)) {
      expect(output).not.toContain(val);
    }
  });

  it('createLogger with no destination uses default stdout destination', () => {
    // Should not throw
    const l = createLogger();
    expect(l).toBeDefined();
    expect(typeof l.info).toBe('function');
  });
});
