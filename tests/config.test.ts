import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadAuthConfig, loadHttpConfig, loadConfig } from '../src/config.js';

const REQUIRED_AUTH_VARS = [
  'FREEMATICA_AUTH_TOKEN',
  'FREEMATICA_AUTH_COMPANY',
  'FREEMATICA_AUTH_ORGANIZATION',
  'FREEMATICA_AUTH_APP',
  'FREEMATICA_AUTH_SESSION',
] as const;

function setAllRequired(): void {
  process.env.FREEMATICA_AUTH_TOKEN = 'tok';
  process.env.FREEMATICA_AUTH_COMPANY = 'co';
  process.env.FREEMATICA_AUTH_ORGANIZATION = 'org';
  process.env.FREEMATICA_AUTH_APP = 'app';
  process.env.FREEMATICA_AUTH_SESSION = 'ses';
}

describe('loadAuthConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of REQUIRED_AUTH_VARS) delete process.env[key];
    delete process.env.FREEMATICA_BASE_URL;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads valid auth config from env vars', () => {
    setAllRequired();

    const config = loadAuthConfig();

    expect(config.FREEMATICA_AUTH_TOKEN).toBe('tok');
    expect(config.FREEMATICA_AUTH_COMPANY).toBe('co');
    expect(config.FREEMATICA_AUTH_ORGANIZATION).toBe('org');
    expect(config.FREEMATICA_AUTH_APP).toBe('app');
    expect(config.FREEMATICA_AUTH_SESSION).toBe('ses');
    expect(config.FREEMATICA_BASE_URL).toBe(
      'https://api-p01.clientservicepanel.com/restsat/api',
    );
  });

  it.each(REQUIRED_AUTH_VARS)('throws clear error when %s is missing', (varName) => {
    setAllRequired();
    delete process.env[varName];

    expect(() => loadAuthConfig()).toThrow(new RegExp(varName));
  });

  it('error message includes the "Set the missing/invalid…" sentinel', () => {
    setAllRequired();
    delete process.env.FREEMATICA_AUTH_TOKEN;

    expect(() => loadAuthConfig()).toThrow(
      /Set the missing\/invalid environment variables and restart\./,
    );
  });

  it('accepts a custom FREEMATICA_BASE_URL override', () => {
    setAllRequired();
    process.env.FREEMATICA_BASE_URL = 'https://custom.example.com/api';

    const config = loadAuthConfig();

    expect(config.FREEMATICA_BASE_URL).toBe('https://custom.example.com/api');
  });

  it('rejects invalid FREEMATICA_BASE_URL', () => {
    setAllRequired();
    process.env.FREEMATICA_BASE_URL = 'not-a-url';

    expect(() => loadAuthConfig()).toThrow(/FREEMATICA_BASE_URL/);
  });

  it('does NOT require MCP_PORT or MCP_ALLOWED_ORIGINS', () => {
    setAllRequired();
    delete process.env.MCP_PORT;
    delete process.env.MCP_ALLOWED_ORIGINS;

    expect(() => loadAuthConfig()).not.toThrow();
  });
});

describe('loadHttpConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.MCP_PORT;
    delete process.env.MCP_ALLOWED_ORIGINS;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns defaults when no HTTP env vars set', () => {
    const config = loadHttpConfig();

    expect(config.MCP_PORT).toBe(3000);
    expect(config.MCP_ALLOWED_ORIGINS).toBe('*');
  });

  it('coerces MCP_PORT to number', () => {
    process.env.MCP_PORT = '8080';

    const config = loadHttpConfig();

    expect(config.MCP_PORT).toBe(8080);
    expect(typeof config.MCP_PORT).toBe('number');
  });

  it('rejects MCP_PORT out of range', () => {
    process.env.MCP_PORT = '99999';

    expect(() => loadHttpConfig()).toThrow(/MCP_PORT/);
  });

  it('reads MCP_ALLOWED_ORIGINS override', () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://nubiia.example';

    const config = loadHttpConfig();

    expect(config.MCP_ALLOWED_ORIGINS).toBe('https://nubiia.example');
  });

  it('does NOT require FREEMATICA_AUTH_* vars', () => {
    for (const key of REQUIRED_AUTH_VARS) delete process.env[key];

    expect(() => loadHttpConfig()).not.toThrow();
  });
});

describe('loadConfig (retro-compat wrapper)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of REQUIRED_AUTH_VARS) delete process.env[key];
    delete process.env.FREEMATICA_BASE_URL;
    delete process.env.MCP_PORT;
    delete process.env.MCP_ALLOWED_ORIGINS;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('combines auth + http config', () => {
    setAllRequired();

    const config = loadConfig();

    expect(config.FREEMATICA_AUTH_TOKEN).toBe('tok');
    expect(config.MCP_PORT).toBe(3000);
    expect(config.MCP_ALLOWED_ORIGINS).toBe('*');
  });
});

describe('loadWritesConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.FREEMATICA_ENABLE_WRITES;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('defaults to writes disabled', async () => {
    const { loadWritesConfig } = await import('../src/config.js');
    expect(loadWritesConfig().FREEMATICA_ENABLE_WRITES).toBe(false);
  });

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
  ] as const)('parses FREEMATICA_ENABLE_WRITES=%s as %s', async (raw, expected) => {
    process.env.FREEMATICA_ENABLE_WRITES = raw;
    const { loadWritesConfig } = await import('../src/config.js');
    expect(loadWritesConfig().FREEMATICA_ENABLE_WRITES).toBe(expected);
  });

  it('rejects values outside the enum', async () => {
    process.env.FREEMATICA_ENABLE_WRITES = 'yes';
    const { loadWritesConfig } = await import('../src/config.js');
    expect(() => loadWritesConfig()).toThrow(/FREEMATICA_ENABLE_WRITES/);
  });
});
