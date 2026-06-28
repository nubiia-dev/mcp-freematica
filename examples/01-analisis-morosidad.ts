/**
 * Ejemplo 01 — Análisis de morosidad
 *
 * Obtiene los documentos de cartera impagados, los agrupa por cliente
 * y muestra el top 10 de deudores ordenado por deuda total descendente.
 *
 * Ejecución:
 *   npx tsx examples/01-analisis-morosidad.ts
 *
 * Variables de entorno necesarias (definidas en .env):
 *   FREEMATICA_AUTH_TOKEN, FREEMATICA_AUTH_COMPANY,
 *   FREEMATICA_AUTH_ORGANIZATION, FREEMATICA_AUTH_APP, FREEMATICA_AUTH_SESSION
 *
 * Variables opcionales:
 *   EMPRESA=0001                 (código de empresa, default: todas)
 *   FECHA_DESDE=2026-01-01       (fecha doc desde, YYYY-MM-DD)
 *   FECHA_HASTA=2026-06-30       (fecha doc hasta, YYYY-MM-DD)
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
const fechaDocDesde = process.env['FECHA_DESDE'];
const fechaDocHasta = process.env['FECHA_HASTA'];

// ---------------------------------------------------------------------------
// Tipos de ayuda
// ---------------------------------------------------------------------------

interface DeudorSummary {
  codCliente: string;
  nombreCliente: string;
  numDocumentos: number;
  totalDeuda: number;
  documentosMasAntiguo: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Obteniendo documentos de cartera impagados...');
  console.log(`Filtros: empresa=${empresa ?? 'todas'}, fechaDesde=${fechaDocDesde ?? 'sin límite'}, fechaHasta=${fechaDocHasta ?? 'sin límite'}`);
  console.log('');

  // Obtener primera página para saber el total
  const primeraPagina = await client.listCarteraClientes({
    empresa,
    fechaDocDesde,
    fechaDocHasta,
    soloImpagados: true,
    page: 1,
    items: 50,
  });

  console.log(`Total de documentos impagados encontrados: ${primeraPagina.total}`);

  // Obtener todas las páginas
  const todosLosItems = [...primeraPagina.items];
  const totalPaginas = Math.ceil(primeraPagina.total / 50);

  for (let pagina = 2; pagina <= Math.min(totalPaginas, 20); pagina++) {
    process.stdout.write(`\rCargando página ${pagina}/${Math.min(totalPaginas, 20)}...`);
    const pagResult = await client.listCarteraClientes({
      empresa,
      fechaDocDesde,
      fechaDocHasta,
      soloImpagados: true,
      page: pagina,
      items: 50,
    });
    todosLosItems.push(...pagResult.items);
  }

  console.log('\n');

  // Agrupar por cliente
  const deudoresPorCliente = new Map<string, DeudorSummary>();

  for (const item of todosLosItems) {
    // Acceder a los campos del documento de cartera
    const codCliente = String((item as Record<string, unknown>)['CARCL_CODCLI'] ?? 'DESCONOCIDO');
    const nombreCliente = String((item as Record<string, unknown>)['CARCL_NOMCLI'] ?? codCliente);
    const importe = Number((item as Record<string, unknown>)['CARCL_IMP_DOC'] ?? 0);
    const fechaDoc = String((item as Record<string, unknown>)['CARCL_FECDOC'] ?? '');

    const existente = deudoresPorCliente.get(codCliente);
    if (existente) {
      existente.numDocumentos++;
      existente.totalDeuda += importe;
      // Guardar la fecha más antigua
      if (fechaDoc && fechaDoc < existente.documentosMasAntiguo) {
        existente.documentosMasAntiguo = fechaDoc;
      }
    } else {
      deudoresPorCliente.set(codCliente, {
        codCliente,
        nombreCliente,
        numDocumentos: 1,
        totalDeuda: importe,
        documentosMasAntiguo: fechaDoc,
      });
    }
  }

  // Ordenar por deuda total descendente y tomar top 10
  const top10 = Array.from(deudoresPorCliente.values())
    .sort((a, b) => b.totalDeuda - a.totalDeuda)
    .slice(0, 10);

  console.log('=== TOP 10 DEUDORES ===');
  console.log('');

  console.table(
    top10.map((d) => ({
      'Código': d.codCliente,
      'Nombre': d.nombreCliente.substring(0, 30),
      'Docs': d.numDocumentos,
      'Deuda Total (€)': d.totalDeuda.toFixed(2),
      'Doc más antiguo': d.documentosMasAntiguo,
    })),
  );

  const totalDeuda = top10.reduce((sum, d) => sum + d.totalDeuda, 0);
  console.log(`\nTotal deuda top 10: ${totalDeuda.toFixed(2)} €`);

  if (primeraPagina.total > todosLosItems.length) {
    console.log(`\nAviso: Se han analizado ${todosLosItems.length} de ${primeraPagina.total} documentos (límite de paginación alcanzado).`);
    console.log('Para un análisis completo, refinar los filtros de fecha o empresa.');
  }
}

main().catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
