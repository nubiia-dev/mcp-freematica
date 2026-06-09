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
  it('registers all 15 expected tools', () => {
    const server = createFreematicaServer({ client: TEST_CLIENT });
    const names = registeredToolNames(server);
    expect(names).toEqual([
      // Cartera clientes (TD-118)
      'freematica_get_cartera_cliente',
      // Clientes
      'freematica_get_cliente',
      // Facturas ventas (TD-118)
      'freematica_get_factura_cabecera',
      // Master data
      'freematica_get_master_data',
      // Oportunidades
      'freematica_get_oportunidad_negocio',
      'freematica_get_oportunidad_negocio_datos_ampliados',
      // Cartera clientes (TD-118)
      'freematica_list_cartera_clientes',
      // Clientes
      'freematica_list_clientes',
      'freematica_list_contactos_clientes',
      // Facturas ventas (TD-118)
      'freematica_list_factura_iva',
      'freematica_list_factura_lineas',
      'freematica_list_factura_vencimientos',
      'freematica_list_facturas_cabecera',
      // Contratos
      'freematica_list_materiales_asignados_servicios',
      // Oportunidades
      'freematica_list_oportunidades_negocio',
    ]);
  });
});
