import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Versión del paquete leída dinámicamente de `package.json`.
 *
 * Evita versiones hardcodeadas y desincronizadas en distintos puntos del
 * servidor (handshake MCP, endpoint `/health`, logs de arranque).
 *
 * El módulo siempre está a un nivel por debajo de la raíz del paquete tanto en
 * `src/version.ts` (dev con tsx) como en `dist/version.js` (compilado), por lo
 * que `../package.json` resuelve correctamente en ambos casos. npm incluye
 * `package.json` en la raíz del paquete instalado.
 */
const moduleDir = dirname(fileURLToPath(import.meta.url));

interface PackageJson {
  version?: string;
}

function readVersion(): string {
  try {
    const raw = readFileSync(join(moduleDir, '..', 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as PackageJson;
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const VERSION: string = readVersion();
