/**
 * Ejemplo 05 — Personal activo de una empresa y delegación
 *
 * Lista el personal activo de una empresa, opcionalmente filtrando
 * por delegación. Muestra nombre, NIF, delegación y fecha de alta.
 *
 * Ejecución:
 *   EMPRESA=0001 npx tsx examples/05-personal-activo-empresa.ts
 *   EMPRESA=0001 DELEGACION=DEL01 npx tsx examples/05-personal-activo-empresa.ts
 *
 * Variables de entorno necesarias (definidas en .env):
 *   FREEMATICA_AUTH_TOKEN, FREEMATICA_AUTH_COMPANY,
 *   FREEMATICA_AUTH_ORGANIZATION, FREEMATICA_AUTH_APP, FREEMATICA_AUTH_SESSION
 *
 * Variables de búsqueda:
 *   EMPRESA=0001      (código de empresa, obligatorio)
 *   DELEGACION=DEL01  (código de delegación, opcional)
 *   MAX_PAGINAS=5     (máximo de páginas a cargar, default: 5)
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
const maxPaginas = parseInt(process.env['MAX_PAGINAS'] ?? '5', 10);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!empresa) {
    console.error('Error: La variable EMPRESA es obligatoria.');
    console.error('Uso: EMPRESA=0001 npx tsx examples/05-personal-activo-empresa.ts');
    process.exit(1);
  }

  console.log(`Listando personal activo de empresa: ${empresa}`);
  if (delegacion) console.log(`Delegación: ${delegacion}`);
  console.log('');

  // Primera página
  const primeraPagina = await client.listPersonal({
    empresa,
    delegacion,
    activo: true,
    page: 1,
    items: 50,
  });

  if (primeraPagina.total === 0) {
    console.log('No se encontró personal activo con los filtros indicados.');
    return;
  }

  console.log(`Total personal activo: ${primeraPagina.total}`);

  // Obtener páginas adicionales
  const todoElPersonal = [...primeraPagina.items];
  const totalPaginas = Math.ceil(primeraPagina.total / 50);

  for (let pagina = 2; pagina <= Math.min(totalPaginas, maxPaginas); pagina++) {
    process.stdout.write(`\rCargando página ${pagina}/${Math.min(totalPaginas, maxPaginas)}...`);
    const pagResult = await client.listPersonal({
      empresa,
      delegacion,
      activo: true,
      page: pagina,
      items: 50,
    });
    todoElPersonal.push(...pagResult.items);
  }

  if (totalPaginas > 1) console.log('');
  console.log('');

  // Mostrar tabla
  const tabla = todoElPersonal.map((p) => {
    const persona = p as Record<string, unknown>;
    return {
      'idReg': String(persona['idReg'] ?? '-').substring(0, 15),
      'Nombre': String(persona['NOMBRE'] ?? '-').substring(0, 30),
      'NIF': String(persona['NIF'] ?? '-'),
      'Empresa': String(persona['COD_EMPRESA'] ?? '-'),
      'Delegación': String(persona['COD_DELEGACION'] ?? '-'),
      'F. Alta': String(persona['FECHA_ALTA'] ?? '-').substring(0, 10),
    };
  });

  console.log('PERSONAL ACTIVO:');
  console.table(tabla);

  // Resumen por delegación
  if (!delegacion) {
    const delegaciones = new Map<string, number>();
    for (const p of todoElPersonal) {
      const deleg = String((p as Record<string, unknown>)['COD_DELEGACION'] ?? 'SIN_DELEG');
      delegaciones.set(deleg, (delegaciones.get(deleg) ?? 0) + 1);
    }

    console.log('\nResumen por delegación:');
    console.table(
      Array.from(delegaciones.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([deleg, count]) => ({ Delegación: deleg, 'Num personas': count })),
    );
  }

  console.log(`\nTotal mostrado: ${todoElPersonal.length} de ${primeraPagina.total} personas`);
  if (primeraPagina.total > todoElPersonal.length) {
    console.log(`Para ver más, aumentar MAX_PAGINAS (actual: ${maxPaginas}).`);
  }
}

main().catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
