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

function registeredToolNames(server: ReturnType<typeof createFreematicaServer>): string[] {
  const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
  return Object.keys(tools).sort();
}

describe('createFreematicaServer', () => {
  it('registers all 15 expected tools (v0.5.0)', () => {
    const server = createFreematicaServer({ client: TEST_CLIENT });
    const names = registeredToolNames(server);
    expect(names).toEqual([
      'freematica_get_cliente',
      'freematica_get_ficha_prev_cliente',
      'freematica_get_master_data',
      'freematica_get_oportunidad_negocio',
      'freematica_get_oportunidad_negocio_datos_ampliados',
      'freematica_get_persona',
      'freematica_get_vigilancia_salud',
      'freematica_list_calendario_periodos',
      'freematica_list_calendarios',
      'freematica_list_clientes',
      'freematica_list_contactos_clientes',
      'freematica_list_materiales_asignados_servicios',
      'freematica_list_oportunidades_negocio',
      'freematica_list_personal',
      'freematica_list_vigilancia_salud',
    ]);
  });
});
