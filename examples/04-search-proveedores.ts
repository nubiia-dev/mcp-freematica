/**
 * Ejemplo 04 — Buscar proveedores activos por nombre
 *
 * Busca proveedores activos cuyo nombre contenga el término indicado.
 * Útil para localizar rápidamente el idReg de un proveedor antes de
 * consultar su detalle completo.
 *
 * Ejecución:
 *   NOMBRE=GARCIA npx tsx examples/04-search-proveedores.ts
 *   NOMBRE=TELEFONICA ACTIVO=false npx tsx examples/04-search-proveedores.ts
 *
 * Variables de entorno necesarias (definidas en .env):
 *   FREEMATICA_AUTH_TOKEN, FREEMATICA_AUTH_COMPANY,
 *   FREEMATICA_AUTH_ORGANIZATION, FREEMATICA_AUTH_APP, FREEMATICA_AUTH_SESSION
 *
 * Variables de búsqueda:
 *   NOMBRE=GARCIA    (búsqueda parcial en nombre del proveedor, obligatorio)
 *   ACTIVO=true      (true=solo activos, false=solo dados de baja, default: true)
 *   MAX_RESULTS=50   (máximo de resultados a mostrar, default: 20)
 */

import 'dotenv/config';
import { FreematicaClient } from '../src/clients/freematica-client.js';
import { loadConfig } from '../src/config.js';

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const config = loadConfig();
const client = new FreematicaClient(config);

const nombre = process.env['NOMBRE'];
const activoStr = process.env['ACTIVO'] ?? 'true';
const activo = activoStr.toLowerCase() !== 'false';
const maxResults = parseInt(process.env['MAX_RESULTS'] ?? '20', 10);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!nombre) {
    console.error('Error: La variable NOMBRE es obligatoria.');
    console.error('Uso: NOMBRE=GARCIA npx tsx examples/04-search-proveedores.ts');
    process.exit(1);
  }

  console.log(`Buscando proveedores con nombre que contenga: "${nombre}"`);
  console.log(`Filtro activo: ${activo ? 'Solo activos' : 'Solo dados de baja'}`);
  console.log('');

  const result = await client.listProveedores({
    nombre,
    activo,
    page: 1,
    items: maxResults,
  });

  if (result.total === 0) {
    console.log(`No se encontraron proveedores con nombre que contenga "${nombre}".`);
    return;
  }

  console.log(`Encontrados: ${result.total} proveedores (mostrando ${result.items.length})`);
  console.log('');

  const tabla = result.items.map((p) => {
    const proveedor = p as Record<string, unknown>;
    return {
      'idReg': String(proveedor['idReg'] ?? '-').substring(0, 20),
      'Código': String(proveedor['COD_PRO'] ?? '-'),
      'Nombre': String(proveedor['NOMBRE_PRO'] ?? '-').substring(0, 35),
      'NIF': String(proveedor['NIF'] ?? '-'),
      'Grupo': String(proveedor['COD_GRUPO_PRO'] ?? '-'),
      'Provincia': String(proveedor['COD_PROVINCIA'] ?? '-'),
    };
  });

  console.table(tabla);

  if (result.total > result.items.length) {
    console.log(`\nHay ${result.total - result.items.length} proveedores más. Usar MAX_RESULTS o refinar la búsqueda.`);
  }

  console.log('\nUso del idReg: para obtener el detalle completo de un proveedor, usar:');
  console.log('  freematica_get_proveedor({ id: "<idReg>" })');
}

main().catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
