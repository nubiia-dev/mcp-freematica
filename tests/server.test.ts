import { describe, it, expect } from 'vitest';
import { createFreematicaServer } from '../src/server.js';
import { FreematicaClient } from '../src/clients/freematica-client.js';

const TEST_CLIENT = new FreematicaClient({
  baseUrl: 'https://x.example.com',
  authHeaders: {
    'x-auth-token': 't',
    'x-auth-company': 'c',
    'x-auth-organization': 'o',
    'x-auth-app': 'a',
    'x-auth-session': 's',
  },
});

describe('createFreematicaServer', () => {
  it('registers the contratos tool', () => {
    const server = createFreematicaServer({ client: TEST_CLIENT });
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty('freematica_list_materiales_asignados_servicios');
  });

  it('registers the master data tool', () => {
    const server = createFreematicaServer({ client: TEST_CLIENT });
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
      ._registeredTools;
    expect(tools).toHaveProperty('freematica_get_master_data');
  });
});
