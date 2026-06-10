/**
 * Ejemplo 03 — Facturas de venta pendientes de traspaso a contabilidad
 *
 * Lista las facturas de venta que aún no han sido traspasadas a contabilidad.
 * Útil para el cierre mensual o para detectar facturas que se han quedado
 * sin contabilizar.
 *
 * Ejecución:
 *   npx tsx examples/03-facturas-pendientes-traspaso.ts
 *
 * Variables de entorno necesarias (definidas en .env):
 *   FREEMATICA_AUTH_TOKEN, FREEMATICA_AUTH_COMPANY,
 *   FREEMATICA_AUTH_ORGANIZATION, FREEMATICA_AUTH_APP, FREEMATICA_AUTH_SESSION
 *
 * Variables opcionales:
 *   EMPRESA=0001          (código de empresa, default: todas)
 *   DELEGACION=DEL01      (filtro por delegación)
 *   FECHA_DESDE=2026-01-01 (fecha mínima de la factura, YYYY-MM-DD)
 *   FECHA_HASTA=2026-06-30 (fecha máxima de la factura, YYYY-MM-DD)
 */

import 'dotenv/config';
import { FreematicaClient } from '../src/clients/freematica-client.js';
import { loadAuthConfig, loadHardeningConfig } from '../src/config.js';

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const auth = loadAuthConfig();
const harden = loadHardeningConfig();
const client = new FreematicaClient({
  baseUrl: auth.FREEMATICA_BASE_URL,
  authHeaders: {
    'x-auth-token': auth.FREEMATICA_AUTH_TOKEN,
    'x-auth-company': auth.FREEMATICA_AUTH_COMPANY,
    'x-auth-organization': auth.FREEMATICA_AUTH_ORGANIZATION,
    'x-auth-app': auth.FREEMATICA_AUTH_APP,
    'x-auth-session': auth.FREEMATICA_AUTH_SESSION,
  },
  timeoutMs: harden.FREEMATICA_TIMEOUT_MS,
});

const empresa = process.env['EMPRESA'];
const delegacion = process.env['DELEGACION'];
const fechaFacturaDesde = process.env['FECHA_DESDE'];
const fechaFacturaHasta = process.env['FECHA_HASTA'];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Buscando facturas pendientes de traspaso a contabilidad...');
  console.log(`Empresa: ${empresa ?? 'todas'}`);
  if (delegacion) console.log(`Delegación: ${delegacion}`);
  if (fechaFacturaDesde) console.log(`Fecha desde: ${fechaFacturaDesde}`);
  if (fechaFacturaHasta) console.log(`Fecha hasta: ${fechaFacturaHasta}`);
  console.log('');

  // Primera página para obtener el total
  const primeraPagina = await client.listFacturasCabecera({
    empresa,
    delegacion,
    fechaFacturaDesde,
    fechaFacturaHasta,
    traspasadoContabilidad: false, // Solo facturas NO traspasadas
    page: 1,
    items: 50,
  });

  if (primeraPagina.total === 0) {
    console.log('No hay facturas pendientes de traspaso. Todo está al día.');
    return;
  }

  console.log(`Total facturas pendientes de traspaso: ${primeraPagina.total}`);
  console.log('');

  // Obtener todas las páginas (máximo 500 para el ejemplo)
  const todasLasFacturas = [...primeraPagina.items];
  const totalPaginas = Math.ceil(primeraPagina.total / 50);

  for (let pagina = 2; pagina <= Math.min(totalPaginas, 10); pagina++) {
    process.stdout.write(`\rCargando página ${pagina}/${Math.min(totalPaginas, 10)}...`);
    const pagResult = await client.listFacturasCabecera({
      empresa,
      delegacion,
      fechaFacturaDesde,
      fechaFacturaHasta,
      traspasadoContabilidad: false,
      page: pagina,
      items: 50,
    });
    todasLasFacturas.push(...pagResult.items);
  }

  if (totalPaginas > 1) console.log('');
  console.log('');

  // Mostrar tabla resumen
  const resumen = todasLasFacturas.map((f) => {
    const factura = f as Record<string, unknown>;
    return {
      'Empresa': String(factura['FAC_CODEMP'] ?? '-'),
      'Serie': String(factura['FAC_SERIE'] ?? '-'),
      'Número': String(factura['FAC_NUMFAC'] ?? '-'),
      'Fecha': String(factura['FAC_FCHFAC'] ?? '-'),
      'Cliente': String(factura['FAC_CODCLI'] ?? '-'),
      'Importe (€)': Number(factura['FAC_IMP_TOTAL'] ?? 0).toFixed(2),
      'Delegación': String(factura['FAC_DELEG'] ?? '-'),
    };
  });

  console.log('FACTURAS PENDIENTES DE TRASPASO:');
  console.table(resumen);

  // Calcular total
  const totalImporte = todasLasFacturas.reduce((sum, f) => {
    return sum + Number((f as Record<string, unknown>)['FAC_IMP_TOTAL'] ?? 0);
  }, 0);

  console.log(`\nTotal a traspasar: ${totalImporte.toFixed(2)} €`);
  console.log(`Facturas mostradas: ${todasLasFacturas.length} de ${primeraPagina.total}`);

  if (primeraPagina.total > todasLasFacturas.length) {
    console.log('\nAviso: Solo se muestran las primeras 500 facturas. Refinar filtros para ver el resto.');
  }
}

main().catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
