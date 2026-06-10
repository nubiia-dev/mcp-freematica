/**
 * Ejemplo 02 — Exportar asientos contables del mes en curso
 *
 * Llama a freematica_export_asientos con el rango de fechas del mes en curso
 * y escribe el resultado a un fichero CSV en el directorio actual.
 *
 * Ejecución:
 *   npx tsx examples/02-export-asientos-mes.ts
 *
 * Variables de entorno necesarias (definidas en .env):
 *   FREEMATICA_AUTH_TOKEN, FREEMATICA_AUTH_COMPANY,
 *   FREEMATICA_AUTH_ORGANIZATION, FREEMATICA_AUTH_APP, FREEMATICA_AUTH_SESSION
 *
 * Variables opcionales:
 *   EMPRESA=0001          (código de empresa, requerido si hay varias)
 *   CAL=CAL01             (código de calendario, requerido si hay varios)
 *   MES=2026-05           (mes a exportar en formato YYYY-MM, default: mes en curso)
 *   OUTPUT=asientos.csv   (fichero de salida, default: asientos-YYYY-MM.csv)
 */

import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { FreematicaClient } from '../src/clients/freematica-client.js';
import { loadConfig } from '../src/config.js';

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const config = loadConfig();
const client = new FreematicaClient(config);

// Calcular primer y último día del mes indicado (o del mes en curso)
const mesParam = process.env['MES'];
const ahora = new Date();
const [anioStr, mesStr] = mesParam
  ? mesParam.split('-')
  : [String(ahora.getFullYear()), String(ahora.getMonth() + 1).padStart(2, '0')];

const anio = parseInt(anioStr ?? String(ahora.getFullYear()), 10);
const mes = parseInt(mesStr ?? String(ahora.getMonth() + 1), 10);

const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
const ultimoDia = new Date(anio, mes, 0); // día 0 del mes siguiente = último día del mes
const ultimoDiaStr = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia.getDate()).padStart(2, '0')}`;

const empresa = process.env['EMPRESA'];
const cal = process.env['CAL'];
const outputFile = process.env['OUTPUT'] ?? `asientos-${anio}-${String(mes).padStart(2, '0')}.csv`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Exportando asientos contables...');
  console.log(`Periodo: ${primerDia} → ${ultimoDiaStr}`);
  console.log(`Empresa: ${empresa ?? '(todas)'}, Calendario: ${cal ?? '(default)'}`);
  console.log(`Fichero de salida: ${outputFile}`);
  console.log('');

  const result = await client.exportAsientos({
    empresa,
    cal,
    fechaDesde: primerDia,
    fechaHasta: ultimoDiaStr,
  });

  // El resultado puede ser un string CSV o un objeto con items
  // según la implementación del endpoint de Freemática
  const items = (result as { items?: unknown[] }).items;
  if (items && Array.isArray(items)) {
    // Resultado en formato objeto con array de items
    if (items.length === 0) {
      console.log('No se encontraron asientos para el período indicado.');
      return;
    }

    // Construir CSV a partir de los items
    const cabeceras = Object.keys(items[0] as Record<string, unknown>).join(',');
    const filas = items.map((item) =>
      Object.values(item as Record<string, unknown>)
        .map((v) => {
          const str = String(v ?? '');
          // Escapar comas y comillas en los valores
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(','),
    );

    const csv = [cabeceras, ...filas].join('\n');
    writeFileSync(outputFile, csv, 'utf-8');

    console.log(`Exportados ${items.length} asientos.`);
    console.log(`Fichero escrito: ${outputFile}`);

    // Mostrar resumen por cuenta
    const cuentas = new Map<string, number>();
    for (const item of items) {
      const cuenta = String((item as Record<string, unknown>)['COD_CTA'] ?? 'DESCONOCIDA');
      cuentas.set(cuenta, (cuentas.get(cuenta) ?? 0) + 1);
    }

    console.log('\nResumen por cuenta (top 10):');
    const top10 = Array.from(cuentas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.table(
      top10.map(([cuenta, count]) => ({ Cuenta: cuenta, 'Num asientos': count })),
    );
  } else {
    // Resultado en formato string (CSV directo)
    const csvContent = String(result);
    writeFileSync(outputFile, csvContent, 'utf-8');
    const lineas = csvContent.split('\n').length - 1; // descontar cabecera
    console.log(`Exportados ~${lineas} asientos.`);
    console.log(`Fichero escrito: ${outputFile}`);
  }
}

main().catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.message.includes('truncated')) {
    console.error('');
    console.error('El resultado fue truncado. Usa un rango de fechas más corto o filtra por empresa/delegación.');
    console.error('Ejemplo: MES=2026-05 EMPRESA=0001 npx tsx examples/02-export-asientos-mes.ts');
  }
  process.exit(1);
});
