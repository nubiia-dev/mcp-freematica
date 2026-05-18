import { describe, it, expect } from 'vitest';
import { createFreematicaServer } from '../src/server.js';
import { FreematicaClient } from '../src/clients/freematica-client.js';

describe('createFreematicaServer', () => {
  it('returns an McpServer with name freematica-mcp and the contratos tool registered', () => {
    const client = new FreematicaClient({
      baseUrl: 'https://x.example.com',
      authHeaders: {
        'x-auth-token': 't',
        'x-auth-company': 'c',
        'x-auth-organization': 'o',
        'x-auth-app': 'a',
        'x-auth-session': 's',
      },
    });

    const server = createFreematicaServer({ client });

    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty('freematica_list_materiales_asignados_servicios');
  });
});
