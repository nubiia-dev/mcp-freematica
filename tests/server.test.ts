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

const READ_ONLY_TOOLS = [
  'freematica_export_asientos',
  'freematica_get_albaran_factura',
  'freematica_get_albaran_venta',
  'freematica_get_cartera_cliente',
  'freematica_get_cliente',
  'freematica_get_contrato',
  'freematica_get_contrato_opcionales',
  'freematica_get_edicom_info',
  'freematica_get_factura_cabecera',
  'freematica_get_factura_compra',
  'freematica_get_factura_documento',
  'freematica_get_factura_electronica',
  'freematica_get_factura_log',
  'freematica_get_ficha_prev_cliente',
  'freematica_get_master_data',
  'freematica_get_oportunidad_negocio',
  'freematica_get_oportunidad_negocio_datos_ampliados',
  'freematica_get_pedido_compra',
  'freematica_get_persona',
  'freematica_get_proveedor',
  'freematica_get_servicio_contrato',
  'freematica_get_vigilancia_salud',
  'freematica_list_albaranes_factura',
  'freematica_list_albaranes_ventas',
  'freematica_list_calendario_periodos',
  'freematica_list_calendarios',
  'freematica_list_cartera_clientes',
  'freematica_list_clientes',
  'freematica_list_contactos_clientes',
  'freematica_list_contratos',
  'freematica_list_contratos_opcionales',
  'freematica_list_cuentas_analiticas',
  'freematica_list_cuentas_contables',
  'freematica_list_factura_iva',
  'freematica_list_factura_lineas',
  'freematica_list_factura_vencimientos',
  'freematica_list_facturas_cabecera',
  'freematica_list_facturas_compras',
  'freematica_list_facturas_documentos',
  'freematica_list_facturas_electronicas',
  'freematica_list_localizaciones_cobro_clientes',
  'freematica_list_localizaciones_pago_proveedores',
  'freematica_list_localizaciones_servicio_clientes',
  'freematica_list_materiales_asignados_servicios',
  'freematica_list_oportunidades_negocio',
  'freematica_list_pedidos_compra',
  'freematica_list_personal',
  'freematica_list_proveedores',
  'freematica_list_servicios_contrato',
  'freematica_list_resultados_facturacion',
  'freematica_list_vigilancia_salud',
].sort();

const WRITE_TOOLS = [
  'freematica_create_contrato',
  'freematica_create_contrato_opcionales',
  'freematica_create_servicio_contrato',
  'freematica_create_servicio_facturacion_txt',
  'freematica_create_servicio_historico_precios',
  'freematica_update_contrato',
  'freematica_update_contrato_opcionales',
  'freematica_update_servicio_facturacion',
  'freematica_update_servicio_fechas',
  'freematica_update_servicio_historico_precios',
].sort();

describe('createFreematicaServer', () => {
  it('registers all 51 expected read-only tools by default', () => {
    const server = createFreematicaServer({ client: TEST_CLIENT });
    const names = registeredToolNames(server);
    expect(names).toEqual(READ_ONLY_TOOLS);
  });

  it('registers the 10 write tools only with enableWrites=true', () => {
    const server = createFreematicaServer({ client: TEST_CLIENT, enableWrites: true });
    const names = registeredToolNames(server);
    expect(names).toEqual([...READ_ONLY_TOOLS, ...WRITE_TOOLS].sort());
  });

  it('never registers delete tools', () => {
    const server = createFreematicaServer({ client: TEST_CLIENT, enableWrites: true });
    const names = registeredToolNames(server);
    expect(names.filter((n) => n.includes('delete'))).toEqual([]);
  });
});
