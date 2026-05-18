import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads valid config from env vars', () => {
    process.env.FREEMATICA_AUTH_TOKEN = 'tok';
    process.env.FREEMATICA_AUTH_COMPANY = 'co';
    process.env.FREEMATICA_AUTH_ORGANIZATION = 'org';
    process.env.FREEMATICA_AUTH_APP = 'app';
    process.env.FREEMATICA_AUTH_SESSION = 'ses';

    const config = loadConfig();

    expect(config.FREEMATICA_AUTH_TOKEN).toBe('tok');
    expect(config.FREEMATICA_AUTH_COMPANY).toBe('co');
    expect(config.FREEMATICA_BASE_URL).toBe('https://api-p01.clientservicepanel.com/restsat/api');
    expect(config.MCP_PORT).toBe(3000);
    expect(config.MCP_ALLOWED_ORIGINS).toBe('*');
  });

  it('throws clear error when FREEMATICA_AUTH_TOKEN missing', () => {
    process.env.FREEMATICA_AUTH_COMPANY = 'co';
    process.env.FREEMATICA_AUTH_ORGANIZATION = 'org';
    process.env.FREEMATICA_AUTH_APP = 'app';
    process.env.FREEMATICA_AUTH_SESSION = 'ses';
    delete process.env.FREEMATICA_AUTH_TOKEN;

    expect(() => loadConfig()).toThrow(/FREEMATICA_AUTH_TOKEN/);
  });

  it('coerces MCP_PORT to number', () => {
    process.env.FREEMATICA_AUTH_TOKEN = 'tok';
    process.env.FREEMATICA_AUTH_COMPANY = 'co';
    process.env.FREEMATICA_AUTH_ORGANIZATION = 'org';
    process.env.FREEMATICA_AUTH_APP = 'app';
    process.env.FREEMATICA_AUTH_SESSION = 'ses';
    process.env.MCP_PORT = '8080';

    const config = loadConfig();

    expect(config.MCP_PORT).toBe(8080);
    expect(typeof config.MCP_PORT).toBe('number');
  });

  it('rejects MCP_PORT out of range', () => {
    process.env.FREEMATICA_AUTH_TOKEN = 'tok';
    process.env.FREEMATICA_AUTH_COMPANY = 'co';
    process.env.FREEMATICA_AUTH_ORGANIZATION = 'org';
    process.env.FREEMATICA_AUTH_APP = 'app';
    process.env.FREEMATICA_AUTH_SESSION = 'ses';
    process.env.MCP_PORT = '99999';

    expect(() => loadConfig()).toThrow(/MCP_PORT/);
  });
});
