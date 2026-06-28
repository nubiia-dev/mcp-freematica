import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { FreematicaEnvelope } from '../types/api-envelope.js';

export type FreematicaErrorCode =
  | 'invalid_token'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit_exceeded'
  | 'server_error'
  | 'network_error'
  | 'unexpected_error';

export class FreematicaError extends Error {
  constructor(
    public readonly code: FreematicaErrorCode,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'FreematicaError';
  }
}

export interface AuthHeaders {
  'x-auth-token': string;
  'x-auth-company': string;
  'x-auth-organization': string;
  'x-auth-app': string;
  'x-auth-session': string;
}

export interface BaseClientConfig {
  baseUrl: string;
  authHeaders: AuthHeaders;
  timeoutMs?: number;
}

export class BaseClient {
  protected readonly http: AxiosInstance;

  constructor(config: BaseClientConfig) {
    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs ?? 30_000,
      headers: {
        ...config.authHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  protected async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  protected async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  protected async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  protected async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  protected async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    try {
      const res = await this.http.request<FreematicaEnvelope<T>>({
        method,
        url: path,
        data: body,
      });
      const envelope = res.data;
      if (envelope?.errorCode !== '200') {
        throw this.mapEnvelopeError(envelope);
      }
      return envelope.data;
    } catch (err) {
      if (err instanceof FreematicaError) throw err;
      throw this.mapAxiosError(err);
    }
  }

  protected mapEnvelopeError(env: FreematicaEnvelope<unknown> | undefined): FreematicaError {
    const code = env?.errorCode ?? 'unknown';
    const msg = env?.errorMessage || `API error (envelope errorCode=${code})`;
    if (code === '401') return new FreematicaError('invalid_token', msg);
    if (code === '403') return new FreematicaError('forbidden', msg);
    if (code === '404') return new FreematicaError('not_found', msg);
    if (code === '429') return new FreematicaError('rate_limit_exceeded', msg);
    if (code.startsWith('5')) return new FreematicaError('server_error', msg);
    return new FreematicaError('unexpected_error', msg);
  }

  protected mapAxiosError(err: unknown): FreematicaError {
    if (err instanceof AxiosError) {
      if (err.response) {
        const status = err.response.status;
        if (status === 401) return new FreematicaError('invalid_token', 'Authentication failed (401)');
        if (status === 403) return new FreematicaError('forbidden', 'Insufficient permissions (403)');
        if (status === 404) return new FreematicaError('not_found', 'Resource not found (404)');
        if (status === 429) {
          const retryAfterHeader = err.response.headers['retry-after'];
          const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
          return new FreematicaError(
            'rate_limit_exceeded',
            `Rate limit exceeded${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`,
            retryAfter,
          );
        }
        if (status >= 500) {
          return new FreematicaError('server_error', `Upstream server error (${status})`);
        }
      }
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        return new FreematicaError('network_error', `Network error: ${err.message}`);
      }
      // ECONNABORTED: Axios timeout (axios timeout option fired)
      // ERR_CANCELED: Axios cancellation via AbortController signal
      if (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED') {
        return new FreematicaError('network_error', `Request timed out: ${err.message}`);
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    return new FreematicaError('unexpected_error', `Unexpected error: ${msg}`);
  }
}
