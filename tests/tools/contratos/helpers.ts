import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaClient } from '../../../src/clients/freematica-client.js';
import { registerContratosTools } from '../../../src/tools/contratos/index.js';

export const BASE_URL = 'https://api.example.com/restsat/api';

export const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

/** idReg de contrato de ejemplo: Base64("02__08__2304"). */
export const CONTRATO_IDREG = 'MDJfXzA4X18yMzA0';
/** idReg de servicio de ejemplo: Base64("02__08__2304__1"). */
export const SERVICIO_IDREG = 'MDJfXzA4X18yMzA0X18x';

export interface ToolHandler {
  (args: unknown): Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
}

export function buildServer(opts: { enableWrites?: boolean } = {}): {
  server: McpServer;
  client: FreematicaClient;
} {
  const client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerContratosTools(server, client, { enableWrites: opts.enableWrites ?? false });
  return { server, client };
}

export function registeredTools(server: McpServer): Record<string, unknown> {
  return (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
}

export function getHandler(server: McpServer, toolName: string): ToolHandler {
  const tools = (
    server as unknown as {
      _registeredTools: Record<string, { handler?: ToolHandler; callback?: ToolHandler }>;
    }
  )._registeredTools;
  const tool = tools[toolName];
  if (!tool) throw new Error(`tool no registrada: ${toolName}`);
  const handler = tool.handler ?? tool.callback;
  if (!handler) throw new Error(`handler no registrado para: ${toolName}`);
  return handler;
}

/** Envelope estándar de lista del API de Freemática. */
export function listEnvelope(items: unknown[], total?: number): Record<string, unknown> {
  return {
    errorCode: '200',
    errorMessage: '',
    data: { total: String(total ?? items.length), items, rowHeight: -1 },
  };
}

/** Envelope estándar de detalle/escritura del API de Freemática. */
export function detailEnvelope(data: unknown): Record<string, unknown> {
  return { errorCode: '200', errorMessage: '', data };
}
